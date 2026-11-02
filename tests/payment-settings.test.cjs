const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

function load(file, dependencies, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => { if (name in dependencies) return dependencies[name]; throw new Error(`Unexpected dependency ${name}`); }, Buffer, Date, Response, URL, ...globals });
  return exports;
}
function settingsStore() {
  let document = null;
  const env = { NEXTAUTH_SECRET: 'test-only-encryption-key-32-bytes', SLIP2GO_SECRET_KEY: 'environment-secret' };
  const db = { collection: () => ({
    findOne: async () => document,
    updateOne: async (query, updates) => { document = { ...document, ...query, ...updates.$set }; },
  }) };
  const api = load('src/lib/paymentSettings.ts', { 'node:crypto': crypto, './mongodb': { getMongoDb: async () => db } }, { process: { env } });
  return { api, env, stored: () => document };
}
const configuration = { enabled: false, baseUrl: 'https://connect.slip2go.com', promptPayType: 'phone_number', promptPayCode: '0812345678', accountName: 'Test recipient', receiverType: '02001', receiverNumber: '0812345678' };

test('payment credentials are authenticated-encrypted at rest; tampering and wrong encryption keys fail', () => {
  const { api, env } = settingsStore();
  const encrypted = api.encryptPaymentSecret('private-provider-secret');
  assert.equal(encrypted.includes('private-provider-secret'), false);
  assert.equal(api.decryptPaymentSecret(encrypted), 'private-provider-secret');
  const parts = encrypted.split('.');
  parts[2] = Buffer.from('tampered').toString('base64');
  assert.throws(() => api.decryptPaymentSecret(parts.join('.')));
  env.NEXTAUTH_SECRET = 'a-different-key-at-least-sixteen';
  assert.throws(() => api.decryptPaymentSecret(encrypted));
});
test('settings reject arbitrary API hosts, malformed accounts and incomplete live configuration', () => {
  const { api } = settingsStore();
  for (const baseUrl of ['http://connect.slip2go.com', 'https://attacker.example', 'https://connect.slip2go.com@attacker.example', 'https://connect.slip2go.com/path']) assert.throws(() => api.validatePaymentSettings({ ...configuration, baseUrl }));
  assert.throws(() => api.validatePaymentSettings({ ...configuration, promptPayCode: '123' }));
  assert.throws(() => api.validatePaymentSettings({ ...configuration, receiverType: '0200' }));
  assert.throws(() => api.validatePaymentSettings({ ...configuration, enabled: true, accountName: '' }));
  assert.equal(api.validatePaymentSettings(configuration).enabled, false);
});
test('database settings override environment and blank replacement preserves the encrypted key', async () => {
  const { api, stored } = settingsStore();
  assert.equal((await api.getPaymentSettings()).secret, 'environment-secret');
  await api.savePaymentSettings(configuration, 'replacement-secret');
  assert.equal(stored().encryptedSecret.includes('replacement-secret'), false);
  assert.equal(stored().secret, undefined);
  assert.equal((await api.getPaymentSettings()).secret, 'replacement-secret');
  const encrypted = stored().encryptedSecret;
  await api.savePaymentSettings({ ...configuration, enabled: true }, '');
  assert.equal(stored().encryptedSecret, encrypted);
  assert.equal(await api.paymentsEnabled(), true);
  await api.savePaymentSettings(configuration);
  assert.equal(await api.paymentsEnabled(), false);
});

test('formatted bank account numbers save in normalized form and survive reloading', async () => {
  const { api } = settingsStore();
  await api.savePaymentSettings({ ...configuration, receiverType: '01004', receiverNumber: '123-456 7890' });
  const loaded = await api.getPaymentSettings();
  assert.equal(loaded.settings.receiverNumber, '1234567890');
  assert.equal(loaded.settings.receiverType, '01004');
  assert.ok(loaded.updatedAt);
});

const permissions = load('src/lib/permissions.ts', {});
function adminRoute({ user = null, admin = null, settings = configuration } = {}) {
  let writes = 0, tests = 0, dbReads = 0;
  const audits = [];
  // The real admin guard, backed by a one-record admins collection.
  const adminAuth = load('src/lib/adminAuth.ts', {
    'next-auth': { getServerSession: async () => user ? { user } : null },
    '@/app/api/auth/[...nextauth]/route': { authOptions: {} },
    './mongodb': { getMongoDb: async () => ({ collection: () => ({ findOne: async query => { dbReads++; return admin && !admin.isBlocked && query.id === user?.id ? admin : null; } }) }) },
    './permissions': permissions,
  });
  const api = load('src/app/api/admin/payment-settings/route.ts', {
    '@/lib/adminAuth': adminAuth,
    '@/lib/audit': { recordAudit: async (actor, entry) => { audits.push({ actor, entry }); } },
    '@/lib/permissions': permissions,
    '@/lib/paymentAuth': { checkPaymentOrigin: request => { if (request.badOrigin) throw new Error('cross origin'); }, paymentError: () => Response.json({ success: false }, { status: 400 }) },
    '@/lib/paymentSettings': { getPaymentSettings: async () => ({ settings, secret: 'never-return-this-secret', updatedAt: null }), savePaymentSettings: async () => { writes++; } },
    '@/lib/slip2go': { testSlip2GoConnection: async () => { tests++; return { connected: true, package: 'BASIC-1', tokenRemaining: 88 }; } },
  });
  return { api, audits, counts: () => ({ writes, tests, dbReads }) };
}
const request = { headers: new Headers(), json: async () => ({ settings: configuration }) };
test('anonymous, customer, blocked and unauthorized staff cannot read or change payment settings', async () => {
  const cases = [ {}, { user: { id: 'customer' } }, { user: { id: 'admin', role: 'admin' }, admin: { username: 'admin', isBlocked: true } }, { user: { id: 'staff', role: 'admin' }, admin: { username: 'staff', permissions: [] } },
    // General website settings no longer include the payment receiver / QR.
    { user: { id: 'staff', role: 'admin' }, admin: { username: 'staff', permissions: ['settings'] } } ];
  for (const input of cases) {
    const { api, counts } = adminRoute(input);
    assert.equal((await api.GET()).status, 403);
    assert.equal((await api.PUT(request)).status, 403);
    assert.equal((await api.POST(request)).status, 403);
    assert.equal(counts().writes, 0);
    assert.equal(counts().tests, 0);
  }
});
test('authorized settings manager sees only key presence; cross-origin writes and connection tests are rejected', async () => {
  const { api, counts, audits } = adminRoute({ user: { id: 'staff', role: 'admin' }, admin: { username: 'staff', name: 'Staff', permissions: ['payment-settings'] } });
  const response = await api.GET();
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.equal(text.includes('never-return-this-secret'), false);
  assert.equal(JSON.parse(text).hasSecret, true);
  assert.equal((await api.PUT({ ...request, badOrigin: true })).status, 400);
  assert.equal((await api.POST({ ...request, badOrigin: true })).status, 400);
  assert.equal(counts().writes, 0);
  assert.equal(counts().tests, 0);
  assert.equal((await api.PUT(request)).status, 200);
  assert.equal((await api.POST(request)).status, 200);
  assert.equal(counts().writes, 1);
  assert.equal(counts().tests, 1);
  assert.equal(audits.length, 1, 'saving payment settings is audited');
  assert.equal(audits[0].entry.resource, 'payment-settings');
  assert.equal(JSON.stringify(audits).includes('never-return-this-secret'), false);
});

test('read-only payment-settings access can view but never change the QR / receiver', async () => {
  const { api, counts } = adminRoute({ user: { id: 'viewer', role: 'admin' }, admin: { username: 'viewer', permissions: ['payment-settings:view'] } });
  const response = await api.GET();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).canEdit, false);
  assert.equal((await api.PUT(request)).status, 403);
  assert.equal((await api.POST(request)).status, 403);
  assert.equal(counts().writes, 0);
  assert.equal(counts().tests, 0);
});

test('same-origin saves accept the browser Host when Next uses an internal URL, and reject foreign sites', () => {
  const auth = load('src/lib/paymentAuth.ts', {
    'next-auth': {}, '@/app/api/auth/[...nextauth]/route': {},
  }, { process: { env: { NEXTAUTH_URL: 'https://booking.example' } } });
  const request = (url, host, origin) => ({ url, headers: new Headers({ host, origin }) });
  assert.doesNotThrow(() => auth.checkPaymentOrigin(request('http://0.0.0.0:3000/api/admin/payment-settings', 'localhost:3000', 'http://localhost:3000')));
  assert.doesNotThrow(() => auth.checkPaymentOrigin(request('http://localhost:3000/api/admin/payment-settings', '127.0.0.1:3000', 'http://127.0.0.1:3000')));
  assert.doesNotThrow(() => auth.checkPaymentOrigin(request('http://localhost:3000/api/admin/payment-settings', 'booking.example', 'https://booking.example')));
  assert.throws(() => auth.checkPaymentOrigin(request('http://0.0.0.0:3000/api/admin/payment-settings', 'localhost:3000', 'https://attacker.example')));
  assert.throws(() => auth.checkPaymentOrigin(request('http://0.0.0.0:3000/api/admin/payment-settings', 'localhost:3000', 'http://localhost:3001')));
  assert.throws(() => auth.checkPaymentOrigin(request('http://0.0.0.0:3000/api/admin/payment-settings', 'localhost:3000', 'null')));
});
