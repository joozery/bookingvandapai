import { paymentDb, type PaymentOrder, type PaymentReceipt } from './paymentStore';
import { paymentState, PAYMENT_STATE_LABELS, toSatang, type PaymentState } from './paymentRules';

/** One customer payment order as shown in the admin payment history. */
export type AdminPaymentRow = {
  id: string; tripId: string; tripName: string; departureAt: number; balanceDueAt: number; createdAt: number;
  plan: 'deposit' | 'full'; state: PaymentState; stateLabel: string;
  totalSatang: number; paidSatang: number; balanceSatang: number; openInvoiceSatang: number;
  userId: string; userName: string;
  booking: { id: string; fullName: string; nickname: string; phone: string; seatLabel: string; vanNumber: number | null; status: string } | null;
  receipts: { transRef: string; paidAt: number; recordedAt: number; amountSatang: number; payerName: string; payerBank: string; registrantName: string; seatLabel: string; reviewRequired: boolean }[];
  adjustments: NonNullable<PaymentOrder['adjustments']>;
  seatHistory: NonNullable<PaymentOrder['seatHistory']>;
  lastVerification: { code: string; message: string; checkedAt: number } | null;
};

export async function loadAdminPayments(now = Date.now()): Promise<AdminPaymentRow[]> {
  const db = await paymentDb();
  const orders = await db.collection<PaymentOrder>('paymentOrders').find({}, {
    // Never expose QR payloads, verification tokens/receivers or claim copies.
    projection: { _id: 0, qrCode: 0, verifyToken: 0, verificationReceivers: 0, bookingClaim: 0, appliedReceipts: 0 },
  }).sort({ createdAt: -1 }).toArray();
  if (!orders.length) return [];
  const orderIds = orders.map(order => order.id);
  const bookingIds = orders.map(order => order.bookingId).filter((id): id is string => !!id);
  const [receipts, bookings] = await Promise.all([
    db.collection<PaymentReceipt>('paymentReceipts').find({ orderId: { $in: orderIds } }, { projection: { _id: 0 } }).sort({ paidAt: 1 }).toArray(),
    db.collection('bookings').find(
      { $or: [{ id: { $in: bookingIds } }, { paymentOrderId: { $in: orderIds } }] },
      { projection: { _id: 0, id: 1, paymentOrderId: 1, fullName: 1, nickname: 1, phone: 1, seatLabel: 1, vanId: 1, status: 1 } },
    ).toArray(),
  ]);
  const vanIds = [...new Set(bookings.map(booking => booking.vanId).filter(Boolean))];
  const vans = vanIds.length ? await db.collection('vans').find({ id: { $in: vanIds } }, { projection: { _id: 0, id: 1, vanNumber: 1 } }).toArray() : [];
  const vanNumber = new Map(vans.map(van => [van.id, typeof van.vanNumber === 'number' ? van.vanNumber : null]));
  const bookingById = new Map(bookings.map(booking => [booking.id, booking]));
  const bookingByOrder = new Map(bookings.filter(booking => booking.paymentOrderId).map(booking => [booking.paymentOrderId, booking]));
  const receiptsByOrder = new Map<string, PaymentReceipt[]>();
  for (const receipt of receipts) receiptsByOrder.set(receipt.orderId, [...(receiptsByOrder.get(receipt.orderId) || []), receipt]);

  return orders.map(order => {
    const booking = (order.bookingId && bookingById.get(order.bookingId)) || bookingByOrder.get(order.id) || null;
    const state = paymentState(order, now);
    return {
      id: order.id, tripId: order.tripId, tripName: order.tripName, departureAt: order.departureAt, balanceDueAt: order.balanceDueAt, createdAt: order.createdAt,
      plan: order.plan, state, stateLabel: PAYMENT_STATE_LABELS[state],
      totalSatang: order.totalSatang, paidSatang: order.paidSatang,
      balanceSatang: Math.max(0, order.totalSatang - order.paidSatang),
      openInvoiceSatang: order.amountSatang || 0,
      userId: order.userId, userName: order.userName || '',
      booking: booking ? {
        id: String(booking.id), fullName: String(booking.fullName || ''), nickname: String(booking.nickname || ''), phone: String(booking.phone || ''),
        seatLabel: String(booking.seatLabel || order.seat?.seatLabel || ''), vanNumber: vanNumber.get(booking.vanId) ?? order.seat?.vanNumber ?? null, status: String(booking.status || ''),
      } : null,
      receipts: (receiptsByOrder.get(order.id) || []).map(receipt => ({
        transRef: receipt.transRef, paidAt: receipt.paidAt, recordedAt: receipt.recordedAt, amountSatang: receipt.amountSatang,
        payerName: receipt.payerName || '', payerBank: receipt.payerBank || '', registrantName: receipt.registrantName || '',
        seatLabel: receipt.seatLabel || '', reviewRequired: !!receipt.reviewRequired,
      })),
      adjustments: order.adjustments || [],
      seatHistory: order.seatHistory || [],
      lastVerification: order.lastVerification ? { code: order.lastVerification.code, message: order.lastVerification.message, checkedAt: order.lastVerification.checkedAt } : null,
    };
  });
}

export type PaymentFilter = { q?: string; tripId?: string; state?: string };

/** Search across customer, LINE name, phone, seat, trip, order ID and transfer reference. */
export function filterPayments(rows: AdminPaymentRow[], filter: PaymentFilter): AdminPaymentRow[] {
  const q = (filter.q || '').trim().toLowerCase();
  return rows.filter(row => {
    if (filter.tripId && filter.tripId !== 'all' && row.tripId !== filter.tripId) return false;
    if (filter.state && filter.state !== 'all') {
      // "active" hides abandoned checkouts that never received money.
      if (filter.state === 'active' ? row.state === 'lapsed' : row.state !== filter.state) return false;
    }
    if (!q) return true;
    const haystack = [
      row.id, row.tripName, row.userName, row.booking?.fullName, row.booking?.nickname, row.booking?.phone, row.booking?.seatLabel,
      ...row.receipts.flatMap(receipt => [receipt.transRef, receipt.payerName, receipt.registrantName]),
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

/**
 * Changes the amount a customer owes on one order (e.g. a discount or extra
 * charge). The balance is recalculated from the verified paid amount. Only
 * orders that have already received a verified payment can be changed, and
 * never while a slip is being verified. An unpaid balance QR is withdrawn so
 * the customer is asked for the new amount.
 */
export async function adjustOrderTotal(orderId: string, totalBaht: unknown, note: unknown, by: string) {
  const totalSatang = toSatang(totalBaht);
  const reason = typeof note === 'string' ? note.trim().slice(0, 300) : '';
  if (!reason) throw new Error('กรุณาระบุเหตุผลในการแก้ไขยอด');
  const orders = (await paymentDb()).collection<PaymentOrder>('paymentOrders');
  const order = await orders.findOne({ id: orderId });
  if (!order) throw new Error('ไม่พบรายการชำระเงิน');
  if (!['deposit_paid', 'paid'].includes(order.status)) throw new Error('แก้ยอดได้หลังลูกค้าชำระงวดแรกและตรวจสลิปผ่านแล้วเท่านั้น');
  if (totalSatang < order.paidSatang) throw new Error(`ยอดใหม่ต้องไม่น้อยกว่ายอดที่ชำระแล้ว ฿${(order.paidSatang / 100).toLocaleString('th-TH')}`);
  if (totalSatang === order.totalSatang) throw new Error('ยอดใหม่เท่ากับยอดเดิม');
  const now = Date.now();
  const updated = await orders.findOneAndUpdate(
    {
      id: orderId, totalSatang: order.totalSatang, paidSatang: order.paidSatang, status: { $in: ['deposit_paid', 'paid'] },
      $or: [{ verifyUntil: { $exists: false } }, { verifyUntil: { $lt: now } }],
    },
    {
      $set: { totalSatang, status: totalSatang === order.paidSatang ? 'paid' : 'deposit_paid', amountSatang: 0 },
      $unset: { qrCode: '', verificationReceivers: '' },
      $push: { adjustments: { fromSatang: order.totalSatang, toSatang: totalSatang, note: reason, by, at: now } },
    },
    { returnDocument: 'after', projection: { _id: 0 } },
  );
  if (!updated) throw new Error('ลูกค้ากำลังส่งสลิปหรือรายการเพิ่งเปลี่ยน กรุณาโหลดใหม่แล้วลองอีกครั้ง');
  return updated;
}
