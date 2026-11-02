import { requireMainAdmin } from '@/lib/adminAuth';
import { listAuditLogs } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** Audit history: main admin only. */
export async function GET(request: Request) {
  const admin = await requireMainAdmin();
  if (admin instanceof Response) return admin;
  try {
    const p = new URL(request.url).searchParams;
    const result = await listAuditLogs({
      q: p.get('q') || '', actor: p.get('actor') || '', resource: p.get('resource') || '', action: p.get('action') || '',
      from: p.get('from') || '', to: p.get('to') || '', page: Number(p.get('page')) || 1,
    });
    return Response.json({ success: true, ...result }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[audit-logs:GET]', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'โหลดประวัติไม่สำเร็จ' }, { status: 500 });
  }
}
