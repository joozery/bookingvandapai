import { getMongoDb } from './mongodb';
import type { PaymentOrder, SeatSnapshot } from './paymentStore';

type SeatDoc = { id: string; label: string; type: string; status: string; bookingId?: string | null };
type VanDoc = { id: string; tripId: string; vanNumber?: number; seats?: SeatDoc[] };
type BookingDoc = { id: string; tripId: string; vanId: string; seatId: string; seatLabel?: string; status: string; paymentOrderId?: string };

/**
 * Points every payment order of `booking` (by bound booking ID or by the
 * booking's paymentOrderId) at its current seat and appends to seat history.
 */
export async function syncPaymentSeat(booking: BookingDoc, previous: SeatSnapshot | undefined, by: string, formerBookingId?: string) {
  const db = await getMongoDb();
  const van = await db.collection<VanDoc>('vans').findOne({ id: booking.vanId }, { projection: { vanNumber: 1 } });
  const seat: SeatSnapshot = { vanId: booking.vanId, seatId: booking.seatId, seatLabel: booking.seatLabel || '', ...(typeof van?.vanNumber === 'number' ? { vanNumber: van.vanNumber } : {}) };
  const match = [{ bookingId: booking.id }, ...(formerBookingId ? [{ bookingId: formerBookingId }] : []), ...(booking.paymentOrderId ? [{ id: booking.paymentOrderId }] : [])];
  const result = await db.collection<PaymentOrder>('paymentOrders').updateMany({ $or: match }, {
    $set: { bookingId: booking.id, seat },
    $push: { seatHistory: { ...seat, ...(previous ? { from: previous } : {}), movedAt: Date.now(), by } },
  });
  return result.modifiedCount;
}

/**
 * Admin seat move. Claims the target seat atomically (it must be available and
 * bookable), moves the booking, frees the old seat and updates any payment
 * order for that booking. The booking ID is unchanged, so tickets, check-in QR
 * codes and payment links keep working.
 */
export async function moveBookingSeat(bookingId: string, vanId: string, seatId: string, by: string) {
  const db = await getMongoDb();
  const bookings = db.collection<BookingDoc>('bookings');
  const vans = db.collection<VanDoc>('vans');
  const booking = await bookings.findOne({ id: bookingId });
  if (!booking) throw new Error('ไม่พบรายการจอง');
  if (!['approved', 'pending'].includes(booking.status)) throw new Error('ย้ายได้เฉพาะรายการที่อนุมัติแล้วหรือรออนุมัติ');
  if (booking.vanId === vanId && booking.seatId === seatId) throw new Error('เป็นที่นั่งเดิมอยู่แล้ว');

  const [targetVan, oldVan] = await Promise.all([vans.findOne({ id: vanId, tripId: booking.tripId }), vans.findOne({ id: booking.vanId })]);
  if (!targetVan) throw new Error('ไม่พบรถคันนี้ในทริปเดียวกัน');
  const target = targetVan.seats?.find(seat => seat.id === seatId);
  if (!target || !['customer', 'staff'].includes(target.type)) throw new Error('ที่นั่งนี้ไม่สามารถจองได้');
  if (target.status !== 'available' || target.bookingId) throw new Error('ที่นั่งนี้ไม่ว่าง');
  const oldSeat = oldVan?.seats?.find(seat => seat.id === booking.seatId && seat.bookingId === booking.id);
  const seatStatus = oldSeat?.status === 'pending' ? 'pending' : 'booked';

  // 1. Claim the new seat only if it is still free.
  const claimed = await vans.updateOne(
    { id: vanId, seats: { $elemMatch: { id: seatId, status: 'available', type: { $in: ['customer', 'staff'] }, bookingId: { $in: [null] } } } },
    { $set: { 'seats.$.status': seatStatus, 'seats.$.bookingId': booking.id } },
  );
  if (claimed.modifiedCount !== 1) throw new Error('ที่นั่งนี้เพิ่งถูกจองไป กรุณาเลือกที่นั่งอื่น');

  // 2. Move the booking, only if nobody else moved it meanwhile.
  const moved = await bookings.updateOne({ id: booking.id, vanId: booking.vanId, seatId: booking.seatId }, { $set: { vanId, seatId, seatLabel: target.label } });
  if (moved.modifiedCount !== 1) {
    await vans.updateOne({ id: vanId, seats: { $elemMatch: { id: seatId, bookingId: booking.id } } }, { $set: { 'seats.$.status': 'available', 'seats.$.bookingId': null } });
    throw new Error('รายการจองเพิ่งถูกเปลี่ยน กรุณาโหลดใหม่แล้วลองอีกครั้ง');
  }

  // 3. Free the old seat (only if it still belongs to this booking).
  await vans.updateOne({ id: booking.vanId, seats: { $elemMatch: { id: booking.seatId, bookingId: booking.id } } }, { $set: { 'seats.$.status': 'available', 'seats.$.bookingId': null } });

  // 4. Keep the payment record's seat in step with the booking.
  const previous: SeatSnapshot = { vanId: booking.vanId, seatId: booking.seatId, seatLabel: booking.seatLabel || '', ...(typeof oldVan?.vanNumber === 'number' ? { vanNumber: oldVan.vanNumber } : {}) };
  const updated = { ...booking, vanId, seatId, seatLabel: target.label };
  const paymentsUpdated = await syncPaymentSeat(updated, previous, by);
  return { booking: updated, from: previous, paymentsUpdated };
}
