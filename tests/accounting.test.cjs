const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

function moduleFrom(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => { if (name in dependencies) return dependencies[name]; throw new Error(`Unexpected dependency ${name}`); }, Date, Map, Set });
  return exports;
}
const rules = moduleFrom('src/lib/paymentRules.ts');
const accounting = moduleFrom('src/lib/accounting.ts', { 'node:crypto': crypto, './mongodb': { getMongoDb: async () => { throw new Error('no db in unit tests'); } }, './paymentRules': rules });

const trips = [
  { id: 't1', name: 'Open trip', departureDate: '2030-02-01', status: 'active' },
  { id: 't2', name: 'Closed trip', departureDate: '2030-01-01', status: 'completed' },
];
const entry = (over) => ({ id: crypto.randomUUID(), type: 'expense', categoryId: 'van', tripId: 't1', amountSatang: 100000, date: '2030-01-10', description: '', createdAt: 1, createdBy: 'x', ...over });

test('payments feed income and outstanding; abandoned checkouts are ignored', () => {
  const s = accounting.summarizeAccounts({
    trips, bookings: [{ tripId: 't1', status: 'approved' }, { tripId: 't1', status: 'approved' }, { tripId: 't1', status: 'rejected' }],
    orders: [
      { id: 'a', tripId: 't1', totalSatang: 300000, paidSatang: 150000, status: 'deposit_paid' },
      { id: 'b', tripId: 't1', totalSatang: 300000, paidSatang: 300000, status: 'paid' },
      { id: 'c', tripId: 't1', totalSatang: 300000, paidSatang: 0, status: 'pending' },
    ],
    entries: [], partners: [], partnerTransactions: [],
  });
  const t1 = s.trips.find(t => t.tripId === 't1');
  assert.equal(t1.paymentIncomeSatang, 450000);
  assert.equal(t1.outstandingSatang, 150000);
  assert.equal(t1.passengers, 2);
  assert.equal(t1.incomeByCategory[accounting.PAYMENT_INCOME_CATEGORY.id], 450000);
  assert.equal(s.overview.outstandingSatang, 150000);
  assert.equal(s.overview.openTrips, 1);
  assert.equal(s.overview.closedTrips, 1);
});

test('per-trip profit, cost per passenger and overhead roll into the overall P&L', () => {
  const s = accounting.summarizeAccounts({
    trips, bookings: [{ tripId: 't1', status: 'approved' }, { tripId: 't1', status: 'approved' }],
    orders: [{ id: 'a', tripId: 't1', totalSatang: 500000, paidSatang: 500000, status: 'paid' }],
    entries: [
      entry({ amountSatang: 200000 }), entry({ categoryId: 'fuel', amountSatang: 50000 }),
      entry({ type: 'income', categoryId: 'extra', amountSatang: 30000 }),
      entry({ tripId: null, categoryId: 'office', amountSatang: 40000 }),
      entry({ tripId: 't2', amountSatang: 70000 }),
    ],
    partners: [], partnerTransactions: [],
  });
  const t1 = s.trips.find(t => t.tripId === 't1');
  assert.equal(t1.incomeSatang, 530000);
  assert.equal(t1.expenseSatang, 250000);
  assert.equal(t1.profitSatang, 280000);
  assert.equal(t1.costPerPassengerSatang, 125000);
  assert.deepEqual({ ...t1.expenseByCategory }, { van: 200000, fuel: 50000 });
  const t2 = s.trips.find(t => t.tripId === 't2');
  assert.equal(t2.profitSatang, -70000, 'a trip with only costs shows a loss');
  assert.equal(t2.costPerPassengerSatang, null);
  assert.equal(s.overview.overheadExpenseSatang, 40000);
  assert.equal(s.overview.expenseSatang, 360000);
  assert.equal(s.overview.incomeSatang, 530000);
  assert.equal(s.overview.profitSatang, 170000);
});

test('partner advances, reimbursements, compensation and profit share', () => {
  const partners = [{ id: 'p1', name: 'A', phone: '', sharePercent: 60, note: '', createdAt: 1 }, { id: 'p2', name: 'B', phone: '', sharePercent: 40, note: '', createdAt: 1 }];
  const s = accounting.summarizeAccounts({
    trips, bookings: [], orders: [{ id: 'a', tripId: 't1', totalSatang: 1000000, paidSatang: 1000000, status: 'paid' }],
    entries: [entry({ amountSatang: 300000, paidByPartnerId: 'p1' }), entry({ categoryId: 'comp', amountSatang: 100000, payeePartnerId: 'p2' })],
    partners, partnerTransactions: [{ id: 'r', partnerId: 'p1', kind: 'reimbursement', amountSatang: 120000, date: '2030-01-11', description: '', createdAt: 1, createdBy: 'x' }],
  });
  const [a, b] = s.partners;
  assert.equal(a.advancedSatang, 300000);
  assert.equal(a.reimbursedSatang, 120000);
  assert.equal(a.owedSatang, 180000);
  assert.equal(b.compensationSatang, 100000);
  assert.equal(s.overview.profitSatang, 600000, 'advances and compensation are business expenses');
  assert.equal(a.profitShareSatang, 360000);
  assert.equal(b.profitShareSatang, 240000);
  assert.equal(s.overview.owedToPartnersSatang, 180000);
});

test('entries for a deleted trip are kept, not lost', () => {
  const s = accounting.summarizeAccounts({ trips, bookings: [], orders: [], entries: [entry({ tripId: 'gone', amountSatang: 5000 })], partners: [], partnerTransactions: [] });
  assert.equal(s.trips.find(t => t.tripId === 'gone').expenseSatang, 5000);
  assert.equal(s.overview.expenseSatang, 5000);
  assert.equal(s.overview.closedTrips, 1, 'deleted trips are not counted as closed trips');
});
