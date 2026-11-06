import { paymentError, paymentUser } from '@/lib/paymentAuth';
import { creditBalance, creditHistory } from '@/lib/creditStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await paymentUser();
    return Response.json({ success: true, balanceSatang: await creditBalance(user.id), history: await creditHistory(user.id) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return paymentError(error); }
}
