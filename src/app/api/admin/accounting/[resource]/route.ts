import { requireAdmin } from '@/lib/adminAuth';
import { addPartnerPayout, addReimbursement, listCategories, loadAccountingEntriesPage, loadPartnerTripsPage, loadTripAccountsPage, saveCategory, saveEntry, savePartner } from '@/lib/accounting';
import { checkPaymentOrigin, paymentError } from '@/lib/paymentAuth';
import { auditAccounting } from '@/lib/accountingAudit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ resource: string }> }) {
  const admin = await requireAdmin(['accounting'], 'view');
  if (admin instanceof Response) return admin;
  const { resource } = await context.params;
  if (resource === 'trip-accounts') {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') || 1);
    return Response.json({ success: true, ...await loadTripAccountsPage({ page: Number.isFinite(page) ? page : 1, pageSize: 20, status: searchParams.get('status') || 'all', onlyPaying: searchParams.get('onlyPaying') === '1' }) }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  if (resource === 'entries') {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    if (type !== 'income' && type !== 'expense') return Response.json({ success: false, error: 'ประเภทบัญชีไม่ถูกต้อง' }, { status: 400 });
    const page = Number(searchParams.get('page') || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 20)));
    return Response.json({ success: true, ...await loadAccountingEntriesPage({ type, page: Number.isFinite(page) ? page : 1, pageSize: Number.isFinite(pageSize) ? pageSize : 20, tripId: searchParams.get('tripId') || 'all', categoryId: searchParams.get('categoryId') || 'all' }) }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  if (resource === 'categories') {
    return Response.json({ success: true, categories: await listCategories() }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  if (resource !== 'partner-trips') return Response.json({ success: false, error: 'ไม่พบข้อมูล' }, { status: 404 });
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page') || 1);
  const result = await loadPartnerTripsPage(Number.isFinite(page) ? page : 1, 20);
  return Response.json({ success: true, ...result }, { headers: { 'Cache-Control': 'private, no-store' } });
}

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
      : resource === 'payouts' ? await addPartnerPayout(body, by)
      : null;
    if (!item) return Response.json({ success: false, error: 'ไม่พบข้อมูล' }, { status: 404 });
    await auditAccounting(admin, request, resource, 'create', null, item as unknown as Record<string, unknown>);
    return Response.json({ success: true, item });
  } catch (error) { return paymentError(error); }
}
