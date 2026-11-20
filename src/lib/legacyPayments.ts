import { randomUUID } from 'node:crypto';
import { dataStore } from './dataStore';
import { paymentDb, type PaymentOrder } from './paymentStore';
import { toSatang } from './paymentRules';

export type LegacyPaymentMethod = 'bank_transfer' | 'cash' | 'other';

export type LegacyPayment = {
  id: string;
  bookingId: string;
  tripId: string;
  userId: string;
  amountSatang: number;
  paidAt: number;
  method: LegacyPaymentMethod;
  note?: string;
  receiptKey?: string;
  receiptContentType?: string;
  createdAt: number;
  createdBy: string;
};

export type LegacyBookingCandidate = {
  bookingId: string;
  tripId: string;
  tripName: string;
  departureDate: string;
  fullName: string;
  nickname: string;
  phone: string;
  lineUserId: string;
  lineUserName: string;
  seatLabel: string;
  seatType: 'driver' | 'staff' | 'customer' | 'unknown';
  vanNumber: number | null;
  totalSatang: number;
  manualPaidSatang: number;
  systemPaidSatang: number;
  balanceSatang: number;
  paymentOrderId?: string;
  paymentExempt?: boolean;
  payments: Pick<LegacyPayment, 'id' | 'amountSatang' | 'paidAt' | 'method' | 'note' | 'receiptKey'>[];
};

let indexes: Promise<unknown> | undefined;

async function ensureIndexes() {
  indexes ??= (async () => {
    const db = await paymentDb();
    await Promise.all([
      db.collection<LegacyPayment>('legacyPayments').createIndex({ id: 1 }, { unique: true }),
      db.collection<LegacyPayment>('legacyPayments').createIndex({ bookingId: 1, paidAt: 1 }),
      db.collection<LegacyPayment>('legacyPayments').createIndex({ tripId: 1, userId: 1 }),
    ]);
  })().catch(error => { indexes = undefined; throw error; });
  await indexes;
}

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : 0;
}

function statusFor(totalSatang: number, paidSatang: number): PaymentOrder['status'] {
  return paidSatang >= totalSatang ? 'paid' : paidSatang > 0 ? 'deposit_paid' : 'pending';
}

export async function loadLegacyPayments(bookingIds: string[]) {
  if (!bookingIds.length) return [] as LegacyPayment[];
  await ensureIndexes();
  return (await (await paymentDb()).collection<LegacyPayment>('legacyPayments').find({ bookingId: { $in: bookingIds } }, { projection: { _id: 0 } }).sort({ paidAt: 1 }).toArray());
}

export async function setLegacyBookingPaymentExempt(bookingId: string, exempt: boolean) {
  const { error } = await dataStore.from('bookings').update({ paymentExempt: exempt }).eq('id', bookingId);
  if (error) throw new Error(error.message);
}

export async function listLegacyBookingCandidates(options: { q?: string; tripId?: string; page?: number; pageSize?: number } = {}) {
  await ensureIndexes();
  const db = await paymentDb();
  const page = Math.max(1, Math.floor(options.page || 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(options.pageSize || 20)));
  const activeTrips = await db.collection('trips').find({ status: 'active', cost: { $gt: 0 } }, { projection: { _id: 0, id: 1, name: 1, cost: 1, departureDate: 1 } }).toArray();
  const tripMap = new Map(activeTrips.map(trip => [String(trip.id), trip]));
  const tripIds = activeTrips.map(trip => String(trip.id)).filter(id => !options.tripId || options.tripId === 'all' || id === options.tripId);
  if (!tripIds.length) return { rows: [] as LegacyBookingCandidate[], total: 0, page, pageSize, pageCount: 1 };
  const filter: Record<string, unknown> = { tripId: { $in: tripIds }, status: { $in: ['approved', 'pending', 'cancel_pending'] } };
  const q = options.q?.trim();
  if (q) {
    const pattern = { $regex: q.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    filter.$or = [{ fullName: pattern }, { nickname: pattern }, { phone: pattern }, { lineUserName: pattern }];
  }
  const bookingsCollection = db.collection('bookings');
  const [bookings, total] = await Promise.all([
    bookingsCollection.find(filter, { projection: { _id: 0, id: 1, tripId: 1, vanId: 1, seatLabel: 1, fullName: 1, nickname: 1, phone: 1, lineUserId: 1, lineUserName: 1, paymentOrderId: 1, paymentExempt: 1 } }).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    bookingsCollection.countDocuments(filter),
  ]);
  const bookingIds = bookings.map(booking => String(booking.id));
  const orderIds = bookings.map(booking => booking.paymentOrderId).filter(Boolean);
  const [legacy, orders, vans] = await Promise.all([
    loadLegacyPayments(bookingIds),
    orderIds.length ? db.collection<PaymentOrder>('paymentOrders').find({ id: { $in: orderIds } }, { projection: { _id: 0, id: 1, paidSatang: 1 } }).toArray() : [],
    db.collection('vans').find({ id: { $in: bookings.map(booking => booking.vanId).filter(Boolean) } }, { projection: { _id: 0, id: 1, vanNumber: 1, seats: 1 } }).toArray(),
  ]);
  const legacyByBooking = new Map<string, LegacyPayment[]>();
  for (const payment of legacy) legacyByBooking.set(payment.bookingId, [...(legacyByBooking.get(payment.bookingId) || []), payment]);
  const orderById = new Map<string, { id: string; paidSatang?: number }>(orders.map(order => [String(order.id), order] as [string, { id: string; paidSatang?: number }]));
  const vanById = new Map<string, { vanNumber?: number; seats?: { id?: string; type?: string }[] }>();
  for (const van of vans) vanById.set(String(van.id), van as { vanNumber?: number; seats?: { id?: string; type?: string }[] });
  const rows = bookings.map(booking => {
    const trip = tripMap.get(String(booking.tripId));
    const van = vanById.get(String(booking.vanId));
    const seatType = (van?.seats?.find(seat => seat.id === booking.seatId)?.type || 'unknown') as LegacyBookingCandidate['seatType'];
    const paymentExempt = booking.paymentExempt === true || seatType === 'staff' || seatType === 'driver';
    const totalSatang = paymentExempt ? 0 : toSatang(trip?.cost);
    const manualPaidSatang = (legacyByBooking.get(String(booking.id)) || []).reduce((sum, payment) => sum + safeNumber(payment.amountSatang), 0);
    const systemPaidSatang = Math.max(0, safeNumber(orderById.get(String(booking.paymentOrderId || ''))?.paidSatang) - manualPaidSatang);
    return {
      bookingId: String(booking.id), tripId: String(booking.tripId), tripName: String(trip?.name || ''), departureDate: String(trip?.departureDate || ''),
      fullName: String(booking.fullName || ''), nickname: String(booking.nickname || ''), phone: String(booking.phone || ''), lineUserId: String(booking.lineUserId || ''), lineUserName: String(booking.lineUserName || ''),
      seatLabel: String(booking.seatLabel || ''), seatType, vanNumber: van?.vanNumber ?? null, totalSatang, manualPaidSatang, systemPaidSatang,
      balanceSatang: Math.max(0, totalSatang - manualPaidSatang - systemPaidSatang), paymentOrderId: booking.paymentOrderId ? String(booking.paymentOrderId) : undefined, paymentExempt,
      payments: (legacyByBooking.get(String(booking.id)) || []).map(payment => ({ id: payment.id, amountSatang: payment.amountSatang, paidAt: payment.paidAt, method: payment.method, note: payment.note, receiptKey: payment.receiptKey })),
    };
  });
  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function recordLegacyPayment(input: { bookingId: string; amountBaht: unknown; paidAt?: unknown; method?: unknown; note?: unknown; receiptKey?: string; receiptContentType?: string }, createdBy: string) {
  await ensureIndexes();
  const db = await paymentDb();
  const booking = await db.collection('bookings').findOne({ id: input.bookingId }, { projection: { _id: 0 } });
  if (!booking) throw new Error('ไม่พบรายการจองที่นั่ง');
  if (!booking.lineUserId) throw new Error('รายการจองนี้ยังไม่ได้ผูกกับบัญชี LINE ของลูกค้า');
  const trip = await db.collection('trips').findOne({ id: booking.tripId, status: 'active' }, { projection: { _id: 0, id: 1, name: 1, cost: 1, departureDate: 1, departureTime: 1 } });
  if (!trip) throw new Error('ทริปนี้ปิดแล้วหรือไม่พบข้อมูลทริป');
  const van = await db.collection('vans').findOne({ id: booking.vanId, tripId: booking.tripId }, { projection: { _id: 0, seats: 1 } });
  const seat = (van?.seats as { id?: string; type?: string }[] | undefined)?.find(item => item.id === booking.seatId);
  if (seat?.type === 'staff' || seat?.type === 'driver') throw new Error('ที่นั่ง Staff/คนขับไม่ต้องบันทึกยอดชำระ');
  const amountSatang = toSatang(input.amountBaht);
  const totalSatang = toSatang(trip.cost);
  const currentOrder = booking.paymentOrderId ? await db.collection<PaymentOrder>('paymentOrders').findOne({ id: booking.paymentOrderId }) : await db.collection<PaymentOrder>('paymentOrders').findOne({ bookingId: booking.id });
  const existingPaid = safeNumber(currentOrder?.paidSatang);
  if (existingPaid + amountSatang > totalSatang) throw new Error('ยอดชำระรวมจะเกินราคาทริป');
  const paidAtNumber = input.paidAt ? Date.parse(String(input.paidAt)) : Date.now();
  if (!Number.isFinite(paidAtNumber)) throw new Error('วันที่ชำระเงินไม่ถูกต้อง');
  const method = input.method === 'cash' || input.method === 'other' ? input.method : 'bank_transfer';
  const now = Date.now();
  const payment: LegacyPayment = { id: randomUUID(), bookingId: String(booking.id), tripId: String(booking.tripId), userId: String(booking.lineUserId), amountSatang, paidAt: paidAtNumber, method, note: typeof input.note === 'string' ? input.note.trim().slice(0, 500) : '', ...(input.receiptKey ? { receiptKey: input.receiptKey, receiptContentType: input.receiptContentType } : {}), createdAt: now, createdBy };
  await db.collection<LegacyPayment>('legacyPayments').insertOne(payment);
  const paidSatang = existingPaid + amountSatang;
  const departureAt = Date.parse(`${String(trip.departureDate).slice(0, 10)}T${String(trip.departureTime || '00:00')}:00+07:00`);
  const orderId = currentOrder?.id || `legacy-${randomUUID()}`;
  const order: PaymentOrder = currentOrder || {
    id: orderId, userId: String(booking.lineUserId), tripId: String(booking.tripId), tripName: String(trip.name || ''), userName: String(booking.lineUserName || ''),
    plan: 'full', totalSatang, paidSatang: 0, amountSatang: 0, balanceDueAt: Number.isFinite(departureAt) ? departureAt - 7 * 86_400_000 : now, departureAt: Number.isFinite(departureAt) ? departureAt : now,
    createdAt: now, expiresAt: Number.isFinite(departureAt) ? departureAt : now, checkoutCreatedAt: now, status: 'pending', bookingId: String(booking.id), legacyPayment: true,
  };
  if (currentOrder) {
    const updated = await db.collection<PaymentOrder>('paymentOrders').findOneAndUpdate({ id: currentOrder.id, paidSatang: existingPaid, totalSatang }, { $inc: { paidSatang: amountSatang }, $set: { status: statusFor(totalSatang, paidSatang), legacyPayment: true, amountSatang: 0 }, $unset: { qrCode: '', verificationReceivers: '' } }, { returnDocument: 'after', projection: { _id: 0 } });
    if (!updated) throw new Error('รายการชำระเงินถูกแก้ไขพร้อมกัน กรุณาโหลดใหม่');
  } else {
    order.paidSatang = paidSatang; order.status = statusFor(totalSatang, paidSatang);
    await db.collection<PaymentOrder>('paymentOrders').insertOne(order);
    await db.collection('bookings').updateOne({ id: booking.id, paymentOrderId: { $exists: false } }, { $set: { paymentOrderId: orderId } });
  }
  return { payment, order: await db.collection<PaymentOrder>('paymentOrders').findOne({ id: orderId }) };
}

export async function updateLegacyPayment(id: string, input: { amountBaht: unknown; paidAt?: unknown; method?: unknown; note?: unknown }, updatedBy: string, remove = false) {
  await ensureIndexes();
  const db = await paymentDb();
  const payments = db.collection<LegacyPayment>('legacyPayments');
  const current = await payments.findOne({ id });
  if (!current) throw new Error('ไม่พบรายการชำระเดิม');
  const order = await db.collection<PaymentOrder>('paymentOrders').findOne({ bookingId: current.bookingId });
  const trip = await db.collection('trips').findOne({ id: current.tripId, status: 'active' }, { projection: { _id: 0, cost: 1 } });
  if (!trip) throw new Error('ทริปนี้ปิดแล้ว ไม่สามารถแก้ไขยอดได้');
  const totalSatang = toSatang(trip.cost);
  const others = await payments.find({ bookingId: current.bookingId, id: { $ne: id } }).toArray();
  const manualOthers = others.reduce((sum, payment) => sum + payment.amountSatang, 0);
  const systemPaid = Math.max(0, safeNumber(order?.paidSatang) - current.amountSatang - manualOthers);
  if (remove) {
    await payments.deleteOne({ id });
  } else {
    const amountSatang = toSatang(input.amountBaht);
    if (systemPaid + manualOthers + amountSatang > totalSatang) throw new Error('ยอดชำระรวมจะเกินราคาทริป');
    const paidAt = input.paidAt ? Date.parse(String(input.paidAt)) : current.paidAt;
    if (!Number.isFinite(paidAt)) throw new Error('วันที่ชำระเงินไม่ถูกต้อง');
    const method = input.method === 'cash' || input.method === 'other' ? input.method : 'bank_transfer';
    await payments.updateOne({ id }, { $set: { amountSatang, paidAt, method, note: typeof input.note === 'string' ? input.note.trim().slice(0, 500) : '', updatedAt: Date.now(), updatedBy } });
  }
  const manualTotal = remove ? manualOthers : manualOthers + toSatang(input.amountBaht);
  const paidTotal = systemPaid + manualTotal;
  if (order) {
    if (paidTotal === 0 && order.legacyPayment && !(await db.collection('paymentReceipts').findOne({ orderId: order.id }))) {
      await db.collection<PaymentOrder>('paymentOrders').deleteOne({ id: order.id });
      await db.collection('bookings').updateOne({ id: current.bookingId, paymentOrderId: order.id }, { $unset: { paymentOrderId: '' } });
    } else {
      await db.collection<PaymentOrder>('paymentOrders').updateOne({ id: order.id, paidSatang: order.paidSatang }, { $set: { paidSatang: paidTotal, status: statusFor(totalSatang, paidTotal), amountSatang: 0 } });
    }
  }
  return { bookingId: current.bookingId, paidSatang: paidTotal, balanceSatang: Math.max(0, totalSatang - paidTotal) };
}
