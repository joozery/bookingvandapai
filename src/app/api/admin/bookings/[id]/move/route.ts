import { adminWith, forbidden } from '@/lib/adminAuth';
import { checkPaymentOrigin, paymentError } from '@/lib/paymentAuth';
import { moveBookingSeat } from '@/lib/seatMove';
import { recordAudit } from '@/lib/audit';

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
    const result = await moveBookingSeat(id, body.vanId, body.seatId, admin.name || admin.username);
    await recordAudit(admin, { action: 'update', resource: 'booking', resourceId: id, request,
      summary: `ย้ายที่นั่ง ${result.from.seatLabel}${result.from.vanNumber ? ` (รถ ${result.from.vanNumber})` : ''} → ${result.booking.seatLabel}${result.paymentsUpdated ? ' และอัปเดตรายการชำระเงิน' : ''}`,
      changes: [{ field: 'ที่นั่ง', before: result.from.seatLabel, after: result.booking.seatLabel }, { field: 'รถ', before: result.from.vanId, after: result.booking.vanId }] });
    return Response.json({ success: true, ...result });
  } catch (error) { return paymentError(error); }
}
