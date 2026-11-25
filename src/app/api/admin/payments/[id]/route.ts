import { adminWith, forbidden } from '@/lib/adminAuth';
import { adjustOrderBalanceDue, adjustOrderTotal } from '@/lib/adminPayments';
import { checkPaymentOrigin, paymentError } from '@/lib/paymentAuth';
import { recordAudit } from '@/lib/audit';
import { paymentDb, type PaymentOrder } from '@/lib/paymentStore';

export const dynamic = 'force-dynamic';

/** Change the total a customer owes on one order; the balance follows automatically. */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await adminWith(['payments']);
    if (!admin) return forbidden('ไม่มีสิทธิ์แก้ไขยอดชำระ');
    checkPaymentOrigin(request);
    const { id } = await context.params;
    const body = await request.json();
    const before = await (await paymentDb()).collection<PaymentOrder>('paymentOrders').findOne({ id }, { projection: { totalSatang: 1, balanceDueAt: 1, departureAt: 1, status: 1, tripName: 1, userName: 1 } });
    if (!before) throw new Error('ไม่พบรายการชำระเงิน');
    const hasTotal = body.totalBaht !== undefined && body.totalBaht !== null && body.totalBaht !== '';
    const hasDueDate = body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== '';
    if (!hasTotal && !hasDueDate) throw new Error('ไม่มีข้อมูลที่ต้องการแก้ไข');
    const reason = body.note;
    const order = hasTotal
      ? await adjustOrderTotal(id, body.totalBaht, reason, admin.name || admin.username)
      : await (await paymentDb()).collection<PaymentOrder>('paymentOrders').findOne({ id });
    if (!order) throw new Error('ไม่สามารถแก้ไขรายการชำระเงินได้');
    const updated = hasDueDate
      ? await adjustOrderBalanceDue(id, body.dueDate, reason, admin.name || admin.username)
      : order;
    await recordAudit(admin, {
      action: 'update', resource: 'payment', resourceId: id, request,
      summary: `แก้ไขการชำระเงิน ${before.userName || ''} ทริป ${updated.tripName}${hasTotal ? ` ยอด ฿${((before.totalSatang || 0) / 100).toLocaleString('th-TH')} → ฿${(updated.totalSatang / 100).toLocaleString('th-TH')}` : ''}${hasDueDate ? ` กำหนดชำระ → ${body.dueDate}` : ''} (${String(body.note || '').slice(0, 120)})`,
      changes: [
        ...(hasTotal ? [{ field: 'ยอดที่ต้องชำระ (บาท)', before: (before.totalSatang || 0) / 100, after: updated.totalSatang / 100 }] : []),
        ...(hasDueDate ? [{ field: 'วันครบกำหนดชำระยอดคงเหลือ', before: before.balanceDueAt ? new Date(before.balanceDueAt).toISOString() : null, after: new Date(updated.balanceDueAt).toISOString() }] : []),
        ...(before.status !== updated.status ? [{ field: 'สถานะ', before: before.status, after: updated.status }] : []),
      ],
    });
    return Response.json({ success: true, totalSatang: updated.totalSatang, paidSatang: updated.paidSatang, status: updated.status, balanceDueAt: updated.balanceDueAt });
  } catch (error) { return paymentError(error); }
}
