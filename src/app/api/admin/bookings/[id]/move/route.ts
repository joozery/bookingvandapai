import { adminWith, forbidden } from '@/lib/adminAuth';
import { checkPaymentOrigin, paymentError } from '@/lib/paymentAuth';
import { moveBookingSeat, swapBookingSeats } from '@/lib/seatMove';
import { recordAudit } from '@/lib/audit';
import { getMongoDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/** Admin moves a passenger to another free seat; linked payments are updated too. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await adminWith(['bookings', 'vans']);
    if (!admin) return forbidden('ไม่มีสิทธิ์ย้ายที่นั่ง');
    checkPaymentOrigin(request);
    const { id } = await context.params;
    const body = await request.json();
    if (typeof body.vanId !== 'string' || typeof body.seatId !== 'string' || !body.vanId || !body.seatId) throw new Error('กรุณาเลือกรถและที่นั่งใหม่');
    const db = await getMongoDb();
    const targetVan = await db.collection('vans').findOne({ id: body.vanId }, { projection: { seats: 1 } });
    const targetSeat = targetVan?.seats?.find((seat: { id: string }) => seat.id === body.seatId);
    const result = targetSeat?.bookingId
      ? await swapBookingSeats(id, body.vanId, body.seatId, admin.name || admin.username)
      : await moveBookingSeat(id, body.vanId, body.seatId, admin.name || admin.username);
    const from = 'from' in result ? result.from : undefined;
    await recordAudit(admin, { action: 'update', resource: 'booking', resourceId: id, request,
      summary: 'swapped' in result && result.swapped
        ? `สลับที่นั่ง ${result.booking.seatLabel} ↔ ${result.otherBooking.seatLabel}${result.paymentsUpdated ? ' และอัปเดตรายการชำระเงิน' : ''}`
        : `ย้ายที่นั่ง ${from?.seatLabel}${from?.vanNumber ? ` (รถ ${from.vanNumber})` : ''} → ${result.booking.seatLabel}${result.paymentsUpdated ? ' และอัปเดตรายการชำระเงิน' : ''}`,
      changes: 'swapped' in result && result.swapped
        ? [{ field: 'ที่นั่ง', before: `${result.booking.seatLabel} / ${result.otherBooking.seatLabel}`, after: `${result.otherBooking.seatLabel} / ${result.booking.seatLabel}` }]
        : [{ field: 'ที่นั่ง', before: from?.seatLabel, after: result.booking.seatLabel }, { field: 'รถ', before: from?.vanId, after: result.booking.vanId }] });
    return Response.json({ success: true, ...result });
  } catch (error) { return paymentError(error); }
}
