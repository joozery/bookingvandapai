import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { dataStore } from '@/lib/dataStore';
import { leaderboardPeople } from '@/lib/bookingLeaderboard';
import { leaderboardKey, loadHiddenLeaderboardKeys, loadLeaderboardBookings, setLeaderboardHidden } from '@/lib/leaderboardStore';
import { recordAudit } from '@/lib/audit';
import { getMongoDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });
async function authorize(): Promise<{ id: string; name: string; username: string } | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== 'admin') return null;
  const { data, error } = await dataStore.from('admins').select('username, name, permissions, isBlocked').eq('id', user.id).maybeSingle();
  if (error) throw error;
  const ok = !!data && !data.isBlocked && (data.username === 'admin' || data.permissions?.includes('leaderboard'));
  return ok ? { id: user.id, name: String(data.name || data.username || ''), username: String(data.username || '') } : null;
}
export async function GET(request: Request) {
  try {
    if (!await authorize()) return fail('ไม่มีสิทธิ์จัดการอันดับ', 403);
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get('page') || 1));
    const pageSize = 20;
    const q = (params.get('q') || '').trim().toLocaleLowerCase('th');
    const visibility = params.get('visibility') || 'all';
    const hidden = await loadHiddenLeaderboardKeys();
    const basePipeline: any[] = [
      { $match: { status: 'approved', lineUserId: { $exists: true, $ne: '' }, tripId: { $exists: true, $ne: '' }, ...(q ? { nickname: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {}) } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$lineUserId', nickname: { $first: '$nickname' }, tripIds: { $addToSet: '$tripId' } } },
      { $project: { _id: 0, lineUserId: '$_id', nickname: 1, tripCount: { $size: '$tripIds' } } },
      { $sort: { tripCount: -1, nickname: 1 } },
    ];
    const collection = (await getMongoDb()).collection('bookings');
    if (visibility === 'all' && !q) {
      const result = await collection.aggregate([
        ...basePipeline,
        { $facet: { people: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }], count: [{ $count: 'value' }] } },
      ]).toArray();
      const grouped = result[0] || { people: [], count: [] };
      const people = grouped.people.map((person: any) => ({ key: leaderboardKey(String(person.lineUserId)), nickname: String(person.nickname || 'นักเดินทาง'), tripCount: Number(person.tripCount || 0), isHidden: hidden.has(leaderboardKey(String(person.lineUserId))) }));
      return NextResponse.json({ success: true, people, total: Number(grouped.count[0]?.value || 0), page, pageSize }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const grouped = await collection.aggregate(basePipeline).toArray();
    const people = grouped.map((person: any) => ({ key: leaderboardKey(String(person.lineUserId)), nickname: String(person.nickname || 'นักเดินทาง'), tripCount: Number(person.tripCount || 0), isHidden: hidden.has(leaderboardKey(String(person.lineUserId))) }));
    const filtered = people.filter(person => (!q || person.nickname.toLocaleLowerCase('th').includes(q)) && (visibility === 'all' || person.isHidden === (visibility === 'hidden')));
    return NextResponse.json({ success: true, people: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize }, { headers: { 'Cache-Control': 'private, no-store' } });
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
