import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase';
import { leaderboardPeople } from '@/lib/bookingLeaderboard';
import { leaderboardKey, loadHiddenLeaderboardKeys, loadLeaderboardBookings, setLeaderboardHidden } from '@/lib/leaderboardStore';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });
async function authorize(): Promise<{ id: string; name: string; username: string } | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== 'admin') return null;
  const { data, error } = await supabase.from('admins').select('username, name, permissions, isBlocked').eq('id', user.id).maybeSingle();
  if (error) throw error;
  const ok = !!data && !data.isBlocked && (data.username === 'admin' || data.permissions?.includes('leaderboard'));
  return ok ? { id: user.id, name: String(data.name || data.username || ''), username: String(data.username || '') } : null;
}
export async function GET() {
  try {
    if (!await authorize()) return fail('ไม่มีสิทธิ์จัดการอันดับ', 403);
    const [bookings, hidden] = await Promise.all([loadLeaderboardBookings(), loadHiddenLeaderboardKeys()]);
    const people = leaderboardPeople(bookings).map(person => ({ key: leaderboardKey(person.lineUserId), nickname: person.nickname,
      tripCount: person.tripCount, isHidden: hidden.has(leaderboardKey(person.lineUserId)) }));
    return NextResponse.json({ success: true, people }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return fail('โหลดรายชื่อไม่สำเร็จ กรุณาลองใหม่', 500); }
}
export async function PATCH(request: Request) {
  try {
    const admin = await authorize();
    if (!admin) return fail('ไม่มีสิทธิ์จัดการอันดับ', 403);
    const body = await request.json();
    if (typeof body.key !== 'string' || !/^[a-f0-9]{64}$/.test(body.key) || typeof body.isHidden !== 'boolean') return fail('ข้อมูลไม่ถูกต้อง', 400);
    const bookings = await loadLeaderboardBookings();
    if (!bookings.some(booking => leaderboardKey(booking.lineUserId) === body.key)) return fail('ไม่พบรายชื่อ', 404);
    await setLeaderboardHidden(body.key, body.isHidden);
    await recordAudit(admin, { action: 'update', resource: 'leaderboard', resourceId: body.key.slice(0, 12), request, summary: `${body.isHidden ? 'ซ่อน' : 'แสดง'}รายชื่อในอันดับคนจองทริป` });
    return NextResponse.json({ success: true, isHidden: body.isHidden });
  } catch { return fail('บันทึกไม่สำเร็จ กรุณาลองใหม่', 500); }
}
