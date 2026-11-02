import { requireAdmin } from '@/lib/adminAuth';
import { loadAccounting } from '@/lib/accounting';
import { buildAccountingWorkbook } from '@/lib/accountingReport';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin(['accounting'], 'view');
  if (admin instanceof Response) return admin;
  try {
    const file = await buildAccountingWorkbook(await loadAccounting());
    const date = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    return new Response(new Uint8Array(file), { headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="accounting-${date}.xlsx"`, 'Cache-Control': 'private, no-store',
    } });
  } catch (error) {
    console.error('[accounting:export]', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'ส่งออกรายงานไม่สำเร็จ' }, { status: 500 });
  }
}
