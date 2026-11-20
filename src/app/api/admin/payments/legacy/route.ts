import { randomUUID } from 'node:crypto';
import { adminWith, forbidden } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';
import { listLegacyBookingCandidates, recordLegacyPayment } from '@/lib/legacyPayments';
import { uploadToR2 } from '@/lib/r2';

export const dynamic = 'force-dynamic';

function extension(type: string) {
  return type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
}

export async function GET(request: Request) {
  try {
    const admin = await adminWith(['payments'], 'view');
    if (!admin) return forbidden('ไม่มีสิทธิ์ดูข้อมูลการชำระเงิน');
    const params = new URL(request.url).searchParams;
    const result = await listLegacyBookingCandidates({ q: params.get('q') || '', tripId: params.get('tripId') || '', page: Number(params.get('page') || 1), pageSize: 20 });
    return Response.json({ success: true, ...result }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[legacy-payments:GET]', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'โหลดรายการจองเดิมไม่สำเร็จ' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await adminWith(['payments']);
    if (!admin) return forbidden('ไม่มีสิทธิ์บันทึกการชำระเงิน');
    const form = await request.formData();
    const bookingId = String(form.get('bookingId') || '').trim();
    const file = form.get('receipt');
    let receiptKey: string | undefined;
    let receiptContentType: string | undefined;
    if (file instanceof File && file.size > 0) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5_000_000) throw new Error('แนบสลิป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');
      receiptKey = `payment-slips/manual/${bookingId}/${randomUUID()}.${extension(file.type)}`;
      receiptContentType = file.type;
      await uploadToR2(receiptKey, Buffer.from(await file.arrayBuffer()), file.type);
    }
    const result = await recordLegacyPayment({ bookingId, amountBaht: form.get('amountBaht'), paidAt: form.get('paidAt'), method: form.get('method'), note: form.get('note'), receiptKey, receiptContentType }, admin.name || admin.username);
    await recordAudit(admin, { action: 'create', resource: 'legacy-payment', resourceId: result.payment.id, request, summary: `บันทึกยอดชำระเดิม ${bookingId} จำนวน ${(result.payment.amountSatang / 100).toLocaleString('th-TH')} บาท`, after: result.payment as unknown as Record<string, unknown> });
    return Response.json({ success: true, payment: result.payment, order: result.order && { id: result.order.id, paidSatang: result.order.paidSatang, totalSatang: result.order.totalSatang, status: result.order.status } });
  } catch (error) {
    console.error('[legacy-payments:POST]', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: error instanceof Error ? error.message : 'บันทึกการชำระเงินไม่สำเร็จ' }, { status: 400 });
  }
}
