import { requireAdmin } from '@/lib/adminAuth';
import { savePartnerTripShares } from '@/lib/accounting';
import { checkPaymentOrigin, paymentError } from '@/lib/paymentAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const admin = await requireAdmin(['accounting']);
  if (admin instanceof Response) return admin;
  try {
    checkPaymentOrigin(request);
    const item = await savePartnerTripShares(await request.json(), admin.name || admin.username);
    return Response.json({ success: true, item });
  } catch (error) { return paymentError(error); }
}
