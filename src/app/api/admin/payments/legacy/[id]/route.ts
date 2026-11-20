import { adminWith, forbidden } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';
import { updateLegacyPayment } from '@/lib/legacyPayments';

export const dynamic = 'force-dynamic';

async function change(request: Request, context: { params: Promise<{ id: string }> }, remove: boolean) {
  const admin = await adminWith(['payments']);
  if (!admin) return forbidden('ไม่มีสิทธิ์แก้ไขการชำระเงิน');
  const { id } = await context.params;
  const body = remove ? {} : await request.json();
  const result = await updateLegacyPayment(id, body, admin.name || admin.username, remove);
  await recordAudit(admin, { action: remove ? 'delete' : 'update', resource: 'legacy-payment', resourceId: id, request, summary: `${remove ? 'ลบ' : 'แก้ไข'}รายการชำระเดิม ${id}` });
  return Response.json({ success: true, ...result });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { return await change(request, context, false); }
  catch (error) { return Response.json({ success: false, error: error instanceof Error ? error.message : 'แก้ไขไม่สำเร็จ' }, { status: 400 }); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try { return await change(request, context, true); }
  catch (error) { return Response.json({ success: false, error: error instanceof Error ? error.message : 'ลบไม่สำเร็จ' }, { status: 400 }); }
}
