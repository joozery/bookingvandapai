// Admin payment features against real MongoDB, using disposable prefixed
// collections that are removed in `finally`. Never touches live trips,
// bookings or payments and never calls Slip2Go.
require('dotenv').config({ path: '.env.local', quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const ExcelJS = require('exceljs');
const { MongoClient } = require('mongodb');

function load(file, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => { if (name in dependencies) return dependencies[name]; throw new Error(`Unexpected test dependency ${name}`); }, Date, Buffer, Intl, Map, Set });
  return exports;
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const prefix = `admin_pay_check_${crypto.randomUUID().replaceAll('-', '')}_`;
  const names = new Set();
  let db;
  try {
    await client.connect();
    db = client.db(process.env.MONGODB_DB || 'dapai');
    const isolated = { collection(name) { names.add(`${prefix}${name}`); return db.collection(`${prefix}${name}`); } };
    const mongo = { getMongoDb: async () => isolated };
    const rules = load('src/lib/paymentRules.ts', {});
    const seats = load('src/lib/seatAvailability.ts', {});
    const store = load('src/lib/paymentStore.ts', { 'node:crypto': crypto, './mongodb': mongo, './paymentRules': rules, './seatAvailability': seats });
    const admin = load('src/lib/adminPayments.ts', { './paymentStore': store, './paymentRules': rules });
    const move = load('src/lib/seatMove.ts', { './mongodb': mongo });
    const report = load('src/lib/paymentReport.ts', { exceljs: { default: ExcelJS, ...ExcelJS } });

    const now = Date.now();
    const seat = (id, status = 'available', bookingId = null, type = 'customer') => ({ id, label: id.toUpperCase(), type, status, bookingId, row: 1, col: 1 });
    await isolated.collection('vans').insertMany([
      { id: 'van-1', tripId: 'trip-1', vanNumber: 1, seats: [seat('d1', 'available', null, 'driver'), seat('a1', 'booked', 'b-1'), seat('a2'), seat('a3', 'booked', 'b-other')] },
      { id: 'van-2', tripId: 'trip-1', vanNumber: 2, seats: [seat('c1')] },
      { id: 'van-x', tripId: 'trip-2', vanNumber: 1, seats: [seat('x1')] },
    ]);
    await isolated.collection('bookings').insertMany([
      { id: 'b-1', tripId: 'trip-1', vanId: 'van-1', seatId: 'a1', seatLabel: 'A1', status: 'approved', fullName: 'สมชาย ใจดี', nickname: 'ชาย', phone: '0812345678', lineUserId: 'u-1', paymentOrderId: 'o-1' },
      { id: 'b-other', tripId: 'trip-1', vanId: 'van-1', seatId: 'a3', seatLabel: 'A3', status: 'approved', fullName: 'คนอื่น', nickname: 'อื่น', phone: '0800000000', lineUserId: 'u-2' },
    ]);
    const order = { id: 'o-1', userId: 'u-1', userName: 'Chai LINE', tripId: 'trip-1', tripName: 'ภูกระดึง', plan: 'deposit', totalSatang: 150000, paidSatang: 50000, amountSatang: 0,
      balanceDueAt: now + 86400000, departureAt: now + 2 * 86400000, createdAt: now - 1000, expiresAt: now + 1000, checkoutCreatedAt: now - 1000, status: 'deposit_paid', bookingId: 'b-1' };
    await isolated.collection('paymentOrders').insertMany([
      order,
      { ...order, id: 'o-pending', userId: 'u-3', paidSatang: 0, amountSatang: 50000, status: 'pending', bookingId: undefined, userName: 'Pending' },
      { ...order, id: 'o-lapsed', userId: 'u-4', paidSatang: 0, amountSatang: 50000, status: 'pending', expiresAt: now - 1, bookingId: undefined, userName: 'Lapsed' },
    ]);
    await isolated.collection('paymentReceipts').insertOne({ id: 'r-1', orderId: 'o-1', userId: 'u-1', transactionKey: '004:REF123', transRef: 'REF123', paidAt: now - 500, recordedAt: now - 400,
      amountSatang: 50000, expectedPaidSatang: 0, checkoutCreatedAt: now - 1000, providerReference: 'p', payerName: 'นาย สมชาย ใจดี', payerBank: 'KBANK', registrantName: 'สมชาย ใจดี', tripName: 'ภูกระดึง', applied: true });

    // ── Payment history, search and status ──────────────────────────────
    let rows = await admin.loadAdminPayments(now);
    const row = rows.find(r => r.id === 'o-1');
    assert.equal(row.state, 'partial');
    assert.equal(row.balanceSatang, 100000);
    assert.equal(row.booking.seatLabel, 'A1');
    assert.equal(row.booking.vanNumber, 1);
    assert.equal(row.receipts[0].payerName, 'นาย สมชาย ใจดี');
    assert.equal(rows.find(r => r.id === 'o-lapsed').state, 'lapsed');
    assert.deepEqual(admin.filterPayments(rows, { q: 'ref123' }).map(r => r.id), ['o-1']);
    assert.deepEqual(admin.filterPayments(rows, { q: '0812345678' }).map(r => r.id), ['o-1']);
    assert.ok(!admin.filterPayments(rows, { state: 'active' }).some(r => r.id === 'o-lapsed'));
    assert.deepEqual(admin.filterPayments(rows, { state: 'unpaid' }).map(r => r.id), ['o-pending']);
    console.log('✔ history, search and status filters');

    // ── Admin edits the amount owed; balance follows ────────────────────
    await assert.rejects(() => admin.adjustOrderTotal('o-1', 1200, '', 'tester'), /เหตุผล/);
    await assert.rejects(() => admin.adjustOrderTotal('o-1', 400, 'ลด', 'tester'), /ไม่น้อยกว่ายอดที่ชำระแล้ว/);
    await assert.rejects(() => admin.adjustOrderTotal('o-pending', 1200, 'ลด', 'tester'), /หลังลูกค้าชำระงวดแรก/);
    await isolated.collection('paymentOrders').updateOne({ id: 'o-1' }, { $set: { verifyUntil: Date.now() + 60000 } });
    await assert.rejects(() => admin.adjustOrderTotal('o-1', 1200, 'ลด', 'tester'), /กำลังส่งสลิป/);
    await isolated.collection('paymentOrders').updateOne({ id: 'o-1' }, { $unset: { verifyUntil: '' }, $set: { amountSatang: 100000, qrCode: 'old-qr' } });
    let updated = await admin.adjustOrderTotal('o-1', 1200, 'ส่วนลดกลุ่ม', 'tester');
    assert.equal(updated.totalSatang, 120000);
    assert.equal(updated.status, 'deposit_paid');
    assert.equal(updated.amountSatang, 0, 'old balance QR withdrawn');
    assert.equal(updated.qrCode, undefined);
    assert.equal(updated.adjustments.length, 1);
    updated = await admin.adjustOrderTotal('o-1', 500, 'ปิดยอด', 'tester');
    assert.equal(updated.status, 'paid');
    updated = await admin.adjustOrderTotal('o-1', 1500, 'คืนราคาเดิม', 'tester');
    assert.equal(updated.status, 'deposit_paid');
    assert.equal(updated.adjustments.length, 3);
    console.log('✔ adjust amount owed with automatic balance and audit trail');

    // ── Admin seat move updates the seat map and the payment ───────────
    await assert.rejects(() => move.moveBookingSeat('b-1', 'van-1', 'a1', 'tester'), /ที่นั่งเดิม/);
    await assert.rejects(() => move.moveBookingSeat('b-1', 'van-1', 'a3', 'tester'), /ไม่ว่าง/);
    await assert.rejects(() => move.moveBookingSeat('b-1', 'van-1', 'd1', 'tester'), /ไม่สามารถจองได้/);
    await assert.rejects(() => move.moveBookingSeat('b-1', 'van-x', 'x1', 'tester'), /ทริปเดียวกัน/);
    const moved = await move.moveBookingSeat('b-1', 'van-2', 'c1', 'tester');
    assert.equal(moved.paymentsUpdated, 1);
    const van1 = await isolated.collection('vans').findOne({ id: 'van-1' });
    const van2 = await isolated.collection('vans').findOne({ id: 'van-2' });
    assert.deepEqual([van1.seats[1].status, van1.seats[1].bookingId], ['available', null], 'old seat freed');
    assert.deepEqual([van2.seats[0].status, van2.seats[0].bookingId], ['booked', 'b-1'], 'new seat claimed');
    assert.equal(van1.seats[3].bookingId, 'b-other', 'other passengers untouched');
    const booking = await isolated.collection('bookings').findOne({ id: 'b-1' });
    assert.deepEqual([booking.vanId, booking.seatId, booking.seatLabel], ['van-2', 'c1', 'C1']);
    const paid = await isolated.collection('paymentOrders').findOne({ id: 'o-1' });
    assert.deepEqual(paid.seat, { vanId: 'van-2', seatId: 'c1', seatLabel: 'C1', vanNumber: 2 });
    assert.equal(paid.seatHistory.length, 1);
    assert.equal(paid.seatHistory[0].from.seatLabel, 'A1');
    rows = await admin.loadAdminPayments(now);
    assert.equal(rows.find(r => r.id === 'o-1').booking.seatLabel, 'C1');
    assert.equal(rows.find(r => r.id === 'o-1').booking.vanNumber, 2);
    console.log('✔ seat move frees old seat, claims new seat and updates the payment record');

    // Seat-change approval: payment follows the replacement booking.
    // Same order as the approval route: the request booking exists, the old
    // booking is deleted, then the payment order ID moves to the new booking.
    await isolated.collection('bookings').insertOne({ id: 'b-1-new', tripId: 'trip-1', vanId: 'van-1', seatId: 'a2', seatLabel: 'A2', status: 'approved', fullName: 'สมชาย ใจดี', phone: '0812345678' });
    await isolated.collection('bookings').deleteOne({ id: 'b-1' });
    await isolated.collection('bookings').updateOne({ id: 'b-1-new' }, { $set: { paymentOrderId: 'o-1' } });
    assert.equal(await move.syncPaymentSeat({ id: 'b-1-new', tripId: 'trip-1', vanId: 'van-1', seatId: 'a2', seatLabel: 'A2', status: 'approved', paymentOrderId: 'o-1' }, { vanId: 'van-2', seatId: 'c1', seatLabel: 'C1' }, 'approval', 'b-1'), 1);
    const relinked = await isolated.collection('paymentOrders').findOne({ id: 'o-1' });
    assert.equal(relinked.bookingId, 'b-1-new');
    assert.equal(relinked.seat.seatLabel, 'A2');
    console.log('✔ approved seat-change request carries the payment to the new booking');

    // ── Excel export ────────────────────────────────────────────────────
    rows = await admin.loadAdminPayments(now);
    const file = await report.buildPaymentWorkbook(admin.filterPayments(rows, { state: 'active' }));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file);
    const summary = workbook.getWorksheet('สรุปการชำระเงิน');
    const transfers = workbook.getWorksheet('รายการโอนเงิน');
    const headers = summary.getRow(1).values.filter(Boolean);
    for (const header of ['ทริป', 'ชื่อผู้ลงทะเบียน', 'ที่นั่ง', 'ยอดที่ต้องชำระ', 'ชำระแล้ว', 'คงเหลือ', 'สถานะ', 'ชื่อผู้โอน (จากสลิป)']) assert.ok(headers.includes(header), header);
    assert.equal(summary.rowCount, 1 + 2 + 1, 'header + 2 active orders + total row');
    const col = name => headers.indexOf(name) + 1;
    const data = [2, 3].map(n => summary.getRow(n)).find(r => r.getCell(col('เลขรายการ')).value === 'o-1');
    assert.equal(data.getCell(col('ที่นั่ง')).value, 'A2');
    assert.equal(data.getCell(col('คงเหลือ')).value, 1000);
    assert.equal(data.getCell(col('เบอร์โทร')).value, '0812345678');
    assert.equal(data.getCell(col('ชื่อผู้โอน (จากสลิป)')).value, 'นาย สมชาย ใจดี');
    assert.equal(transfers.rowCount, 2);
    assert.equal(transfers.getRow(2).getCell(4).value, 'นาย สมชาย ใจดี');
    console.log('✔ Excel workbook with summary and transfer sheets');
    console.log('ALL ADMIN PAYMENT CHECKS PASSED');
  } finally {
    if (db) for (const name of names) await db.collection(name).drop().catch(() => undefined);
    await client.close();
  }
}
main().catch(error => { console.error(error); process.exit(1); });
