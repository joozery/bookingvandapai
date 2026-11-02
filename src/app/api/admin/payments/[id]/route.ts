import { adminWith, forbidden } from '@/lib/adminAuth';
import { adjustOrderTotal } from '@/lib/adminPayments';
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
    const before = await (await paymentDb()).collection<PaymentOrder>('paymentOrders').findOne({ id }, { projection: { totalSatang: 1, status: 1, tripName: 1, userName: 1 } });
    const order = await adjustOrderTotal(id, body.totalBaht, body.note, admin.name || admin.username);
    await recordAudit(admin, {
      action: 'update', resource: 'payment', resourceId: id, request,
      summary: `แก้ยอดที่ต้องชำระ ${before?.userName || ''} ทริป ${order.tripName}: ฿${((before?.totalSatang || 0) / 100).toLocaleString('th-TH')} → ฿${(order.totalSatang / 100).toLocaleString('th-TH')} (${String(body.note || '').slice(0, 120)})`,
      changes: [{ field: 'ยอดที่ต้องชำระ (บาท)', before: (before?.totalSatang || 0) / 100, after: order.totalSatang / 100 }, ...(before?.status !== order.status ? [{ field: 'สถานะ', before: before?.status, after: order.status }] : [])],
    });
    return Response.json({ success: true, totalSatang: order.totalSatang, paidSatang: order.paidSatang, status: order.status });
  } catch (error) { return paymentError(error); }
}
