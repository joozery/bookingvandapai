import { requireAdmin } from '@/lib/adminAuth';
import { deleteCategory, deleteEntry, deletePartner, deletePartnerTransaction, saveCategory, saveEntry, savePartner } from '@/lib/accounting';
import { checkPaymentOrigin, paymentError } from '@/lib/paymentAuth';
import { accountingRecord, auditAccounting } from '@/lib/accountingAudit';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ resource: string; id: string }> };

export async function PATCH(request: Request, context: Context) {
  const admin = await requireAdmin(['accounting']);
  if (admin instanceof Response) return admin;
  try {
    checkPaymentOrigin(request);
    const { resource, id } = await context.params;
    const body = await request.json();
    const before = await accountingRecord(resource, id);
    const item = resource === 'entries' ? await saveEntry(body, admin.name || admin.username, id)
      : resource === 'categories' ? await saveCategory({ ...body, id })
      : resource === 'partners' ? await savePartner(body, id)
      : null;
    if (!item) return Response.json({ success: false, error: 'ไม่พบข้อมูล' }, { status: 404 });
    await auditAccounting(admin, request, resource, 'update', before, item as unknown as Record<string, unknown>);
    return Response.json({ success: true, item });
  } catch (error) { return paymentError(error); }
}

export async function DELETE(request: Request, context: Context) {
  const admin = await requireAdmin(['accounting']);
  if (admin instanceof Response) return admin;
  try {
    checkPaymentOrigin(request);
    const { resource, id } = await context.params;
    const before = await accountingRecord(resource, id);
    let extra: Record<string, unknown> = {};
    if (resource === 'entries') await deleteEntry(id);
    else if (resource === 'categories') extra = await deleteCategory(id);
    else if (resource === 'partners') await deletePartner(id);
    else if (resource === 'reimbursements') await deletePartnerTransaction(id);
    else return Response.json({ success: false, error: 'ไม่พบข้อมูล' }, { status: 404 });
    if (before) await auditAccounting(admin, request, resource, 'delete', before, null);
    return Response.json({ success: true, ...extra });
  } catch (error) { return paymentError(error); }
}
