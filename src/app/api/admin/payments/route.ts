import { adminWith, forbidden } from '@/lib/adminAuth';
import { countAdminPayments, filterPayments, loadAdminPayments } from '@/lib/adminPayments';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/** Payment history: payments (view or edit) or accounting (view or edit) staff. */
export async function GET(request: Request) {
  try {
    const admin = await adminWith(['payments', 'accounting'], 'view');
    if (!admin) return forbidden('ไม่มีสิทธิ์ดูข้อมูลการชำระเงิน');
    const { searchParams } = new URL(request.url);
    const options = { q: searchParams.get('q') || '', tripId: searchParams.get('tripId') || '', state: searchParams.get('state') || '', page: Number(searchParams.get('page') || 0), pageSize: 20 };
    const paged = options.page > 0;
    const rows = filterPayments(await loadAdminPayments(Date.now(), paged ? options : {}), paged ? {} : options);
    const total = paged ? await countAdminPayments(Date.now(), options) : rows.length;
    const canEdit = admin.isMain || hasPermission(admin.permissions, 'payments', 'edit');
    return Response.json({ success: true, payments: rows, total, page: paged ? options.page : 1, pageSize: 20, canEdit }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[admin-payments:GET]', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'โหลดข้อมูลการชำระเงินไม่สำเร็จ' }, { status: 500 });
  }
}
