import { requireAdmin } from '@/lib/adminAuth';
import { loadAccounting, loadAccountingOverview } from '@/lib/accounting';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/** Dashboard, per-trip accounts, entries, categories and partners in one read. */
export async function GET(request: Request) {
  const admin = await requireAdmin(['accounting'], 'view');
  if (admin instanceof Response) return admin;
  try {
    const canEdit = admin.isMain || hasPermission(admin.permissions, 'accounting', 'edit');
    const summaryOnly = new URL(request.url).searchParams.get('summary') === '1';
    return Response.json({ success: true, canEdit, ...(summaryOnly ? { overview: await loadAccountingOverview() } : await loadAccounting()) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[accounting:GET]', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'โหลดข้อมูลบัญชีไม่สำเร็จ' }, { status: 500 });
  }
}
