import { paymentUser, paymentError, checkPaymentOrigin } from '@/lib/paymentAuth';
import { createPaymentOrder, recoverPaymentOrders, publicOrder } from '@/lib/paymentStore';
import { paymentConfig } from '@/lib/slip2go';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await paymentUser();
    const orders = await recoverPaymentOrders(user.id);
    return Response.json({ success: true, orders: orders.map(publicOrder) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return paymentError(error); }
}

export async function POST(request: Request) {
  try {
    checkPaymentOrigin(request);
    const user = await paymentUser();
    await paymentConfig();
    const body = await request.json();
    if (typeof body.tripId !== 'string' || !body.tripId || body.tripId.length > 200 || !['deposit', 'full'].includes(body.plan)) throw new Error('กรุณาเลือกทริปและรูปแบบชำระเงิน');
    const order = await createPaymentOrder(user.id, body.tripId, body.plan, user.name);
    return Response.json({ success: true, order: publicOrder(order) });
  } catch (error) { return paymentError(error); }
}
