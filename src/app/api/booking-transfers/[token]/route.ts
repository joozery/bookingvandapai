import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { dataStore } from '@/lib/dataStore';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

type RouteParams = { params: Promise<{ token: string }> };
const publicTransfer = (transfer: any, booking: any, trip: any) => ({
  seatLabel: booking.seatLabel || transfer.seatLabel || '-', tripName: trip?.name || 'ทริปเดินทาง',
  departureDate: trip?.departureDate || '', pickupPoint: trip?.pickupPoint || '',
  originalName: transfer.originalName || 'ผู้จองเดิม', expiresAt: transfer.expiresAt,
  status: transfer.status,
});

export async function GET(_request: Request, { params }: RouteParams) {
  const { token } = await params;
  const { data: transfer } = await dataStore.from('bookingTransfers').select('*').eq('token', token).single();
  if (!transfer) return NextResponse.json({ success: false, error: 'ไม่พบลิงก์นี้' }, { status: 404 });
  if (transfer.status !== 'pending' || Number(transfer.expiresAt) <= Date.now()) return NextResponse.json({ success: false, error: 'ลิงก์นี้หมดอายุหรือถูกใช้แล้ว' }, { status: 410 });
  const { data: booking } = await dataStore.from('bookings').select('*').eq('id', transfer.bookingId).single();
  if (!booking || booking.status !== 'approved') return NextResponse.json({ success: false, error: 'รายการจองนี้ไม่พร้อมให้เปลี่ยนผู้เดินทาง' }, { status: 400 });
  const { data: trip } = await dataStore.from('trips').select('name, departureDate, pickupPoint').eq('id', booking.tripId).single();
  return NextResponse.json({ success: true, transfer: publicTransfer(transfer, booking, trip) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role === 'admin') return NextResponse.json({ success: false, error: 'กรุณาเข้าสู่ระบบด้วย LINE ก่อนลงทะเบียน' }, { status: 401 });
  const { token } = await params;
  const { data: transfer } = await dataStore.from('bookingTransfers').select('*').eq('token', token).single();
  if (!transfer || transfer.status !== 'pending' || Number(transfer.expiresAt) <= Date.now()) return NextResponse.json({ success: false, error: 'ลิงก์นี้หมดอายุหรือถูกใช้แล้ว' }, { status: 410 });
  const body = await request.json();
  const required = ['titleName', 'fullName', 'nickname', 'phone', 'nationalId', 'birthDate', 'emergencyName', 'emergencyPhone'];
  if (required.some(key => typeof body[key] !== 'string' || !body[key].trim()) || body.consentInsurance !== true) {
    return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลให้ครบและยอมรับการใช้ข้อมูลเพื่อทำประกัน' }, { status: 400 });
  }
  const phone = body.phone.replace(/\D/g, '');
  const nationalId = body.nationalId.replace(/\D/g, '');
  const emergencyPhone = body.emergencyPhone.replace(/\D/g, '');
  if (phone.length !== 10 || nationalId.length !== 13 || emergencyPhone.length !== 10) return NextResponse.json({ success: false, error: 'กรุณาตรวจสอบเบอร์โทรและเลขบัตรประชาชน' }, { status: 400 });
  const { data: booking } = await dataStore.from('bookings').select('*').eq('id', transfer.bookingId).single();
  if (!booking || booking.status !== 'approved') return NextResponse.json({ success: false, error: 'รายการจองนี้ไม่พร้อมให้เปลี่ยนผู้เดินทาง' }, { status: 400 });
  const traveler = { lineUserId: user.id, titleName: body.titleName.trim(), fullName: body.fullName.trim(), nickname: body.nickname.trim(), phone, nationalId, birthDate: body.birthDate.trim(), emergencyName: body.emergencyName.trim(), emergencyPhone, allergies: String(body.allergies || '').trim(), medicalConditions: String(body.medicalConditions || '').trim(), consentInsurance: true, acceptedAt: new Date().toISOString() };
  const history = [...(Array.isArray(booking.transferHistory) ? booking.transferHistory : []), { fromName: booking.currentTraveler?.fullName || booking.fullName || booking.nickname || '', toName: traveler.fullName, toPhone: traveler.phone, changedAt: traveler.acceptedAt, method: 'secure_link' }];
  const { error: updateError } = await dataStore.from('bookings').update({ currentTraveler: traveler, transferHistory: history }).eq('id', booking.id);
  if (updateError) throw updateError;
  await dataStore.from('bookingTransfers').update({ status: 'accepted', acceptedAt: traveler.acceptedAt, acceptedName: traveler.fullName, acceptedPhone: traveler.phone }).eq('id', transfer.id);
  return NextResponse.json({ success: true, message: 'ลงทะเบียนผู้เดินทางแทนเรียบร้อยแล้ว', traveler: { fullName: traveler.fullName, seatLabel: booking.seatLabel } });
}
