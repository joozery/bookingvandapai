import { adminWith, forbidden } from '@/lib/adminAuth';
import { filterPayments, loadAdminPayments } from '@/lib/adminPayments';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/** Payment history: payments (view or edit) or accounting (view or edit) staff. */
export async function GET(request: Request) {
  try {
    const admin = await adminWith(['payments', 'accounting'], 'view');
    if (!admin) return forbidden('ไม่มีสิทธิ์ดูข้อมูลการชำระเงิน');
    const { searchParams } = new URL(request.url);
    const rows = filterPayments(await loadAdminPayments(), {
      q: searchParams.get('q') || '', tripId: searchParams.get('tripId') || '', state: searchParams.get('state') || '',
    });
    const canEdit = admin.isMain || hasPermission(admin.permissions, 'payments', 'edit');
    return Response.json({ success: true, payments: rows, canEdit }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[admin-payments:GET]', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'โหลดข้อมูลการชำระเงินไม่สำเร็จ' }, { status: 500 });
  }
}
