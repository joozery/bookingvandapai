import { adminWith, forbidden } from '@/lib/adminAuth';
import { filterPayments, loadAdminPayments } from '@/lib/adminPayments';
import { buildPaymentWorkbook } from '@/lib/paymentReport';

export const dynamic = 'force-dynamic';

/** Excel (.xlsx) report of the payments matching the same filters as the admin list. */
export async function GET(request: Request) {
  try {
    if (!await adminWith(['payments'], 'view')) return forbidden('ไม่มีสิทธิ์ส่งออกข้อมูลการชำระเงิน');
    const { searchParams } = new URL(request.url);
    const rows = filterPayments(await loadAdminPayments(), {
      q: searchParams.get('q') || '', tripId: searchParams.get('tripId') || '', state: searchParams.get('state') || '',
    });
    const file = await buildPaymentWorkbook(rows);
    const date = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="payments-${date}.xlsx"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[admin-payments:export]', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'ส่งออกรายงานไม่สำเร็จ' }, { status: 500 });
  }
}
