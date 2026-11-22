import { adminWith, forbidden } from '@/lib/adminAuth';
import { summarizeAdminPayments } from '@/lib/adminPayments';
import { summarizeLegacyBookingCandidates } from '@/lib/legacyPayments';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const admin = await adminWith(['payments', 'accounting'], 'view');
    if (!admin) return forbidden('ไม่มีสิทธิ์ดูข้อมูลการชำระเงิน');
    const params = new URL(request.url).searchParams;
    const state = params.get('state') || 'received';
    const tripStatus = (params.get('tripStatus') || 'active') as 'active' | 'completed' | 'all';
    const options = { q: params.get('q') || '', tripId: params.get('tripId') || '', state, tripStatus };
    const totals = state === 'bookings'
      ? await summarizeLegacyBookingCandidates(options)
      : await summarizeAdminPayments(Date.now(), options);
    return Response.json({ success: true, totals }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[admin-payments:summary:GET]', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'สรุปยอดการชำระเงินไม่สำเร็จ' }, { status: 500 });
  }
}
