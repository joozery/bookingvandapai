const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

function moduleFrom(file, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => { if (name in dependencies) return dependencies[name]; throw new Error(`Unexpected dependency ${name}`); }, Date, URL, ...globals });
  return exports;
}
const rules = moduleFrom('src/lib/paymentRules.ts');
const trip = { cost: 1000.01, departureDate: '2030-01-03', departureTime: '08:00' };
const now = Date.parse('2030-01-01T01:00:00Z');

test('50% deposit rounds up by one satang; balance preserves total exactly', () => {
  const quote = rules.paymentQuote(trip, 'deposit', now);
  assert.equal(quote.totalSatang, 100001);
  assert.equal(quote.amountSatang, 50001);
  assert.equal(quote.totalSatang - quote.amountSatang, 50000);
  assert.equal(quote.balanceDueAt, Date.parse('2030-01-02T01:00:00Z'));
});
test('Bangkok cutoff uses actual departure time; full payment allowed inside 24 hours', () => {
  const cutoff = now + rules.DAY_MS;
  assert.throws(() => rules.paymentQuote(trip, 'deposit', cutoff), /24/);
  assert.equal(rules.paymentQuote(trip, 'full', cutoff).amountSatang, 100001);
  assert.throws(() => rules.paymentQuote(trip, 'full', cutoff + rules.DAY_MS), /ออกเดินทางแล้ว/);
});
test('invalid prices, sub-satang prices and invalid dates cannot produce invoices', () => {
  for (const value of [0, -1, NaN, Infinity, 'wrong', 0.001, 1000001]) assert.throws(() => rules.toSatang(value));
  assert.throws(() => rules.departureTimestamp('2030-02-30', '08:00'));
  assert.throws(() => rules.departureTimestamp('2030-01-03', '24:00'));
});
test('found-only, queued, wrong recipient, wrong amount and duplicate slips never grant payment', () => {
  for (const code of ['200000', '200202', '200401', '200402', '200500', '200501', undefined]) {
    assert.throws(() => rules.assertVerifiedSlip({ code, data: { transRef: 'ref', amount: 100, dateTime: new Date(now).toISOString() } }, 10000, now, now));
  }
});
test('verified slips must match amount and belong to the current checkout time', () => {
  const slip = { code: '200200', data: { transRef: 'bank-ref', amount: 100, dateTime: new Date(now).toISOString() } };
  assert.equal(rules.assertVerifiedSlip(slip, 10000, now, now).transRef, 'bank-ref');
  assert.throws(() => rules.assertVerifiedSlip(slip, 9999, now, now));
  assert.throws(() => rules.assertVerifiedSlip(slip, 10000, now + 120000, now + 120000));
  assert.throws(() => rules.assertVerifiedSlip({ ...slip, data: { ...slip.data, dateTime: 'invalid' } }, 10000, now, now));
});

test('Slip2Go adapter sends server-owned recipient, exact amount and time; accepts only verified responses', async () => {
  const calls = [];
  const now = Date.now();
  const env = { PAYMENTS_ENABLED: 'true', SLIP2GO_SECRET_KEY: 'test-only-key', SLIP2GO_API_URL: 'https://connect.slip2go.com', PAYMENT_PROMPTPAY_ID: '0812345678', PAYMENT_ACCOUNT_NAME: 'Test', PAYMENT_RECEIVER_ACCOUNT: '0812345678', PAYMENT_RECEIVER_TYPE: '02001' };
  let result = { code: '200200', data: { transRef: 'tx', amount: 100, dateTime: new Date(now).toISOString(), sender: { bank: { id: '004' } } } };
  const api = moduleFrom('src/lib/slip2go.ts', { './paymentRules': rules, './paymentSettings': { validatePaymentSettings: () => {}, getPaymentSettings: async () => ({ secret: env.SLIP2GO_SECRET_KEY, settings: { enabled: env.PAYMENTS_ENABLED === 'true', baseUrl: env.SLIP2GO_API_URL, promptPayCode: env.PAYMENT_PROMPTPAY_ID, promptPayType: 'phone_number', accountName: env.PAYMENT_ACCOUNT_NAME, receiverNumber: env.PAYMENT_RECEIVER_ACCOUNT, receiverType: env.PAYMENT_RECEIVER_TYPE } }) } }, { process: { env }, AbortSignal, fetch: async (url, init) => { calls.push({ url, ...init, body: JSON.parse(init.body) }); return { ok: true, json: async () => result }; } });
  const receipt = await api.verifyPaymentSlip('data:image/png;base64,AAAA', 10000, now);
  assert.equal(receipt.transactionKey, '004:tx');
  const condition = calls[0].body.payload.checkCondition;
  assert.equal(condition.checkReceiver[0].accountNumber, '0812345678');
  assert.equal(condition.checkReceiver[0].accountType, '02001');
  assert.equal(condition.checkAmount.amount, 100);
  assert.equal(condition.checkDate.type, 'gte');
  assert.equal(calls[0].headers.Authorization, 'Bearer test-only-key');
  result = { code: '200000', data: result.data };
  await assert.rejects(api.verifyPaymentSlip('image', 10000, now));
  env.PAYMENTS_ENABLED = 'false';
  await assert.rejects(api.paymentConfig());
});

// Each fake write is atomic, but there is deliberately NO session, rollback,
// transaction or process-wide lock. Hooks simulate crash and delayed workers.
function fakeDatabase(initial) {
  const tables = structuredClone(initial);
  const failures = [], pauses = [];
  const get = (row, path) => path.split('.').reduce((value, key) => Array.isArray(value) ? value.flatMap(item => item?.[key] === undefined ? [] : [item[key]]) : value?.[key], row);
  const equals = (value, expected) => Array.isArray(value) ? value.includes(expected) : value === expected;
  const condition = (value, expected) => {
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) return Object.entries(expected).every(([op, target]) => {
      if (op === '$exists') return (value !== undefined) === target;
      if (op === '$in') return Array.isArray(value) ? value.some(item => target.includes(item)) : target.includes(value);
      if (op === '$ne') return !equals(value, target);
      if (op === '$gt') return value > target;
      if (op === '$lt') return value < target;
      if (op === '$elemMatch') return value?.some(item => match(item, target)) || false;
      if (op === '$not') return !condition(value, target);
      throw new Error(op);
    });
    return equals(value, expected);
  };
  const match = (row, query) => Object.entries(query).every(([key, value]) => key === '$or' ? value.some(q => match(row, q)) : key === '$and' ? value.every(q => match(row, q)) : condition(get(row, key), value));
  function update(row, query, updates, inserting = false) {
    const positionalSeat = query.seats?.$elemMatch ? row.seats.find(item => match(item, query.seats.$elemMatch)) : null;
    if (inserting) Object.assign(row, structuredClone(updates.$setOnInsert || {}));
    for (const [key, value] of Object.entries(updates.$set || {})) {
      if (key.startsWith('seats.$.')) positionalSeat[key.slice(8)] = structuredClone(value);
      else row[key] = structuredClone(value);
    }
    for (const [key, value] of Object.entries(updates.$inc || {})) row[key] = (row[key] || 0) + value;
    for (const [key, value] of Object.entries(updates.$addToSet || {})) { row[key] ||= []; if (!row[key].includes(value)) row[key].push(value); }
    for (const key of Object.keys(updates.$unset || {})) delete row[key];
  }
  function unique(name, row, except) {
    const collision = (tables[name] || []).some(other => other !== except && (
      (row._id !== undefined && other._id === row._id) ||
      (name === 'paymentOrders' && other.id === row.id) ||
      (name === 'paymentReceipts' && other.transactionKey === row.transactionKey) ||
      (name === 'bookings' && row.paymentOrderId && other.paymentOrderId === row.paymentOrderId)
    ));
    if (collision) throw Object.assign(new Error('duplicate'), { code: 11000 });
  }
  async function operate(name, op, query, updates, action) {
    const event = { name, op, query, updates };
    const paused = pauses.findIndex(item => item.match(event));
    if (paused >= 0) { const pause = pauses.splice(paused, 1)[0]; pause.enter(); await pause.promise; }
    const failure = failures.findIndex(item => item.when === 'before' && item.match(event));
    if (failure >= 0) { failures.splice(failure, 1); throw new Error('simulated crash'); }
    const result = action();
    const after = failures.findIndex(item => item.when === 'after' && item.match(event));
    if (after >= 0) { failures.splice(after, 1); throw new Error('simulated crash after commit'); }
    return result;
  }
  const db = { collection(name) {
    return {
      createIndex: async () => {},
      findOne: query => operate(name, 'findOne', query, null, () => structuredClone((tables[name] || []).find(row => match(row, query)) || null)),
      find: query => {
        let sort, max;
        const cursor = { sort: value => { sort = value; return cursor; }, limit: value => { max = value; return cursor; }, toArray: () => operate(name, 'find', query, null, () => {
          let rows = (tables[name] || []).filter(row => match(row, query));
          if (sort) { const [key, direction] = Object.entries(sort)[0]; rows = [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * direction); }
          return structuredClone(max ? rows.slice(0, max) : rows);
        }) }; return cursor;
      },
      findOneAndUpdate: (query, updates) => operate(name, 'findOneAndUpdate', query, updates, () => { const row = (tables[name] || []).find(row => match(row, query)); if (!row) return null; update(row, query, updates); return structuredClone(row); }),
      updateOne: (query, updates, options = {}) => operate(name, 'updateOne', query, updates, () => {
        tables[name] ||= [];
        let row = tables[name].find(row => match(row, query));
        if (!row && !options.upsert) return { modifiedCount: 0 };
        if (!row) { row = Object.fromEntries(Object.entries(query).filter(([, value]) => typeof value !== 'object')); update(row, query, updates, true); unique(name, row); tables[name].push(row); return { modifiedCount: 0, upsertedCount: 1 }; }
        update(row, query, updates); return { modifiedCount: 1 };
      }),
      insertOne: row => operate(name, 'insertOne', {}, row, () => { tables[name] ||= []; unique(name, row); tables[name].push(structuredClone(row)); }),
    };
  } };
  return { db, rows: name => tables[name] || [], fail: (match, when = 'before') => failures.push({ match, when }), pause: match => {
    let release, enter;
    const entered = new Promise(resolve => { enter = resolve; });
    const promise = new Promise(resolve => { release = resolve; });
    pauses.push({ match, promise, enter }); return { entered, release };
  } };
}
function storeWith(initial) {
  const fake = fakeDatabase(initial);
  const seats = moduleFrom('src/lib/seatAvailability.ts');
  const store = moduleFrom('src/lib/paymentStore.ts', { 'node:crypto': crypto, './mongodb': { getMongoDb: async () => fake.db, getMongoClient: () => { throw new Error('Transactions are not available'); } }, './paymentRules': rules, './seatAvailability': seats });
  return { store, fake };
}
const futureTrip = { id: 'trip', name: 'Test trip', status: 'active', cost: 1000, departureDate: '2099-01-03', departureTime: '08:00' };
const van = { id: 'van', tripId: 'trip', seats: [{ id: 'seat', label: '1', type: 'customer', status: 'available' }] };

test('last seat cannot be reserved by two simultaneous checkouts; retries resume the same order', async () => {
  const { store, fake } = storeWith({ trips: [futureTrip], vans: [van] });
  const results = await Promise.allSettled([store.createPaymentOrder('A', 'trip', 'deposit'), store.createPaymentOrder('B', 'trip', 'full')]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(fake.rows('paymentOrders').length, 1);
  const original = fake.rows('paymentOrders')[0];
  const resumed = await store.createPaymentOrder(original.userId, 'trip', 'full');
  assert.equal(resumed.id, original.id);
});
test('same bank transfer can credit only one order; expired holds preserve money for review', async () => {
  const base = { id: 'one', userId: 'A', tripId: 'trip', totalSatang: 100000, paidSatang: 0, amountSatang: 50000, status: 'pending', expiresAt: Date.now() + 60000, verifyToken: 'token' };
  const second = { ...base, id: 'two', userId: 'B' };
  const { store, fake } = storeWith({ paymentOrders: [base, second] });
  const receipt = { transactionKey: '004:transfer', transRef: 'transfer', paidAt: Date.now(), providerReference: 'ref' };
  const paid = await store.creditPayment(base, 'token', receipt);
  assert.equal(paid.status, 'deposit_paid');
  await assert.rejects(store.creditPayment(second, 'token', receipt), /สลิปนี้ถูกใช้/);
  assert.equal(fake.rows('paymentReceipts').length, 1);
  assert.equal(fake.rows('paymentOrders')[1].paidSatang, 0);
  const late = { ...base, expiresAt: Date.now() - 1 };
  const expired = storeWith({ paymentOrders: [late] });
  assert.equal((await expired.store.creditPayment(late, 'token', receipt)).status, 'expired');
  assert.equal(expired.fake.rows('paymentReceipts')[0].reviewRequired, true);
});
test('booking consumes only the owner payment; retry is idempotent and never takes another trip seat', async () => {
  const order = { id: 'order', userId: 'A', tripId: 'trip', status: 'deposit_paid', paidSatang: 50000, departureAt: Date.parse('2099-01-03'), totalSatang: 100000 };
  const { store, fake } = storeWith({ trips: [futureTrip], vans: [van], paymentOrders: [order] });
  const input = { tripId: 'trip', vanId: 'van', seatId: 'seat', nickname: 'A', fullName: 'A Test', phone: '0812345678' };
  await assert.rejects(store.bookPaidSeat('B', input, {}), /กรุณาชำระเงิน/);
  await assert.rejects(store.bookPaidSeat('A', { ...input, vanId: 'wrong-van' }, {}), /ไม่ว่าง/);
  const booking = await store.bookPaidSeat('A', input, { name: 'A' });
  assert.equal(booking.paymentOrderId, 'order');
  assert.equal(fake.rows('vans')[0].seats[0].status, 'booked');
  const retried = await store.bookPaidSeat('A', input, { name: 'A' });
  assert.equal(retried.id, booking.id);
  assert.equal(fake.rows('bookings').length, 1);
  const publicView = store.publicOrder({ ...order, verifyToken: 'private', attempts: 3, _id: 'private' });
  for (const key of ['verifyToken', 'userId', 'attempts', '_id']) assert.equal(key in publicView, false);
});

test('payment endpoints reject anonymous users before reading data or calling provider', async () => {
  for (const file of ['src/app/api/payments/route.ts', 'src/app/api/payments/[id]/route.ts', 'src/app/api/payments/[id]/verify/route.ts']) {
    const api = moduleFrom(file, {
      'node:crypto': crypto,
      '@/lib/paymentAuth': { paymentUser: async () => { throw new Error('unauthorized'); }, checkPaymentOrigin: () => {}, paymentError: () => ({ status: 401 }) },
      '@/lib/paymentStore': {}, '@/lib/slip2go': {}, '@/lib/paymentRules': rules,
    });
    const context = { params: Promise.resolve({ id: 'order' }) };
    if (api.GET) assert.equal((await api.GET({}, context)).status, 401);
    assert.equal((await api.POST({}, context)).status, 401);
  }
});

test('balance payment completes the frozen invoice total and cannot overcredit', async () => {
  const order = { id: 'balance', userId: 'A', tripId: 'trip', status: 'deposit_paid', totalSatang: 100001, paidSatang: 50001, amountSatang: 50000, verifyToken: 'token', expiresAt: Date.now() + 60000 };
  const { store, fake } = storeWith({ paymentOrders: [order] });
  const result = await store.creditPayment(order, 'token', { transactionKey: '004:balance', transRef: 'balance', paidAt: Date.now(), providerReference: 'reference' });
  assert.equal(result.status, 'paid');
  assert.equal(result.paidSatang, 100001);
  assert.equal(result.amountSatang, 0);
  await assert.rejects(store.creditPayment(order, 'token', { transactionKey: '004:another', transRef: 'another', paidAt: Date.now(), providerReference: '' }));
  assert.equal(fake.rows('paymentReceipts').length, 1);
});

test('reading another customer order includes session ownership in the database query', async () => {
  let filter;
  const api = moduleFrom('src/app/api/payments/[id]/route.ts', {
    '@/lib/paymentAuth': { paymentUser: async () => ({ id: 'attacker' }), paymentError: error => { throw error; } },
    '@/lib/paymentStore': { recoverPaymentOrder: async (userId, id) => { filter = { userId, id }; return null; } },
    '@/lib/slip2go': {}, '@/lib/paymentRules': rules,
  }, { Response });
  const response = await api.GET({}, { params: Promise.resolve({ id: 'victim-order' }) });
  assert.equal(response.status, 404);
  assert.equal(filter.id, 'victim-order');
  assert.equal(filter.userId, 'attacker');
});

test('disabled checkout never bypasses payment on new seat bookings', async () => {
  const bookingBody = { tripId: 'trip', vanId: 'van', seatId: 'seat', nickname: 'A', fullName: 'A Test', phone: '0812345678', lineUserId: 'A' };
  let claims = 0;
  const dependencies = {
    'next/server': { NextResponse: { json: (data, init) => ({ data, status: init?.status || 200 }) } },
    '@/lib/supabase': { supabase: { from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ in: async () => ({ data: [] }) }) }) }) }) } },
    '@/lib/tripReview': {},
    '@/lib/bookingPayments': {},
    '@/lib/paymentAuth': { checkPaymentOrigin: () => {}, paymentUser: async () => ({ id: 'A' }), paymentError: error => ({ status: 400, message: error.message }) },
    '@/lib/paymentStore': { bookPaidSeat: async () => { claims++; throw new Error('payment required'); } },
    // Only the GET handler is guarded; POST relies on the payment owner check.
    '@/lib/adminAuth': { requireAdmin: async () => { throw new Error('POST must not use the admin guard'); }, requireOwnerOrAdmin: async () => { throw new Error('POST must not use the owner guard'); } },
  };
  const api = moduleFrom('src/app/api/bookings/route.ts', dependencies, { process: { env: { PAYMENTS_ENABLED: 'false' } } });
  const result = await api.POST({ json: async () => bookingBody });
  assert.equal(result.status, 400);
  assert.equal(result.message, 'payment required');
  assert.equal(claims, 1);
});

test('many simultaneous checkouts cannot oversell, including duplicate requests from the same account', async () => {
  const { store, fake } = storeWith({ trips: [futureTrip], vans: [van] });
  const same = await Promise.all(Array.from({ length: 12 }, () => store.createPaymentOrder('A', 'trip', 'deposit')));
  assert.equal(new Set(same.map(order => order.id)).size, 1);
  const others = await Promise.allSettled(Array.from({ length: 12 }, (_, index) => store.createPaymentOrder(`other-${index}`, 'trip', 'full')));
  assert.equal(others.filter(result => result.status === 'fulfilled').length, 0);
  assert.equal(fake.rows('paymentOrders').length, 1);
  assert.equal(fake.rows('paymentCapacity')[0].holds.length, 1);
});

test('capacity reservation survives a crash before its order projection is written', async () => {
  const { store, fake } = storeWith({ trips: [futureTrip], vans: [van] });
  fake.fail(event => event.name === 'paymentOrders' && event.op === 'updateOne');
  await assert.rejects(store.createPaymentOrder('A', 'trip', 'full'), /simulated crash/);
  assert.equal(fake.rows('paymentOrders').length, 0);
  assert.equal(fake.rows('paymentCapacity')[0].holds.length, 1);
  await assert.rejects(store.createPaymentOrder('B', 'trip', 'full'), /เต็ม/);
  const recovered = await store.recoverPaymentOrders('A');
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].userId, 'A');
  assert.equal((await store.createPaymentOrder('A', 'trip', 'full')).id, recovered[0].id);
});

const verified = name => ({ transactionKey: `004:${name}`, transRef: name, paidAt: Date.now(), providerReference: 'reference' });
async function checkoutWithToken(store, fake, user = 'A') {
  const order = await store.createPaymentOrder(user, 'trip', 'deposit');
  await fake.db.collection('paymentOrders').updateOne({ id: order.id }, { $set: { verifyToken: 'token' } });
  return { ...order, verifyToken: 'token' };
}

test('receipt-first recovery credits money exactly once after a crash before the order update', async () => {
  const { store, fake } = storeWith({ trips: [futureTrip], vans: [van] });
  const order = await checkoutWithToken(store, fake);
  fake.fail(event => event.name === 'paymentOrders' && event.op === 'findOneAndUpdate' && event.updates?.$addToSet?.appliedReceipts);
  await assert.rejects(store.creditPayment(order, 'token', verified('receipt-first')), /simulated crash/);
  assert.equal(fake.rows('paymentReceipts').length, 1);
  assert.equal(fake.rows('paymentOrders')[0].paidSatang, 0);
  const recovered = await store.recoverPaymentOrder('A', order.id);
  assert.equal(recovered.paidSatang, 50000);
  assert.equal(recovered.status, 'deposit_paid');
  assert.equal(fake.rows('paymentCapacity')[0].holds[0].paid, true);
  assert.equal((await store.recoverPaymentOrder('A', order.id)).paidSatang, 50000);
  assert.equal(fake.rows('paymentReceipts').length, 1);
});

test('a lost acknowledgement after money was credited does not increment it twice', async () => {
  const { store, fake } = storeWith({ trips: [futureTrip], vans: [van] });
  const order = await checkoutWithToken(store, fake);
  fake.fail(event => event.name === 'paymentOrders' && event.op === 'findOneAndUpdate' && event.updates?.$addToSet?.appliedReceipts, 'after');
  await assert.rejects(store.creditPayment(order, 'token', verified('credit-ack')), /after commit/);
  assert.equal(fake.rows('paymentOrders')[0].paidSatang, 50000);
  const recovered = await store.recoverPaymentOrder('A', order.id);
  assert.equal(recovered.paidSatang, 50000);
  assert.equal(fake.rows('paymentReceipts')[0].applied, true);
});

test('two verified transfers for the same invoice preserve the extra receipt for review, not as a balance payment', async () => {
  const { store, fake } = storeWith({ trips: [futureTrip], vans: [van] });
  const order = await checkoutWithToken(store, fake);
  // Both requests already have durable provider responses when workers race.
  const results = await Promise.allSettled([store.creditPayment(order, 'token', verified('first-transfer')), store.creditPayment(order, 'token', verified('second-transfer'))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 2);
  assert.equal(fake.rows('paymentOrders')[0].paidSatang, 50000);
  assert.equal(fake.rows('paymentReceipts').length, 2);
  assert.equal(fake.rows('paymentReceipts').filter(receipt => receipt.reviewRequired).length, 1);
});

test('booking recovers after claiming a seat and after inserting its ticket, without duplicate tickets', async () => {
  for (const point of ['seat', 'ticket', 'published']) {
    const { store, fake } = storeWith({ trips: [futureTrip], vans: [van] });
    const order = await checkoutWithToken(store, fake);
    await store.creditPayment(order, 'token', verified(point));
    if (point === 'seat') fake.fail(event => event.name === 'vans' && event.op === 'findOneAndUpdate' && event.updates?.$set?.['seats.$.status'], 'after');
    if (point === 'ticket') fake.fail(event => event.name === 'bookings' && event.op === 'updateOne', 'after');
    if (point === 'published') fake.fail(event => event.name === 'paymentOrders' && event.op === 'findOneAndUpdate' && event.updates?.$set?.bookingId, 'after');
    const input = { tripId: 'trip', vanId: 'van', seatId: 'seat', nickname: 'A', fullName: 'A Test', phone: '0812345678' };
    await assert.rejects(store.bookPaidSeat('A', input, {}), /simulated crash/);
    const recovered = await store.recoverPaymentOrder('A', order.id);
    assert.ok(recovered.bookingId);
    assert.equal(fake.rows('bookings').length, 1);
    assert.equal(fake.rows('vans')[0].seats[0].bookingId, recovered.bookingId);
    assert.equal(fake.rows('paymentCapacity')[0].holds.length, 0);
    assert.equal((await store.bookPaidSeat('A', input, {})).id, recovered.bookingId);
  }
});

test('a fenced delayed worker cannot take an old seat after a new choice has completed', async () => {
  const twoSeats = { ...van, seats: [...van.seats, { id: 'seat-2', label: '2', type: 'customer', status: 'available' }] };
  const { store, fake } = storeWith({ trips: [futureTrip], vans: [twoSeats] });
  const order = await checkoutWithToken(store, fake);
  await store.creditPayment(order, 'token', verified('fence'));
  const pause = fake.pause(event => event.name === 'vans' && event.op === 'findOneAndUpdate' && event.updates?.$set?.['seats.$.status']);
  const input = { tripId: 'trip', vanId: 'van', seatId: 'seat', nickname: 'A', fullName: 'A Test', phone: '0812345678' };
  const delayed = store.bookPaidSeat('A', input, {}).then(value => ({ value }), error => ({ error }));
  await pause.entered;
  await fake.db.collection('vans').updateOne({ id: 'van', seats: { $elemMatch: { id: 'seat' } } }, { $set: { 'seats.$.status': 'booked', 'seats.$.bookingId': 'other-passenger' } });
  await store.recoverPaymentOrder('A', order.id);
  assert.equal(fake.rows('paymentOrders')[0].bookingClaim, undefined);
  const booking = await store.bookPaidSeat('A', { ...input, seatId: 'seat-2' }, {});
  await fake.db.collection('vans').updateOne({ id: 'van', seats: { $elemMatch: { id: 'seat' } } }, { $set: { 'seats.$.status': 'available', 'seats.$.bookingId': null } });
  pause.release();
  assert.ok((await delayed).error);
  assert.equal(fake.rows('vans')[0].seats[0].status, 'available');
  assert.equal(fake.rows('vans')[0].seats[1].bookingId, booking.id);
  assert.equal(fake.rows('bookings').length, 1);
});

test('checkout retries its capacity snapshot when another customer finishes selecting a seat', async () => {
  const twoSeats = { ...van, seats: [...van.seats, { id: 'seat-2', label: '2', type: 'customer', status: 'available' }] };
  const { store, fake } = storeWith({ trips: [futureTrip], vans: [twoSeats] });
  const paid = await checkoutWithToken(store, fake);
  await store.creditPayment(paid, 'token', verified('revision'));
  const pause = fake.pause(event => event.name === 'paymentCapacity' && event.op === 'updateOne' && event.updates?.$inc?.revision);
  const waiting = store.createPaymentOrder('B', 'trip', 'full');
  await pause.entered;
  await store.bookPaidSeat('A', { tripId: 'trip', vanId: 'van', seatId: 'seat', nickname: 'A', fullName: 'A Test', phone: '0812345678' }, {});
  pause.release();
  const second = await waiting;
  assert.equal(second.userId, 'B');
  await assert.rejects(store.createPaymentOrder('C', 'trip', 'full'), /เต็ม/);
  assert.equal(fake.rows('paymentCapacity')[0].holds.length, 1);
  assert.equal(fake.rows('bookings').length, 1);
});

test('non-2xx Slip2Go errors preserve their reason without exposing raw provider messages', async () => {
  const api = moduleFrom('src/lib/slip2go.ts', {
    './paymentRules': rules,
    './paymentSettings': {
      validatePaymentSettings: () => {},
      getPaymentSettings: async () => ({ secret: 'private-test-key', settings: { enabled: true, baseUrl: 'https://connect.slip2go.com', promptPayType: 'phone_number', promptPayCode: '0812345678', accountName: 'Test', receiverType: '02001', receiverNumber: '0812345678' } }),
    },
  }, { AbortSignal, fetch: async () => ({ ok: false, status: 401, json: async () => ({ code: '401005', message: 'untrusted private-test-key', data: { referenceId: 'support-reference' } }) }) });
  await assert.rejects(api.verifyPaymentSlip('data:image/png;base64,AAAA', 50, Date.now()), error => {
    assert.equal(error.providerCode, '401005');
    assert.equal(error.providerReference, 'support-reference');
    assert.match(error.message, /โควตา/);
    assert.equal(error.message.includes('private-test-key'), false);
    return true;
  });
});

test('verification reports the expected deposit amount and never accepts found-only responses', () => {
  assert.throws(() => rules.assertVerifiedSlip({ code: '200402' }, 50, Date.now()), error => error.providerCode === '200402' && error.message.includes('0.50'));
  assert.throws(() => rules.assertVerifiedSlip({ code: '200401' }, 50, Date.now()), error => error.providerCode === '200401' && error.message.includes('บัญชีผู้รับ'));
  const now = Date.now();
  assert.equal(rules.assertVerifiedSlip({ code: 200200, data: { transRef: 'reference', amount: 0.50, dateTime: new Date(now).toISOString() } }, 50, now).transRef, 'reference');
  assert.throws(() => rules.assertVerifiedSlip({ code: 200000, data: { transRef: 'reference', amount: 0.50, dateTime: new Date(now).toISOString() } }, 50, now));
});

test('PromptPay-only slips can match the QR identity while the configured bank remains an allowed receiver', () => {
  const receivers = rules.paymentReceivers({ promptPayType: 'phone_number', promptPayCode: '0812345678', receiverType: '01025', receiverNumber: '1234567890' });
  assert.equal(receivers.length, 2);
  assert.equal(receivers[0].accountType, '02001');
  assert.equal(receivers[0].accountNumber, '0812345678');
  assert.equal(receivers[1].accountType, '01025');
  assert.equal(receivers[1].accountNumber, '1234567890');
  const same = rules.paymentReceivers({ promptPayType: 'phone_number', promptPayCode: '0812345678', receiverType: '02001', receiverNumber: '0812345678' });
  assert.equal(same.length, 1);
  assert.equal(rules.paymentReceivers({ promptPayType: 'citizen_id', promptPayCode: '1234567890123', receiverType: '', receiverNumber: '' })[0].accountType, '02003');
});

test('verification keeps the QR receiver snapshot when the shop settings change', async () => {
  const now = Date.now();
  let payload;
  const api = moduleFrom('src/lib/slip2go.ts', {
    './paymentRules': rules,
    './paymentSettings': { validatePaymentSettings: () => {}, getPaymentSettings: async () => ({ secret: 'test-only', settings: { enabled: true, baseUrl: 'https://connect.slip2go.com', promptPayType: 'phone_number', promptPayCode: '0899999999', accountName: 'Test', receiverType: '01025', receiverNumber: '9999999999' } }) },
  }, { AbortSignal, fetch: async (_url, init) => { payload = JSON.parse(init.body); return { ok: true, json: async () => ({ code: '200200', data: { transRef: 'snapshot', amount: 0.50, dateTime: new Date(now).toISOString(), sender: { bank: { id: '004' } } } }) }; } });
  await api.verifyPaymentSlip('data:image/png;base64,AAAA', 50, now, [{ accountType: '02001', accountNumber: '0812345678' }]);
  assert.equal(payload.payload.checkCondition.checkReceiver.length, 1);
  assert.equal(payload.payload.checkCondition.checkReceiver[0].accountNumber, '0812345678');
  assert.equal(payload.payload.checkCondition.checkAmount.amount, 0.50);
  assert.equal(payload.payload.checkCondition.checkDate.type, 'gte');
});
