import { randomUUID } from 'node:crypto';
import { paymentUser, paymentError, checkPaymentOrigin } from '@/lib/paymentAuth';
import { creditPayment, paymentDb, publicOrder, recoverPaymentOrder, type PaymentOrder } from '@/lib/paymentStore';
import { verifyPaymentSlip, paymentConfig } from '@/lib/slip2go';

export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let release: (() => Promise<unknown>) | undefined;
  let target: { id: string; userId: string } | undefined;
  let stage = 'request';
  try {
    checkPaymentOrigin(request);
    const user = await paymentUser();
    await paymentConfig();
    const { id } = await context.params;
    target = { id, userId: user.id };
    const recovered = await recoverPaymentOrder(user.id, id);
    if (recovered && recovered.paidSatang > 0 && recovered.amountSatang === 0) return Response.json({ success: true, order: publicOrder(recovered), reviewRequired: recovered.status === 'expired' || !!recovered.reviewRequired });
    if (Number(request.headers.get('content-length') || 0) > 5_300_000) throw new Error('รูปสลิปต้องมีขนาดไม่เกิน 5 MB');
    const form = await request.formData();
    const file = form.get('slip');
    if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5_000_000 || file.size < 1) throw new Error('แนบสลิป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');
    const orders = (await paymentDb()).collection<PaymentOrder>('paymentOrders');
    const now = Date.now(), token = randomUUID();
    const order = await orders.findOneAndUpdate({ id, userId: user.id, amountSatang: { $gt: 0 }, status: { $in: ['pending', 'deposit_paid'] }, $and: [
      { $or: [{ verifyUntil: { $exists: false } }, { verifyUntil: { $lt: now } }] },
      { $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lt: now } }] },
      { $or: [{ attempts: { $exists: false } }, { attempts: { $lt: 20 } }] },
    ] }, { $set: { verifyToken: token, verifyUntil: now + 60_000, nextAttemptAt: now + 10_000 }, $inc: { attempts: 1 } }, { returnDocument: 'after', projection: { _id: 0 } });
    if (!order) throw new Error('รายการนี้ชำระแล้ว หรือกำลังตรวจสอบ กรุณารอสักครู่แล้วโหลดใหม่ หากยังไม่ได้กรุณาติดต่อแอดมิน');
    release = () => orders.updateOne({ id, verifyToken: token }, { $unset: { verifyToken: '', verifyUntil: '' } });
    const imageBase64 = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;
    stage = 'provider';
    const verified = await verifyPaymentSlip(imageBase64, order.amountSatang, order.checkoutCreatedAt, order.verificationReceivers);
    stage = 'credit';
    // Record who registered, which trip and (for balance payments) which seat.
    const booking = order.bookingId ? await (await paymentDb()).collection('bookings').findOne({ id: order.bookingId }, { projection: { fullName: 1, seatLabel: 1 } }) : null;
    const receipt = {
      ...verified,
      registrantName: String(booking?.fullName || user.name || order.userName || '').slice(0, 120),
      tripName: order.tripName,
      ...(booking?.seatLabel || order.seat?.seatLabel ? { seatLabel: String(booking?.seatLabel || order.seat?.seatLabel) } : {}),
    };
    const updated = await creditPayment(order, token, receipt);
    return Response.json({ success: true, order: publicOrder(updated), reviewRequired: updated.status === 'expired' || !!updated.reviewRequired });
  } catch (error) {
    const provider = error as { providerCode?: string; providerReference?: string };
    const code = provider?.providerCode && /^[A-Z0-9_]{1,40}$/.test(provider.providerCode) ? provider.providerCode : 'LOCAL_VALIDATION';
    const rawMessage = error instanceof Error ? error.message : '';
    const message = /[ก-๙]/.test(rawMessage) ? rawMessage : 'ระบบตรวจสลิปขัดข้อง กรุณาลองใหม่หรือติดต่อแอดมิน';
    // Never log the image, Authorization header, bank account or raw response.
    console.error('[payment-verify]', { orderId: target?.id, stage, code, message });
    if (target) {
      try {
        await (await paymentDb()).collection<PaymentOrder>('paymentOrders').updateOne(target, { $set: { lastVerification: { code, message, checkedAt: Date.now(), stage, ...(typeof provider?.providerReference === 'string' ? { providerReference: provider.providerReference.slice(0, 200) } : {}) } } });
      } catch { /* do not replace the original verification error */ }
    }
    return paymentError(error);
  }
  finally { if (release) await release().catch(() => undefined); }
}
