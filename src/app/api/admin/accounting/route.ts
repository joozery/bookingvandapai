import { requireAdmin } from '@/lib/adminAuth';
import { loadAccounting } from '@/lib/accounting';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/** Dashboard, per-trip accounts, entries, categories and partners in one read. */
export async function GET() {
  const admin = await requireAdmin(['accounting'], 'view');
  if (admin instanceof Response) return admin;
  try {
    const canEdit = admin.isMain || hasPermission(admin.permissions, 'accounting', 'edit');
    return Response.json({ success: true, canEdit, ...await loadAccounting() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[accounting:GET]', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'โหลดข้อมูลบัญชีไม่สำเร็จ' }, { status: 500 });
  }
}
