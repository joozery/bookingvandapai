import { paymentUser, paymentError, checkPaymentOrigin } from '@/lib/paymentAuth';
import { paymentDb, publicOrder, recoverPaymentOrder, type PaymentOrder } from '@/lib/paymentStore';
import { createPaymentQr, paymentConfig } from '@/lib/slip2go';
import { HOLD_MS } from '@/lib/paymentRules';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await paymentUser();
    const { id } = await context.params;
    const order = await recoverPaymentOrder(user.id, id);
    if (!order) return Response.json({ success: false, error: 'ไม่พบรายการ' }, { status: 404 });
    return Response.json({ success: true, order: publicOrder(order) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return paymentError(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    checkPaymentOrigin(request);
    const user = await paymentUser();
    await paymentConfig();
    const { id } = await context.params;
    const orders = (await paymentDb()).collection<PaymentOrder>('paymentOrders');
    let order = await recoverPaymentOrder(user.id, id);
    if (!order) throw new Error('ไม่พบรายการชำระเงิน');
    if (order.status === 'expired') throw new Error('รายการนี้ต้องให้แอดมินตรวจสอบ กรุณาติดต่อแอดมิน');
    if (order.status === 'paid') return Response.json({ success: true, order: publicOrder(order) });
    const now = Date.now();
    if (now >= order.departureAt) throw new Error('ทริปนี้ออกเดินทางแล้ว กรุณาติดต่อแอดมิน');
    if (order.paidSatang === 0 && now >= order.expiresAt) throw new Error('รายการหมดเวลาแล้ว หากโอนแล้วกรุณาติดต่อแอดมินพร้อมเลขรายการ');
    if (order.verifyUntil && order.verifyUntil > now) throw new Error('กำลังตรวจสลิป กรุณารอสักครู่');
    // Only one balance invoice can be active; never replace a QR while verifying.
    if (order.status === 'deposit_paid' && order.amountSatang === 0) {
      order = await orders.findOneAndUpdate({ id, userId: user.id, amountSatang: 0, $or: [{ verifyUntil: { $exists: false } }, { verifyUntil: { $lt: now } }] }, { $set: { amountSatang: order.totalSatang - order.paidSatang, checkoutCreatedAt: now, expiresAt: Math.min(now + HOLD_MS, order.departureAt) } }, { returnDocument: 'after', projection: { _id: 0 } });
      if (!order) throw new Error('รายการกำลังเปลี่ยนแปลง กรุณาลองใหม่');
    }
    // Keep the recipient snapshot paired with the displayed QR for this invoice.
    // A successful payment clears both before a balance invoice is generated.
    if (order.qrCode && order.verificationReceivers?.length) return Response.json({ success: true, order: publicOrder(order) });
    const qr = await createPaymentQr(order.amountSatang);
    const updated = await orders.findOneAndUpdate({ id, userId: user.id, amountSatang: order.amountSatang, paidSatang: order.paidSatang }, { $set: qr }, { returnDocument: 'after', projection: { _id: 0 } });
    if (!updated) throw new Error('ยอดชำระเปลี่ยนแล้ว กรุณาโหลดใหม่');
    return Response.json({ success: true, order: publicOrder(updated) });
  } catch (error) { return paymentError(error); }
}
