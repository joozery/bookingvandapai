import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';
import { requireAdmin } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';

type RouteParams = { params: Promise<{ id: string }> };
const TRANSFER_TTL_MS = 48 * 60 * 60 * 1000;

export async function POST(request: Request, { params }: RouteParams) {
  const admin = await requireAdmin(['bookings']);
  if (admin instanceof Response) return admin;
  const { id } = await params;
  try {
    const { data: booking, error } = await dataStore.from('bookings').select('*').eq('id', id).single();
    if (error || !booking) return NextResponse.json({ success: false, error: 'ไม่พบรายการจอง' }, { status: 404 });
    if (booking.status !== 'approved') return NextResponse.json({ success: false, error: 'ต้องเป็นรายการจองที่ยืนยันแล้วเท่านั้น' }, { status: 400 });
    const now = Date.now();
    const { data: existing } = await dataStore.from('bookingTransfers').select('*').eq('bookingId', id).eq('status', 'pending').single();
    if (existing && Number(existing.expiresAt) > now) {
      return NextResponse.json({ success: true, transfer: { token: existing.token, expiresAt: existing.expiresAt } });
    }
    if (existing) await dataStore.from('bookingTransfers').update({ status: 'expired' }).eq('id', existing.id);
    const transfer = {
      id: randomUUID(), token: randomUUID(), bookingId: id, tripId: booking.tripId,
      seatLabel: booking.seatLabel || '', status: 'pending', createdAt: now, expiresAt: now + TRANSFER_TTL_MS,
      originalName: booking.fullName || booking.nickname || '', originalUserId: booking.lineUserId || '',
    };
    const { error: insertError } = await dataStore.from('bookingTransfers').insert(transfer);
    if (insertError) throw insertError;
    await recordAudit(admin, { action: 'create', resource: 'booking-transfer', resourceId: transfer.id, request, summary: `สร้างลิงก์เปลี่ยนผู้เดินทางแทน ${booking.fullName || ''} ที่นั่ง ${booking.seatLabel || '-'}` });
    return NextResponse.json({ success: true, transfer: { token: transfer.token, expiresAt: transfer.expiresAt } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'สร้างลิงก์ไม่สำเร็จ' }, { status: 500 });
  }
}
