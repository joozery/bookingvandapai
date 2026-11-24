import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';
import { paymentDb, type PaymentOrder } from '@/lib/paymentStore';
import { dataStore } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(['payments']);
  if (admin instanceof Response) return admin;
  try {
    const { id } = await params;
    const body = await request.json() as { reason?: unknown };
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
    if (!reason) return NextResponse.json({ success: false, error: 'กรุณาระบุเหตุผลการยกเลิก' }, { status: 400 });

    const db = await paymentDb();
    const { data: booking, error: bookingError } = await dataStore.from('bookings').select('*').eq('id', id).single();
    if (bookingError || !booking) return NextResponse.json({ success: false, error: 'ไม่พบรายการจอง' }, { status: 404 });
    if (booking.status === 'rejected' || booking.cancellationType === 'no_refund') return NextResponse.json({ success: false, error: 'รายการนี้ถูกยกเลิกไปแล้ว' }, { status: 409 });
    if (!['approved', 'pending', 'cancel_pending'].includes(String(booking.status))) return NextResponse.json({ success: false, error: 'สถานะรายการนี้ไม่สามารถยกเลิกได้' }, { status: 400 });

    const order = booking.paymentOrderId
      ? await db.collection<PaymentOrder>('paymentOrders').findOne({ id: String(booking.paymentOrderId) })
      : await db.collection<PaymentOrder>('paymentOrders').findOne({ bookingId: id });
    const manualPayments = await db.collection<{ bookingId: string; amountSatang?: number }>('legacyPayments').find({ bookingId: id }, { projection: { _id: 0, amountSatang: 1 } }).toArray();
    const manualPaidSatang = manualPayments.reduce((sum, payment) => sum + (typeof payment.amountSatang === 'number' ? payment.amountSatang : 0), 0);
    const retainedSatang = Math.max(0, typeof order?.paidSatang === 'number' ? order.paidSatang : manualPaidSatang);
    const now = Date.now();
    const who = admin.name || admin.username;

    const { error: bookingUpdateError } = await dataStore.from('bookings').update({
      status: 'rejected', cancellationType: 'no_refund', cancelReason: reason, cancelledAt: new Date(now).toISOString(), cancelledBy: who,
    }).eq('id', id);
    if (bookingUpdateError) throw bookingUpdateError;

    const { data: van } = await dataStore.from('vans').select('*').eq('id', booking.vanId).single();
    if (van) {
      const seats = [...(van.seats || [])];
      const seatIndex = seats.findIndex((seat: any) => seat.id === booking.seatId && seat.bookingId === id);
      if (seatIndex !== -1) {
        seats[seatIndex].status = 'available';
        seats[seatIndex].bookingId = null;
        const { error: vanUpdateError } = await dataStore.from('vans').update({ seats }).eq('id', booking.vanId);
        if (vanUpdateError) throw vanUpdateError;
      }
    }

    if (order) {
      await db.collection<PaymentOrder>('paymentOrders').updateOne(
        { id: order.id },
        { $set: { autoCancelledAt: now, autoCancelReason: 'booking-cancelled-no-refund', amountSatang: 0, cancellation: { type: 'no_refund', reason, by: who, at: now, retainedSatang } }, $unset: { qrCode: '', verificationReceivers: '', verifyToken: '', verifyUntil: '', bookingClaim: '' } },
      );
    }

    await recordAudit(admin, {
      action: 'update', resource: 'booking', resourceId: id, request,
      summary: `ยกเลิกการจองไม่คืนเงิน ${booking.fullName || booking.nickname || ''} · รายรับทริป ${(retainedSatang / 100).toLocaleString('th-TH')} บาท`,
      changes: [
        { field: 'สถานะ', before: booking.status, after: 'ยกเลิกไม่คืนเงิน' },
        { field: 'รายรับที่เก็บไว้ (บาท)', before: 0, after: retainedSatang / 100 },
        { field: 'เหตุผล', before: '', after: reason },
      ],
    });
    return NextResponse.json({ success: true, retainedSatang, cancelledAt: now, cancelledBy: who, reason });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'ยกเลิกการจองไม่สำเร็จ' }, { status: 500 });
  }
}
