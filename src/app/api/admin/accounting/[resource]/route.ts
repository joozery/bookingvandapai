import { requireAdmin } from '@/lib/adminAuth';
import { addReimbursement, saveCategory, saveEntry, savePartner } from '@/lib/accounting';
import { checkPaymentOrigin, paymentError } from '@/lib/paymentAuth';
import { auditAccounting } from '@/lib/accountingAudit';

export const dynamic = 'force-dynamic';

/** Create an entry, category, partner or partner reimbursement. */
export async function POST(request: Request, context: { params: Promise<{ resource: string }> }) {
  const admin = await requireAdmin(['accounting']);
  if (admin instanceof Response) return admin;
  try {
    checkPaymentOrigin(request);
    const { resource } = await context.params;
    const body = await request.json();
    const by = admin.name || admin.username;
    const item = resource === 'entries' ? await saveEntry(body, by)
      : resource === 'categories' ? await saveCategory(body)
      : resource === 'partners' ? await savePartner(body)
      : resource === 'reimbursements' ? await addReimbursement(body, by)
      : null;
    if (!item) return Response.json({ success: false, error: 'ไม่พบข้อมูล' }, { status: 404 });
    await auditAccounting(admin, request, resource, 'create', null, item as unknown as Record<string, unknown>);
    return Response.json({ success: true, item });
  } catch (error) { return paymentError(error); }
}
