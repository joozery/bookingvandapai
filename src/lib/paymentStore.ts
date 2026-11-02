import { randomUUID } from 'node:crypto';
import { getMongoDb } from './mongodb';
import { HOLD_MS, paymentQuote, type PaymentReceiver } from './paymentRules';
import { countAvailableSeats } from './seatAvailability';

type BookingRecord = Record<string, unknown> & { id: string; tripId: string; vanId: string; seatId: string; lineUserId: string; paymentOrderId: string };
type BookingClaim = { id: string; booking: BookingRecord };
export type SeatSnapshot = { vanId: string; seatId: string; seatLabel: string; vanNumber?: number };
export type PaymentOrder = {
  id: string; userId: string; tripId: string; tripName: string;
  /** LINE display name when the order was created. */
  userName?: string;
  /** Current seat of the booking paid by this order (kept in sync on moves). */
  seat?: SeatSnapshot;
  seatHistory?: (SeatSnapshot & { from?: SeatSnapshot; movedAt: number; by: string })[];
  adjustments?: { fromSatang: number; toSatang: number; note: string; by: string; at: number }[];
  plan: 'deposit' | 'full'; totalSatang: number; paidSatang: number;
  amountSatang: number; balanceDueAt: number; departureAt: number;
  createdAt: number; expiresAt: number; checkoutCreatedAt: number;
  status: 'pending' | 'deposit_paid' | 'paid' | 'expired';
  qrCode?: string; accountName?: string; bookingId?: string;
  verificationReceivers?: PaymentReceiver[];
  verifyToken?: string; verifyUntil?: number; nextAttemptAt?: number; attempts?: number;
  appliedReceipts?: string[]; bookingClaim?: BookingClaim; reviewRequired?: boolean; bookingError?: string;
  lastVerification?: { code: string; message: string; checkedAt: number; stage: string; providerReference?: string };
};
type CapacityHold = { orderId: string; userId: string; expiresAt: number; paid: boolean; order: PaymentOrder };
type Capacity = { _id: string; revision: number; holds: CapacityHold[] };
type VerifiedReceipt = {
  transactionKey: string; transRef: string; paidAt: number; providerReference: string;
  /** Details recorded with the payment for the admin history and reports. */
  payerName?: string; payerBank?: string; registrantName?: string; tripName?: string; seatLabel?: string;
};
export type PaymentReceipt = VerifiedReceipt & { id: string; orderId: string; userId: string; amountSatang: number; expectedPaidSatang: number; checkoutCreatedAt: number; recordedAt: number; applied?: boolean; reviewRequired?: boolean };
type Receipt = PaymentReceipt;
let indexPromise: Promise<unknown> | undefined;
const duplicate = (error: unknown) => (error as { code?: number })?.code === 11000;

export async function paymentDb() {
  const db = await getMongoDb();
  indexPromise ??= Promise.all([
    db.collection<PaymentOrder>('paymentOrders').createIndex({ id: 1 }, { unique: true }),
    db.collection<PaymentOrder>('paymentOrders').createIndex({ userId: 1, tripId: 1 }),
    db.collection('paymentReceipts').createIndex({ transactionKey: 1 }, { unique: true }),
    db.collection('paymentReceipts').createIndex({ orderId: 1, applied: 1 }),
    db.collection('bookings').createIndex({ paymentOrderId: 1 }, { unique: true, partialFilterExpression: { paymentOrderId: { $type: 'string' } } }),
  ]).catch(error => { indexPromise = undefined; throw error; });
  await indexPromise;
  return db;
}
export function publicOrder(order: PaymentOrder) {
  return {
    id: order.id, tripId: order.tripId, tripName: order.tripName, plan: order.plan,
    totalSatang: order.totalSatang, paidSatang: order.paidSatang, amountSatang: order.amountSatang,
    balanceDueAt: order.balanceDueAt, departureAt: order.departureAt, createdAt: order.createdAt,
    expiresAt: order.expiresAt, checkoutCreatedAt: order.checkoutCreatedAt, status: order.status,
    qrCode: order.qrCode, accountName: order.accountName, bookingId: order.bookingId,
    reviewRequired: order.reviewRequired, bookingError: order.bookingError,
    lastVerification: order.lastVerification && { code: order.lastVerification.code, message: order.lastVerification.message, checkedAt: order.lastVerification.checkedAt },
  };
}

async function capacityFor(tripId: string) {
  const db = await paymentDb();
  const collection = db.collection<Capacity>('paymentCapacity');
  const existing = await collection.findOne({ _id: tripId });
  if (existing) return existing;
  // Bootstrap older orders once, without changing their public order IDs.
  const orders = await db.collection<PaymentOrder>('paymentOrders').find({ tripId, bookingId: { $exists: false }, $or: [{ status: { $in: ['deposit_paid', 'paid'] } }, { status: 'pending', expiresAt: { $gt: Date.now() } }] }).toArray();
  const holds = orders.map(order => ({ orderId: order.id, userId: order.userId, expiresAt: order.expiresAt, paid: order.paidSatang > 0, order }));
  try { await collection.updateOne({ _id: tripId }, { $setOnInsert: { revision: 0, holds } }, { upsert: true }); }
  catch (error) { if (!duplicate(error)) throw error; }
  const result = await collection.findOne({ _id: tripId });
  if (!result) throw new Error('เตรียมข้อมูลกันที่ว่างไม่สำเร็จ กรุณาลองใหม่');
  return result;
}
async function replaceHolds(capacity: Capacity, holds: CapacityHold[]) {
  const result = await (await paymentDb()).collection<Capacity>('paymentCapacity').updateOne({ _id: capacity._id, revision: capacity.revision }, { $set: { holds }, $inc: { revision: 1 } });
  return result.modifiedCount === 1;
}
async function releaseHold(order: PaymentOrder) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const capacity = await capacityFor(order.tripId);
    if (!capacity.holds.some(hold => hold.orderId === order.id)) return;
    if (await replaceHolds(capacity, capacity.holds.filter(hold => hold.orderId !== order.id))) return;
  }
  throw new Error('กำลังปรับปรุงที่ว่าง กรุณาลองใหม่');
}
async function retainPaidHold(order: PaymentOrder): Promise<boolean> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const capacity = await capacityFor(order.tripId);
    const hold = capacity.holds.find(item => item.orderId === order.id);
    if (!hold || (!hold.paid && hold.expiresAt <= Date.now())) return false;
    if (hold.paid) return true;
    if (await replaceHolds(capacity, capacity.holds.map(item => item.orderId === order.id ? { ...item, paid: true } : item))) return true;
  }
  throw new Error('กำลังยืนยันที่ว่าง กรุณาโหลดรายการเดิมอีกครั้ง');
}
async function persistOrder(order: PaymentOrder) {
  const collection = (await paymentDb()).collection<PaymentOrder>('paymentOrders');
  try { await collection.updateOne({ id: order.id }, { $setOnInsert: order }, { upsert: true }); }
  catch (error) { if (!duplicate(error)) throw error; }
  const saved = await collection.findOne({ id: order.id });
  if (!saved) throw new Error('บันทึกรายการไม่สำเร็จ กรุณาเปิดรายการเดิมอีกครั้ง');
  return saved;
}
export async function createPaymentOrder(userId: string, tripId: string, plan: 'deposit' | 'full', userName?: string | null) {
  const db = await paymentDb();
  const orders = db.collection<PaymentOrder>('paymentOrders');
  for (let attempt = 0; attempt < 30; attempt++) {
    const trip = await db.collection('trips').findOne({ id: tripId, status: 'active' });
    if (!trip) throw new Error('ไม่พบทริปที่เปิดจอง');
    const now = Date.now();
    const existing = await orders.findOne({ userId, tripId, $or: [{ status: { $in: ['deposit_paid', 'paid'] } }, { status: 'pending', expiresAt: { $gt: now } }] });
    if (existing) return await recoverPaymentOrder(userId, existing.id) || existing;
    // An incoming transfer may already have a durable receipt after a crash.
    const older = await orders.find({ userId, tripId }).toArray();
    for (const old of older) {
      const recovered = await recoverPaymentOrder(userId, old.id);
      if (recovered && recovered.paidSatang > 0) {
        if (recovered.status === 'expired') throw new Error('รายการโอนก่อนหน้ารอแอดมินตรวจสอบ กรุณาติดต่อแอดมินก่อนชำระเพิ่ม');
        return recovered;
      }
    }
    if (await db.collection('bookings').findOne({ lineUserId: userId, tripId, status: { $in: ['approved', 'pending', 'cancel_pending'] } })) throw new Error('คุณมีการจองทริปนี้แล้ว กรุณาดูตั๋วของฉัน');
    const quote = paymentQuote({ cost: trip.cost, depositAmount: trip.depositAmount, departureDate: trip.departureDate, departureTime: trip.departureTime }, plan, now);
    // Read this revision BEFORE van availability. A booking releases its hold
    // only AFTER claiming the physical seat, invalidating a stale capacity CAS.
    const capacity = await capacityFor(tripId);
    const holds = capacity.holds.filter(hold => hold.paid || hold.expiresAt > now);
    const own = holds.find(hold => hold.userId === userId);
    if (own) return persistOrder(own.order);
    const available = countAvailableSeats(await db.collection('vans').find({ tripId }).toArray()) ?? 0;
    if (available <= holds.length) throw new Error('ทริปนี้เต็มหรือมีผู้กำลังชำระเงิน กรุณาทักแชทแอดมิน');
    const order: PaymentOrder = { id: randomUUID(), userId, tripId, tripName: trip.name, ...(userName ? { userName: userName.slice(0, 120) } : {}), plan, ...quote, paidSatang: 0, createdAt: now, checkoutCreatedAt: now, expiresAt: Math.min(now + HOLD_MS, quote.departureAt), status: 'pending' };
    if (!await replaceHolds(capacity, [...holds, { orderId: order.id, userId, expiresAt: order.expiresAt, paid: false, order }])) continue;
    // The capacity document retains the complete initial order. A retry can
    // recreate this projection if the process stops before this write.
    return persistOrder(order);
  }
  throw new Error('มีผู้จองพร้อมกันหลายรายการ กรุณาลองใหม่');
}

async function applyReceipt(receipt: Receipt) {
  const db = await paymentDb(), orders = db.collection<PaymentOrder>('paymentOrders');
  const receipts = db.collection<Receipt>('paymentReceipts');
  for (let attempt = 0; attempt < 30; attempt++) {
    const current = await orders.findOne({ id: receipt.orderId, userId: receipt.userId });
    if (!current) throw new Error('ไม่พบรายการสำหรับยอดโอน กรุณาติดต่อแอดมิน');
    if (current.appliedReceipts?.includes(receipt.transactionKey)) {
      await receipts.updateOne({ transactionKey: receipt.transactionKey }, { $set: { applied: true, reviewRequired: current.status === 'expired' } });
      return current;
    }
    if (current.paidSatang !== receipt.expectedPaidSatang || current.amountSatang !== receipt.amountSatang || current.checkoutCreatedAt !== receipt.checkoutCreatedAt || current.paidSatang + receipt.amountSatang > current.totalSatang) {
      await receipts.updateOne({ transactionKey: receipt.transactionKey }, { $set: { applied: true, reviewRequired: true } });
      await orders.updateOne({ id: current.id }, { $set: { reviewRequired: true } });
      return { ...current, reviewRequired: true };
    }
    const expiredHold = current.paidSatang === 0 && !await retainPaidHold(current);
    const paidSatang = current.paidSatang + receipt.amountSatang;
    const status = expiredHold ? 'expired' : paidSatang === current.totalSatang ? 'paid' : 'deposit_paid';
    const updated = await orders.findOneAndUpdate({ id: current.id, paidSatang: receipt.expectedPaidSatang, amountSatang: receipt.amountSatang, checkoutCreatedAt: receipt.checkoutCreatedAt, appliedReceipts: { $ne: receipt.transactionKey } }, {
      $set: { paidSatang, status, amountSatang: 0, ...(expiredHold ? { reviewRequired: true } : {}) },
      $addToSet: { appliedReceipts: receipt.transactionKey },
      $unset: { verifyToken: '', verifyUntil: '', qrCode: '', verificationReceivers: '', lastVerification: '' },
    }, { returnDocument: 'after' });
    if (!updated) continue;
    await receipts.updateOne({ transactionKey: receipt.transactionKey }, { $set: { applied: true, reviewRequired: expiredHold } });
    return updated;
  }
  throw new Error('บันทึกยอดโอนค้างอยู่ กรุณาโหลดรายการเดิม ไม่ต้องโอนซ้ำ');
}
export async function creditPayment(order: PaymentOrder, token: string, verified: VerifiedReceipt) {
  const db = await paymentDb(), receipts = db.collection<Receipt>('paymentReceipts');
  let receipt: Receipt | null = await receipts.findOne({ transactionKey: verified.transactionKey });
  if (receipt && receipt.orderId !== order.id) throw new Error('สลิปนี้ถูกใช้ชำระเงินแล้ว');
  if (!receipt) {
    const current = await db.collection<PaymentOrder>('paymentOrders').findOne({ id: order.id, userId: order.userId, verifyToken: token });
    if (!current || current.amountSatang <= 0 || current.amountSatang !== order.amountSatang || current.paidSatang !== order.paidSatang || current.checkoutCreatedAt !== order.checkoutCreatedAt) throw new Error('รายการถูกปรับปรุงแล้ว กรุณาโหลดใหม่');
    receipt = { ...verified, id: randomUUID(), orderId: current.id, userId: current.userId, amountSatang: current.amountSatang, expectedPaidSatang: current.paidSatang, checkoutCreatedAt: current.checkoutCreatedAt, recordedAt: Date.now() };
    // Persist verified money FIRST. Recovery can finish crediting without
    // re-uploading the slip or calling the provider again.
    try { await receipts.insertOne(receipt); }
    catch (error) {
      if (!duplicate(error)) throw error;
      receipt = await receipts.findOne({ transactionKey: verified.transactionKey });
      if (!receipt || receipt.orderId !== order.id) throw new Error('สลิปนี้ถูกใช้ชำระเงินแล้ว');
    }
  }
  if (!receipt) throw new Error('บันทึกข้อมูลสลิปไม่สำเร็จ กรุณาโหลดรายการเดิม');
  if (receipt.userId !== order.userId) throw new Error('ไม่สามารถใช้สลิปของรายการอื่นได้');
  return applyReceipt(receipt);
}

async function finishBooking(order: PaymentOrder): Promise<BookingRecord | null> {
  const claim = order.bookingClaim;
  if (!claim) return null;
  const db = await paymentDb(), orders = db.collection<PaymentOrder>('paymentOrders');
  const booking = claim.booking;
  const ownsSeat = (van: Record<string, unknown> | null) => (van?.seats as { id: string; bookingId?: string }[] | undefined)?.some(seat => seat.id === booking.seatId && seat.bookingId === booking.id);
  let van = await db.collection('vans').findOneAndUpdate({ id: booking.vanId, tripId: order.tripId, rejectedPaymentClaims: { $ne: claim.id }, seats: { $elemMatch: { id: booking.seatId, status: 'available', type: { $in: ['customer', 'staff'] } } } }, { $set: { 'seats.$.status': 'booked', 'seats.$.bookingId': booking.id } }, { returnDocument: 'after' });
  if (!van) van = await db.collection('vans').findOne({ id: booking.vanId, tripId: order.tripId });
  if (!ownsSeat(van)) {
    // Permanently fence this failed claim on the same document used to claim
    // its seat. A paused old worker cannot acquire it after it becomes free.
    const fenced = await db.collection('vans').findOneAndUpdate({ id: booking.vanId, tripId: order.tripId, seats: { $not: { $elemMatch: { id: booking.seatId, bookingId: booking.id } } } }, { $addToSet: { rejectedPaymentClaims: claim.id } }, { returnDocument: 'after' });
    if (fenced) {
      await orders.updateOne({ id: order.id, 'bookingClaim.id': claim.id, bookingId: { $exists: false } }, { $unset: { bookingClaim: '' }, $set: { bookingError: 'ที่นั่งที่เลือกไม่ว่างแล้ว กรุณาเลือกที่นั่งอื่น ยอดชำระยังอยู่' } });
      return null;
    }
    van = await db.collection('vans').findOne({ id: booking.vanId, tripId: order.tripId });
    if (!ownsSeat(van)) throw new Error('ไม่สามารถยืนยันที่นั่งได้ กรุณาติดต่อแอดมิน ยอดชำระยังอยู่');
  }
  const current = await orders.findOne({ id: order.id, userId: order.userId });
  if (current?.bookingId) return await db.collection<BookingRecord>('bookings').findOne({ id: current.bookingId, lineUserId: order.userId });
  if (current?.bookingClaim?.id !== claim.id) return null;
  // Stable IDs and a unique paymentOrderId make retries safe after any crash.
  await db.collection<BookingRecord & { _id: string }>('bookings').updateOne({ _id: booking.id }, { $setOnInsert: booking }, { upsert: true });
  const seat: SeatSnapshot = { vanId: booking.vanId, seatId: booking.seatId, seatLabel: String(booking.seatLabel || ''), ...(typeof van?.vanNumber === 'number' ? { vanNumber: van.vanNumber } : {}) };
  const published = await orders.findOneAndUpdate({ id: order.id, 'bookingClaim.id': claim.id }, { $set: { bookingId: booking.id, seat }, $unset: { bookingClaim: '', bookingError: '' } }, { returnDocument: 'after' });
  if (published) await releaseHold(published);
  return booking;
}
export async function recoverPaymentOrder(userId: string, id: string) {
  const db = await paymentDb(), orders = db.collection<PaymentOrder>('paymentOrders');
  let order = await orders.findOne({ id, userId });
  if (!order) return null;
  const receipts = await db.collection<Receipt>('paymentReceipts').find({ orderId: id, userId, applied: { $ne: true } }).sort({ recordedAt: 1 }).toArray();
  for (const receipt of receipts) order = await applyReceipt(receipt);
  if (order.bookingClaim) {
    await finishBooking(order);
    order = await orders.findOne({ id, userId });
  }
  if (order?.bookingId) await releaseHold(order);
  return order;
}
export async function recoverPaymentOrders(userId: string) {
  const db = await paymentDb();
  // Repair initial order writes interrupted after their capacity CAS.
  const capacities = await db.collection<Capacity>('paymentCapacity').find({ 'holds.userId': userId }).toArray();
  for (const capacity of capacities) for (const hold of capacity.holds) {
    if (hold.userId === userId && (hold.paid || hold.expiresAt > Date.now())) await persistOrder(hold.order);
  }
  const orders = await db.collection<PaymentOrder>('paymentOrders').find({ userId }).sort({ createdAt: -1 }).limit(100).toArray();
  const result: PaymentOrder[] = [];
  for (const order of orders) {
    const recovered = await recoverPaymentOrder(userId, order.id);
    if (recovered) result.push(recovered);
  }
  return result;
}

type PaidBookingInput = { tripId: string; vanId: string; seatId: string; nickname: string; fullName: string; phone: string; note?: string };
export async function bookPaidSeat(userId: string, input: PaidBookingInput, user: { name?: string | null; image?: string | null }) {
  const db = await paymentDb(), orders = db.collection<PaymentOrder>('paymentOrders');
  const candidates = await orders.find({ userId, tripId: input.tripId }).sort({ createdAt: -1 }).toArray();
  let order: PaymentOrder | null = null;
  for (const candidate of candidates) {
    const recovered = await recoverPaymentOrder(userId, candidate.id);
    if (recovered && ['deposit_paid', 'paid'].includes(recovered.status)) { order = recovered; break; }
  }
  if (!order || !['deposit_paid', 'paid'].includes(order.status) || order.paidSatang <= 0) throw new Error('กรุณาชำระเงินและตรวจสลิปก่อนเลือกจองที่นั่ง');
  if (order.bookingId) {
    const existing = await db.collection<BookingRecord>('bookings').findOne({ id: order.bookingId, lineUserId: userId });
    if (existing) return existing;
    throw new Error('รายการนี้เคยจองที่นั่งแล้ว กรุณาติดต่อแอดมิน');
  }
  if (!await db.collection('trips').findOne({ id: input.tripId, status: 'active' })) throw new Error('ทริปนี้ไม่เปิดจอง');
  if (Date.now() >= order.departureAt) throw new Error('ทริปนี้ออกเดินทางแล้ว กรุณาติดต่อแอดมิน');
  const van = await db.collection('vans').findOne({ id: input.vanId, tripId: input.tripId });
  const seat = (van?.seats as { id: string; label: string; type: string; status: string }[] | undefined)?.find(value => value.id === input.seatId && ['customer', 'staff'].includes(value.type) && value.status === 'available');
  if (!seat) throw new Error('ที่นั่งนี้ไม่ว่างแล้ว กรุณาเลือกที่นั่งอื่น ยอดชำระยังอยู่');
  const profile = await db.collection('profiles').findOne({ lineUserId: userId });
  const booking: BookingRecord = {
    id: `booking-payment-${order.id}`, tripId: input.tripId, vanId: input.vanId, seatId: input.seatId, seatLabel: seat.label,
    nickname: input.nickname.trim(), fullName: input.fullName.trim(), phone: input.phone.trim(), note: input.note?.trim() || '',
    lineUserId: userId, lineUserName: user.name || '', lineUserProfilePic: user.image || '',
    status: 'approved', createdAt: new Date().toISOString(), checkedIn: false, checkedInAt: null, replacesBookingId: null, paymentOrderId: order.id,
    nationalId: profile?.nationalId || null, birthDate: profile?.birthDate || null, emergencyName: profile?.emergencyName || null, emergencyPhone: profile?.emergencyPhone || null, allergies: profile?.allergies || null, medicalConditions: profile?.medicalConditions || null,
  };
  const claimed = await orders.findOneAndUpdate({ id: order.id, userId, bookingId: { $exists: false }, bookingClaim: { $exists: false }, status: { $in: ['deposit_paid', 'paid'] } }, { $set: { bookingClaim: { id: randomUUID(), booking } }, $unset: { bookingError: '' } }, { returnDocument: 'after' });
  const active = claimed || await orders.findOne({ id: order.id, userId });
  if (active?.bookingId) return await db.collection<BookingRecord>('bookings').findOne({ id: active.bookingId, lineUserId: userId });
  const result = active && await finishBooking(active);
  if (!result) throw new Error('ที่นั่งนี้ไม่ว่างแล้ว กรุณาเลือกที่นั่งอื่น ยอดชำระยังอยู่');
  return result;
}
