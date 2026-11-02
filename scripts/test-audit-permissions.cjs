// Permission enforcement + audit log against real MongoDB, using disposable
// prefixed collections dropped in `finally`. Live admins/logs are untouched.
require('dotenv').config({ path: '.env.local', quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

function load(file, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => { if (name in dependencies) return dependencies[name]; throw new Error(`Unexpected test dependency ${name}`); }, Date, Map, Set, Response, Headers, JSON, Promise, console });
  return exports;
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const prefix = `audit_check_${crypto.randomUUID().replaceAll('-', '')}_`;
  const names = new Set();
  let db;
  try {
    await client.connect();
    db = client.db(process.env.MONGODB_DB || 'dapai');
    const isolated = { collection(name) { names.add(`${prefix}${name}`); return db.collection(`${prefix}${name}`); } };
    const mongo = { getMongoDb: async () => isolated };
    let sessionUser = null;
    const permissions = load('src/lib/permissions.ts', {});
    const audit = load('src/lib/audit.ts', { 'node:crypto': crypto, './mongodb': mongo });
    const adminAuth = load('src/lib/adminAuth.ts', { 'next-auth': { getServerSession: async () => sessionUser ? { user: sessionUser } : null }, '@/app/api/auth/[...nextauth]/route': { authOptions: {} }, './mongodb': mongo, './permissions': permissions });
    const NextResponse = { json: (body, init) => Response.json(body, init) };
    const route = load('src/app/api/admins/[id]/route.ts', { 'next/server': { NextResponse }, bcryptjs: { default: bcrypt, ...bcrypt }, '@/lib/adminAuth': adminAuth, '@/lib/audit': audit, '@/lib/mongodb': mongo, '@/lib/permissions': permissions });

    const admins = isolated.collection('admins');
    await admins.insertMany([
      { id: 'main', username: 'admin', name: 'แอดมินหลัก', permissions: [] },
      { id: 'mgr', username: 'manager', name: 'ผู้จัดการทีม', permissions: ['staff', 'trips'] },
      { id: 'acc', username: 'accountant', name: 'นักบัญชี', permissions: ['accounting:view'] },
      { id: 'guide', username: 'guide', name: 'ไกด์', permissions: ['trips'] },
      { id: 'blocked', username: 'blocked', name: 'ถูกระงับ', permissions: ['payments'], isBlocked: true },
    ]);
    const as = id => { sessionUser = { id, role: 'admin' }; };
    const put = (id, body) => route.PUT({ json: async () => body, headers: new Headers() }, { params: Promise.resolve({ id }) });
    const del = id => route.DELETE({ headers: new Headers() }, { params: Promise.resolve({ id }) });
    const perms = async id => [...(await admins.findOne({ id })).permissions].sort();

    // ── Levels in the guard ───────────────────────────────────────────
    as('acc');
    assert.ok(await adminAuth.adminWith(['accounting'], 'view'), 'view-only may read');
    assert.equal(await adminAuth.adminWith(['accounting'], 'edit'), null, 'view-only may not change');
    assert.equal(await adminAuth.adminWith(['payments'], 'view'), null, 'no access to payments');
    as('blocked');
    assert.equal(await adminAuth.adminWith(['payments'], 'view'), null, 'blocked staff have no access');
    as('main');
    assert.ok((await adminAuth.adminWith(['payments'], 'edit')).isMain, 'main admin always passes');
    console.log('✔ none / view / edit levels enforced; blocked staff denied');

    // ── Staff manager cannot touch sensitive access ───────────────────
    as('mgr');
    let res = await put('guide', { permissions: ['trips', 'bookings', 'payments', 'accounting', 'payment-settings', 'staff'] });
    assert.equal(res.status, 200);
    assert.deepEqual(await perms('guide'), ['bookings', 'trips'], 'sensitive grants are ignored for non-main staff');
    assert.equal((await put('acc', { name: 'x' })).status, 403, 'cannot edit an account holding finance access');
    assert.equal((await put('main', { isBlocked: true })).status, 403, 'cannot edit the main admin');
    assert.equal((await del('main')).status, 400, 'main admin cannot be deleted');
    assert.equal((await del('acc')).status, 403, 'cannot delete an account holding finance access');
    console.log('✔ only the main admin can grant or change payment / accounting / QR / staff access');

    // ── Main admin assigns levels ─────────────────────────────────────
    as('main');
    res = await put('guide', { permissions: ['trips', 'payments:view', 'accounting', 'payment-settings:view'] });
    assert.equal(res.status, 200);
    assert.deepEqual(await perms('guide'), ['accounting', 'payment-settings:view', 'payments:view', 'trips']);
    res = await put('acc', { permissions: ['accounting'], password: 'new-secret-password' });
    assert.equal(res.status, 200);
    assert.equal(bcrypt.compareSync('new-secret-password', (await admins.findOne({ id: 'acc' })).password), true);
    assert.equal((await put('main', { isBlocked: true })).status, 400, 'main admin cannot be blocked');
    console.log('✔ main admin sets per-system levels');

    // ── Audit log ─────────────────────────────────────────────────────
    const logs = await isolated.collection('auditLogs').find({}).sort({ at: 1 }).toArray();
    assert.equal(logs.length, 3, 'one record per successful change, none for refused ones');
    const grant = logs[1];
    assert.equal(grant.actorName, 'แอดมินหลัก');
    assert.equal(grant.resource, 'admin');
    assert.match(grant.summary, /เพิ่มสิทธิ์ .*ระบบชำระเงิน \(ดูได้อย่างเดียว\)/);
    assert.match(grant.summary, /ถอนสิทธิ์ การจองและลูกทริป/);
    assert.ok(grant.at <= Date.now() && grant.at > Date.now() - 600000);
    const pw = logs[2];
    assert.equal(JSON.stringify(pw).includes('new-secret-password'), false, 'passwords are never logged');
    assert.ok(pw.changes.some(c => c.field === 'รหัสผ่าน'));
    console.log('✔ audit records actor, time and readable before/after; secrets hidden');

    // Filters used by the main admin's history view.
    const all = await audit.listAuditLogs({});
    assert.equal(all.total, 3);
    assert.deepEqual([...all.logs.map(l => l.actorId)], ['main', 'main', 'mgr'], 'newest first');
    assert.equal((await audit.listAuditLogs({ actor: 'mgr' })).total, 1);
    assert.equal((await audit.listAuditLogs({ q: 'ชำระเงิน' })).total, 1);
    assert.equal((await audit.listAuditLogs({ resource: 'trip' })).total, 0);
    const today = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    assert.equal((await audit.listAuditLogs({ from: today, to: today })).total, 3);
    assert.equal((await audit.listAuditLogs({ to: '2000-01-01' })).total, 0);
    assert.deepEqual([...all.actors.map(a => a.name)].sort(), ['ผู้จัดการทีม', 'แอดมินหลัก']);
    console.log('✔ history search by person, type, text and date');

    // Only the main admin may read the log.
    as('mgr');
    assert.equal((await adminAuth.requireMainAdmin()).status, 403);
    as('main');
    assert.equal((await adminAuth.requireMainAdmin()).isMain, true);
    console.log('✔ audit log is main-admin only');
    console.log('ALL PERMISSION AND AUDIT CHECKS PASSED');
  } finally {
    if (db) for (const name of names) await db.collection(name).drop().catch(() => undefined);
    await client.close();
  }
}
main().catch(error => { console.error(error); process.exit(1); });
