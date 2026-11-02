const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

function moduleFrom(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => { if (name in dependencies) return dependencies[name]; throw new Error(`Unexpected dependency ${name}`); }, Date, Set, Map, JSON });
  return exports;
}
const p = moduleFrom('src/lib/permissions.ts');
const audit = moduleFrom('src/lib/audit.ts', { 'node:crypto': crypto, './mongodb': { getMongoDb: async () => { throw new Error('no db'); } } });

test('three access levels: none, view only, view and edit (older records mean edit)', () => {
  assert.equal(p.levelOf([], 'payments'), 'none');
  assert.equal(p.levelOf(['payments:view'], 'payments'), 'view');
  assert.equal(p.levelOf(['payments'], 'payments'), 'edit');
  assert.equal(p.hasPermission(['payments:view'], 'payments', 'view'), true);
  assert.equal(p.hasPermission(['payments:view'], 'payments', 'edit'), false);
  assert.equal(p.hasPermission(['payments'], 'payments', 'view'), true);
  assert.equal(p.hasPermission(['accounting:view'], 'payments', 'view'), false, 'levels are per system');
  assert.equal(p.hasPermission(['trips:view'], 'trips', 'view'), false, 'only leveled areas have a view level');
});

test('changing a level replaces the previous level', () => {
  assert.deepEqual([...p.withLevel(['trips', 'payments'], 'payments', 'view')], ['trips', 'payments:view']);
  assert.deepEqual([...p.withLevel(['payments:view'], 'payments', 'edit')], ['payments']);
  assert.deepEqual([...p.withLevel(['payments', 'trips'], 'payments', 'none')], ['trips']);
});

test('unknown permissions are dropped and a key cannot hold two levels', () => {
  assert.deepEqual([...p.sanitizePermissions(['trips', 'trips', 'root', 42, 'payments', 'payments:view', 'accounting:view'])], ['trips', 'payments', 'accounting:view']);
  assert.deepEqual([...p.sanitizePermissions('payments')], []);
});

test('staff managers cannot grant, remove or change sensitive access; the main admin can', () => {
  const existing = ['trips', 'accounting:view'];
  const requested = ['trips', 'bookings', 'payments', 'staff', 'payment-settings'];
  assert.deepEqual([...p.applyPermissionChange(requested, existing, false)].sort(), ['accounting:view', 'bookings', 'trips']);
  assert.deepEqual([...p.applyPermissionChange(['trips'], existing, false)].sort(), ['accounting:view', 'trips'], 'cannot remove either');
  assert.deepEqual([...p.applyPermissionChange(requested, existing, true)].sort(), ['bookings', 'payment-settings', 'payments', 'staff', 'trips']);
});

test('permission names are readable in the audit log', () => {
  assert.equal(p.describePermission('payments:view'), 'ระบบชำระเงิน (ดูได้อย่างเดียว)');
  assert.equal(p.describePermission('accounting'), 'ระบบบัญชีรายรับ–รายจ่าย (ดูและแก้ไขได้)');
  assert.equal(p.describePermission('trips'), 'จัดการทริป');
});

test('audit diffs list only changed fields and never store secrets', () => {
  const changes = audit.diffRecords({ name: 'A', cost: 100, password: 'old', updatedAt: 1, secretKey: 'k1' }, { name: 'A', cost: 120, password: 'new', updatedAt: 2, secretKey: 'k2' });
  assert.deepEqual([...changes.map(c => c.field)].sort(), ['cost', 'password', 'secretKey']);
  assert.equal(JSON.stringify(changes).includes('old') || JSON.stringify(changes).includes('k2'), false);
  assert.deepEqual({ ...changes.find(c => c.field === 'cost') }, { field: 'cost', before: 100, after: 120 });
});
