const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, Buffer, Response, URL, AbortSignal, console, ...globals, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
    return dependencies[name];
  }});
  return exports;
}
const dates = load('src/lib/dateFormat.ts');
const helpers = load('src/lib/messenger.ts', { 'node:crypto': crypto, './dateFormat': dates });
const contacts = load('src/lib/contact.ts');

test('card links preserve the exact trip ID', () => {
  assert.equal(new URL(contacts.tripMessengerUrl('trip-a & b')).searchParams.get('ref'), 'trip:trip-a & b');
});
test('signature rejects missing, wrong and tampered requests', () => {
  const raw = '{"object":"page"}';
  const sig = 'sha256=' + crypto.createHmac('sha256', 'secret').update(raw).digest('hex');
  assert.ok(helpers.verifyMessengerSignature(raw, sig, 'secret'));
  assert.equal(helpers.verifyMessengerSignature(raw + ' ', sig, 'secret'), false);
  assert.equal(helpers.verifyMessengerSignature(raw, null, 'secret'), false);
  assert.equal(helpers.verifyMessengerSignature(raw, 'sha256=123', 'secret'), false);
});
test('direct referrals and initial postbacks are supported; echoes ignored', () => {
  assert.equal(helpers.referralTripId({ referral: { ref: 'trip:one' } }), 'one');
  assert.equal(helpers.referralTripId({ postback: { referral: { ref: 'trip:two' } } }), 'two');
  assert.equal(helpers.referralTripId({ message: { is_echo: true }, referral: { ref: 'trip:one' } }), null);
  assert.equal(helpers.referralTripId({ referral: { ref: 'other' } }), null);
});
test('reply has trip details, Thai date, and handles closed/missing trips', () => {
  const trip = { name: 'Chiang Dao', departureDate: '2026-09-23', departureTime: '06:00', pickupPoint: 'Pickup A', status: 'active' };
  const reply = helpers.tripReply(trip);
  for (const value of ['Chiang Dao', '2569', '06:00', 'Pickup A']) assert.ok(reply.includes(value));
  assert.ok(!helpers.tripReply({ ...trip, status: 'completed' }).includes('06:00'));
  assert.ok(helpers.tripReply(null));
});
test('webhook verifies challenge and sends only signed trip referrals for the configured page', async () => {
  const env = { MESSENGER_VERIFY_TOKEN: 'verify', MESSENGER_APP_SECRET: 'secret', MESSENGER_PAGE_ACCESS_TOKEN: 'test-only', MESSENGER_PAGE_ID: '123', MESSENGER_GRAPH_API_VERSION: 'v99.0' };
  const calls = [];
  const query = { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { name: 'Trip', status: 'active', departureDate: '2026-09-23' } }; } };
  const route = load('src/app/api/messenger/webhook/route.ts', {
    '@/lib/supabase': { supabase: { from: () => query } }, '@/lib/messenger': helpers,
  }, { process: { env }, fetch: async (url, options) => { calls.push(JSON.parse(options.body)); return { ok: true }; } });
  const challenge = await route.GET(new Request('https://example.com/?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=12345'));
  assert.equal(await challenge.text(), '12345');
  assert.equal((await route.GET(new Request('https://example.com/'))).status, 403);
  async function post(entry, signed = true) {
    const body = JSON.stringify({ object: 'page', entry });
    const signature = 'sha256=' + crypto.createHmac('sha256', 'secret').update(body).digest('hex');
    return route.POST(new Request('https://example.com/', { method: 'POST', body, headers: signed ? { 'x-hub-signature-256': signature } : {} }));
  }
  const event = { sender: { id: '456' }, recipient: { id: '123' }, referral: { ref: 'trip:one' } };
  assert.equal((await post([{ id: '123', messaging: [event] }], false)).status, 403);
  await post([{ id: '999', messaging: [event] }]);
  assert.equal(calls.length, 0);
  assert.equal((await post([{ id: '123', messaging: [event] }])).status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].recipient.id, '456');
  assert.equal(calls[0].messaging_type, 'RESPONSE');
});
