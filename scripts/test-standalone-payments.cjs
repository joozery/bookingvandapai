// Uses disposable prefixed collections in the configured database. Never calls
// Slip2Go, changes live trips, or creates a real customer payment/booking.
require('dotenv').config({ path: '.env.local', quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const { MongoClient } = require('mongodb');

function load(file, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => { if (name in dependencies) return dependencies[name]; throw new Error('Unexpected test dependency'); }, Date });
  return exports;
}
async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const prefix = `payment_check_${crypto.randomUUID().replaceAll('-', '')}_`;
  const names = new Set();
  let db;
  try {
    await client.connect();
    db = client.db(process.env.MONGODB_DB || 'dapai');
    let failCredit = false;
    const isolated = { collection(name) {
      names.add(`${prefix}${name}`);
      const collection = db.collection(`${prefix}${name}`);
      return new Proxy(collection, { get(target, key) {
        if (name === 'paymentOrders' && key === 'findOneAndUpdate') return async (query, update, options) => {
          if (failCredit && update.$addToSet?.appliedReceipts) { failCredit = false; throw new Error('simulated process stop'); }
          return target.findOneAndUpdate(query, update, options);
        };
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      } });
    } };
    const rules = load('src/lib/paymentRules.ts', {});
    const seats = load('src/lib/seatAvailability.ts', {});
    const store = load('src/lib/paymentStore.ts', { 'node:crypto': crypto, './mongodb': { getMongoDb: async () => isolated, getMongoClient: () => { throw new Error('Transactions forbidden in this test'); } }, './paymentRules': rules, './seatAvailability': seats });
    await isolated.collection('trips').insertOne({ id: 'test-trip', name: 'Isolated payment test', status: 'active', cost: 10, departureDate: '2099-01-03', departureTime: '08:00' });
    await isolated.collection('vans').insertOne({ id: 'test-van', tripId: 'test-trip', seats: [1, 2].map(index => ({ id: `seat-${index}`, label: String(index), type: 'customer', status: 'available' })) });
    const checkouts = await Promise.allSettled(['A', 'B', 'C'].map(user => store.createPaymentOrder(`test-${user}`, 'test-trip', 'deposit')));
    const successful = checkouts.filter(result => result.status === 'fulfilled').map(result => result.value);
    assert.equal(successful.length, 2);
    assert.equal(await isolated.collection('paymentOrders').countDocuments(), 2);
    for (const [index, order] of successful.entries()) {
      await isolated.collection('paymentOrders').updateOne({ id: order.id }, { $set: { verifyToken: 'test-token' } });
      const receipt = { transactionKey: `synthetic:${order.id}`, transRef: 'synthetic-no-bank-transfer', paidAt: Date.now(), providerReference: 'synthetic' };
      if (index === 0) {
        failCredit = true;
        await assert.rejects(store.creditPayment(order, 'test-token', receipt));
        const recovered = await store.recoverPaymentOrder(order.userId, order.id);
        assert.equal(recovered.paidSatang, 500);
      } else await store.creditPayment(order, 'test-token', receipt);
      const input = { tripId: order.tripId, vanId: 'test-van', seatId: `seat-${index + 1}`, nickname: 'TEST', fullName: 'Isolated test', phone: '0000000000' };
      const first = await store.bookPaidSeat(order.userId, input, {});
      const retry = await store.bookPaidSeat(order.userId, input, {});
      assert.equal(first.id, retry.id);
    }
    assert.equal(await isolated.collection('bookings').countDocuments(), 2);
    assert.equal((await isolated.collection('paymentCapacity').findOne({ _id: 'test-trip' })).holds.length, 0);
    const hello = await db.admin().command({ hello: 1 });
    console.log(JSON.stringify({ passed: true, databaseMode: hello.setName ? 'replica-set' : 'standalone', concurrentCapacity: 'passed', receiptCrashRecovery: 'passed', paidSeatAndRetry: 'passed', realPaymentsSent: 0 }));
  } finally {
    if (db) for (const name of names) {
      try { await db.collection(name).drop(); } catch (error) { if (error.code !== 26) throw error; }
    }
    await client.close();
    console.log('Disposable test collections cleaned up.');
  }
}
main().catch(error => { console.error(`Standalone payment test failed: ${error.name || 'Error'} ${error.code || ''}`); process.exitCode = 1; });
