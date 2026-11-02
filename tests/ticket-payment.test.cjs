const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText,
    { exports, require: name => { if (name in dependencies) return dependencies[name]; throw new Error(`Unexpected dependency ${name}`); } });
  return exports;
}
const amounts = load('src/lib/ticketPayment.ts');
const deposit = { id: 'order-A', userId: 'A', tripId: 'trip', totalSatang: 100, paidSatang: 50, balanceDueAt: 1794200000000, status: 'deposit_paid' };

test('ticket balance uses the invoice total and keeps satang exact; paid badges require verified payment', () => {
  const result = amounts.ticketPayment(deposit);
  assert.equal(result.remainingSatang, 50);
  assert.equal(result.status, 'outstanding');
  assert.equal(amounts.ticketPayment({ ...deposit, paidSatang: 100, status: 'paid' }).status, 'paid');
  for (const order of [{ ...deposit, status: 'pending' }, { ...deposit, status: 'expired' }, { ...deposit, paidSatang: 0 }, { ...deposit, paidSatang: 101 }, { ...deposit, paidSatang: NaN }]) assert.equal(amounts.ticketPayment(order), null);
});
function summaries(user, admin = null) {
  let paymentQueries = 0;
  const helper = load('src/lib/bookingPayments.ts', {
    'next-auth': { getServerSession: async () => user ? { user } : null },
    '@/app/api/auth/[...nextauth]/route': { authOptions: {} },
    './ticketPayment': amounts,
    './mongodb': { getMongoDb: async () => ({ collection: name => name === 'admins' ? { findOne: async query => admin?.isBlocked ? null : admin } : { find: () => { paymentQueries++; return { toArray: async () => [deposit, { ...deposit, id: 'order-B', userId: 'B', paidSatang: 100, status: 'paid' }] }; } } }) },
  });
  return { ...helper, queryCount: () => paymentQueries };
}
test('anonymous and other customers never receive another owner payment summary', async () => {
  const bookings = [{ id: 'A-ticket', lineUserId: 'A', tripId: 'trip' }, { id: 'B-ticket', lineUserId: 'B', tripId: 'trip' }];
  const anonymous = summaries(null);
  assert.equal((await anonymous.bookingPayments(bookings)).size, 0);
  assert.equal(anonymous.queryCount(), 0);
  const own = await summaries({ id: 'A' }).bookingPayments(bookings);
  assert.equal(own.get('A-ticket').remainingSatang, 50);
  assert.equal(own.has('B-ticket'), false);
});
test('seat transfers retain the debt; an inconsistent payment order ID cannot bind another account', async () => {
  const result = await summaries({ id: 'A' }).bookingPayments([
    { id: 'replacement', lineUserId: 'A', tripId: 'trip' },
    { id: 'wrong-order', lineUserId: 'A', tripId: 'trip', paymentOrderId: 'order-B' },
    { id: 'other-trip', lineUserId: 'A', tripId: 'another-trip' },
  ]);
  assert.equal(result.get('replacement').remainingSatang, 50);
  assert.equal(result.has('wrong-order'), false);
  assert.equal(result.has('other-trip'), false);
  assert.equal('userId' in result.get('replacement'), false);
  assert.equal('verificationReceivers' in result.get('replacement'), false);
});
test('only active staff with booking access can see payment summaries for all tickets', async () => {
  const bookings = [{ id: 'A-ticket', lineUserId: 'A', tripId: 'trip' }];
  assert.equal((await summaries({ id: 'staff', role: 'admin' }, { username: 'staff', permissions: [] }).bookingPayments(bookings)).size, 0);
  assert.equal((await summaries({ id: 'staff', role: 'admin' }, { username: 'admin', isBlocked: true }).bookingPayments(bookings)).size, 0);
  assert.equal((await summaries({ id: 'staff', role: 'admin' }, { username: 'staff', permissions: ['bookings'] }).bookingPayments(bookings)).size, 1);
});

const ticket = load('src/components/DigitalTicket.tsx', {
  'react': React, 'react/jsx-runtime': require('react/jsx-runtime'),
  'next/link': ({ href, children, ...props }) => React.createElement('a', { href, ...props }, children),
  'lucide-react': require('lucide-react'), 'qrcode.react': require('qrcode.react'),
  '@/lib/coverBase64': { coverBase64: 'data:image/png;base64,AAAA' }, '@/lib/ticketPayment': amounts,
}).default;
test('ticket renders outstanding amount over its check-in QR and links to the exact balance invoice', () => {
  const html = renderToStaticMarkup(React.createElement(ticket, { booking: { id: 'booking-A', tripName: 'Test trip', payment: amounts.ticketPayment(deposit) } }));
  assert.match(html, /ค้างชำระ/);
  assert.match(html, /฿0\.50/);
  assert.match(html, /\/payments\?orderId=order-A&amp;pay=balance/);
  assert.match(html, /เช็กอินก่อนขึ้นรถ/);
  assert.match(html, /ชำระให้ครบทั้งหมด/);
});
test('fully paid tickets remove the payment link; legacy tickets do not fabricate a payment status', () => {
  const paid = renderToStaticMarkup(React.createElement(ticket, { booking: { id: 'booking-A', payment: amounts.ticketPayment({ ...deposit, paidSatang: 100, status: 'paid' }) } }));
  assert.doesNotMatch(paid, /ชำระครบแล้ว|pay=balance|ค้างชำระ/);
  assert.match(paid, /เช็กอินก่อนขึ้นรถ/);
  const legacy = renderToStaticMarkup(React.createElement(ticket, { booking: { id: 'legacy' } }));
  assert.doesNotMatch(legacy, /ชำระครบแล้ว|ค้างชำระ|pay=balance/);
});
