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

/**
 * Admin-only seat swap. Both seats must already belong to valid bookings in
 * the same trip. Keeping this separate from moveBookingSeat preserves the
 * existing free-seat move behavior.
 */
export async function swapBookingSeats(bookingId: string, targetVanId: string, targetSeatId: string, by: string) {
  const db = await getMongoDb();
  const bookings = db.collection<BookingDoc>('bookings');
  const vans = db.collection<VanDoc>('vans');
  const source = await bookings.findOne({ id: bookingId });
  if (!source) throw new Error('ไม่พบรายการจอง');
  if (!['approved', 'pending'].includes(source.status)) throw new Error('สลับได้เฉพาะรายการที่อนุมัติแล้วหรือรออนุมัติ');

  const [targetVan, sourceVan] = await Promise.all([
    vans.findOne({ id: targetVanId, tripId: source.tripId }),
    vans.findOne({ id: source.vanId }),
  ]);
  const sourceSeat = sourceVan?.seats?.find(seat => seat.id === source.seatId && seat.bookingId === source.id);
  const targetSeat = targetVan?.seats?.find(seat => seat.id === targetSeatId);
  if (!sourceVan || !sourceSeat) throw new Error('ไม่พบที่นั่งเดิมของรายการจอง');
  if (!targetVan) throw new Error('ไม่พบรถปลายทางในทริปเดียวกัน');
  if (!targetSeat || !['customer', 'staff'].includes(targetSeat.type)) throw new Error('ที่นั่งปลายทางไม่สามารถใช้งานได้');
  if (!targetSeat.bookingId || targetSeat.bookingId === source.id) throw new Error('กรุณาเลือกที่นั่งที่มีลูกค้าอยู่เพื่อสลับ');
  if (source.vanId === targetVanId && source.seatId === targetSeatId) throw new Error('เป็นที่นั่งเดิมอยู่แล้ว');

  const target = await bookings.findOne({ id: targetSeat.bookingId });
  if (!target || !['approved', 'pending'].includes(target.status)) throw new Error('ไม่พบรายการจองของที่นั่งปลายทาง');
  if (target.tripId !== source.tripId || target.vanId !== targetVanId || target.seatId !== targetSeatId) throw new Error('ข้อมูลที่นั่งปลายทางไม่ตรงกับรายการจอง');

  const sourcePrevious: SeatSnapshot = { vanId: source.vanId, seatId: source.seatId, seatLabel: source.seatLabel || '', ...(typeof sourceVan.vanNumber === 'number' ? { vanNumber: sourceVan.vanNumber } : {}) };
  const targetPrevious: SeatSnapshot = { vanId: target.vanId, seatId: target.seatId, seatLabel: target.seatLabel || '', ...(typeof targetVan.vanNumber === 'number' ? { vanNumber: targetVan.vanNumber } : {}) };
  const sourceUpdated = { ...source, vanId: targetVanId, seatId: targetSeat.id, seatLabel: targetSeat.label };
  const targetUpdated = { ...target, vanId: source.vanId, seatId: source.seatId, seatLabel: sourceSeat.label };
  const sourceSeatStatus = source.status === 'pending' ? 'pending' : 'booked';
  const targetSeatStatus = target.status === 'pending' ? 'pending' : 'booked';

  const updatedSourceVan = (sourceVan.seats || []).map(seat => seat.id === sourceSeat.id ? { ...seat, status: targetSeatStatus, bookingId: target.id } : seat);
  const updatedTargetVan = sourceVan.id === targetVan.id ? updatedSourceVan.map(seat => seat.id === targetSeat.id ? { ...seat, status: sourceSeatStatus, bookingId: source.id } : seat) : (targetVan.seats || []).map(seat => seat.id === targetSeat.id ? { ...seat, status: sourceSeatStatus, bookingId: source.id } : seat);
  if (sourceVan.id === targetVan.id) {
    await vans.updateOne({ id: sourceVan.id, 'seats.id': sourceSeat.id, 'seats.bookingId': source.id, 'seats': { $elemMatch: { id: targetSeat.id, bookingId: target.id } } }, { $set: { seats: updatedTargetVan } });
  } else {
    await vans.updateOne({ id: sourceVan.id, 'seats': { $elemMatch: { id: sourceSeat.id, bookingId: source.id } } }, { $set: { seats: updatedSourceVan } });
    await vans.updateOne({ id: targetVan.id, 'seats': { $elemMatch: { id: targetSeat.id, bookingId: target.id } } }, { $set: { seats: updatedTargetVan } });
  }
  await bookings.updateOne({ id: source.id, vanId: source.vanId, seatId: source.seatId }, { $set: { vanId: sourceUpdated.vanId, seatId: sourceUpdated.seatId, seatLabel: sourceUpdated.seatLabel } });
  await bookings.updateOne({ id: target.id, vanId: target.vanId, seatId: target.seatId }, { $set: { vanId: targetUpdated.vanId, seatId: targetUpdated.seatId, seatLabel: targetUpdated.seatLabel } });
  const [sourcePaymentsUpdated, targetPaymentsUpdated] = await Promise.all([
    syncPaymentSeat(sourceUpdated, sourcePrevious, by),
    syncPaymentSeat(targetUpdated, targetPrevious, by),
  ]);
  return { swapped: true, booking: sourceUpdated, otherBooking: targetUpdated, paymentsUpdated: sourcePaymentsUpdated + targetPaymentsUpdated };
}
