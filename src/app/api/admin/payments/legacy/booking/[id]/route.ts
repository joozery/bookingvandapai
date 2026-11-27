import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { adjustLegacyBookingBalanceDue, adjustLegacyBookingTotal, setLegacyBookingPaymentExempt } from '@/lib/legacyPayments';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(['payments:edit']);
  if (admin instanceof Response) return admin;
  try {
    const { id } = await params;
    const body = await request.json() as { paymentExempt?: boolean; totalBaht?: unknown; dueDate?: unknown; note?: unknown };
    if (body.totalBaht !== undefined && body.totalBaht !== null && body.totalBaht !== '') {
      const updated = await adjustLegacyBookingTotal(id, body.totalBaht);
      await recordAudit(admin, { action: 'update', resource: 'booking', resourceId: id, request, summary: `แก้ไขยอดที่ต้องชำระรายการเก่า → ฿${(updated.totalSatang / 100).toLocaleString('th-TH')}`, changes: [{ field: 'ยอดที่ต้องชำระทั้งหมด', before: '', after: updated.totalSatang / 100 }, { field: 'เหตุผล', before: '', after: String(body.note || '').slice(0, 300) }] });
      return NextResponse.json({ success: true, ...updated });
    }
    if (body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== '') {
      const balanceDueAt = await adjustLegacyBookingBalanceDue(id, body.dueDate);
      await recordAudit(admin, { action: 'update', resource: 'booking', resourceId: id, request, summary: `แก้ไขวันครบกำหนดชำระรายการเก่า → ${String(body.dueDate)}`, changes: [{ field: 'วันครบกำหนดชำระยอดคงเหลือ', before: '', after: new Date(balanceDueAt).toISOString() }, { field: 'เหตุผล', before: '', after: String(body.note || '').slice(0, 300) }] });
      return NextResponse.json({ success: true, balanceDueAt });
    }
    if (typeof body.paymentExempt !== 'boolean') return NextResponse.json({ success: false, error: 'paymentExempt must be boolean' }, { status: 400 });
    await setLegacyBookingPaymentExempt(id, body.paymentExempt);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'update failed' }, { status: 500 });
  }
}
