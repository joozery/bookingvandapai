const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function moduleFrom(file) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: () => { throw new Error('Unexpected dependency'); }, Date });
  return exports;
}
const rules = moduleFrom('src/lib/paymentRules.ts');
const now = Date.parse('2030-01-01T01:00:00Z');
const trip = { cost: 1500, departureDate: '2030-01-05', departureTime: '06:00' };

test('deposit defaults to 50% rounded up when the trip has no deposit set', () => {
  for (const depositAmount of [undefined, null, '', 0]) assert.equal(rules.depositSatang({ ...trip, depositAmount }), 75000);
  assert.equal(rules.depositSatang({ cost: 1000.01 }), 50001);
});
test('an admin-set deposit is used for new deposit orders; full payment is unchanged', () => {
  const quote = rules.paymentQuote({ ...trip, depositAmount: 500 }, 'deposit', now);
  assert.equal(quote.amountSatang, 50000);
  assert.equal(quote.totalSatang - quote.amountSatang, 100000);
  assert.equal(rules.paymentQuote({ ...trip, depositAmount: 500 }, 'full', now).amountSatang, 150000);
});
test('a stored deposit that is not below the price falls back to 50% instead of charging in full', () => {
  assert.equal(rules.depositSatang({ ...trip, depositAmount: 1500 }), 75000);
  assert.equal(rules.depositSatang({ ...trip, depositAmount: 'x' }), 75000);
});
test('admin deposit input is validated against the trip price', () => {
  assert.equal(rules.normalizeDepositAmount('', 1500), null);
  assert.equal(rules.normalizeDepositAmount(0, 1500), null);
  assert.equal(rules.normalizeDepositAmount('499.50', 1500), 499.5);
  assert.throws(() => rules.normalizeDepositAmount(1500, 1500), /น้อยกว่าราคาทริป/);
  assert.throws(() => rules.normalizeDepositAmount(-5, 1500));
  assert.throws(() => rules.normalizeDepositAmount(10.001, 1500));
});
test('payment states: unpaid, lapsed checkout, partial, paid and admin review', () => {
  const base = { totalSatang: 100000, paidSatang: 0, status: 'pending', expiresAt: now + 1000 };
  assert.equal(rules.paymentState(base, now), 'unpaid');
  assert.equal(rules.paymentState({ ...base, expiresAt: now - 1 }, now), 'lapsed');
  assert.equal(rules.paymentState({ ...base, status: 'deposit_paid', paidSatang: 50000 }, now), 'partial');
  assert.equal(rules.paymentState({ ...base, status: 'paid', paidSatang: 100000 }, now), 'paid');
  assert.equal(rules.paymentState({ ...base, status: 'expired', paidSatang: 50000 }, now), 'review');
  assert.equal(rules.paymentStatusLabel({ ...base, status: 'deposit_paid', paidSatang: 50000 }, now), 'ชำระบางส่วน');
});
