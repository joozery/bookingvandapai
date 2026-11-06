import { creditBalance, creditHistory } from '@/lib/creditStore';
import { requireAdmin } from '@/lib/adminAuth';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const admin = await requireAdmin(['users']);
  if (admin instanceof Response) return admin;
  const { id } = await params;
  return Response.json({ success: true, balanceSatang: await creditBalance(id), history: await creditHistory(id) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
