import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { dataStore } from '@/lib/dataStore';
import { requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';
import { getMongoDb } from '@/lib/mongodb';

/** GET /api/users
 *  Aggregates unique LINE users from bookings table, enriched with stats.
 */
export async function GET(request: Request) {
  const admin = await requireAdmin([]);
  if (admin instanceof Response) return admin;
  try {
    const params = new URL(request.url).searchParams;
    if (params.has('page')) {
      const page = Math.max(1, Number(params.get('page') || 1));
      const pageSize = 20;
      const q = (params.get('q') || '').trim();
      const role = params.get('role') || 'all';
      const sort = params.get('sort') || 'lastSeen';
      const db = await getMongoDb();
      const grouped = await db.collection('bookings').aggregate([
        { $match: { lineUserId: { $exists: true, $ne: '' } } },
        { $sort: { createdAt: -1 } },
        { $group: {
          _id: '$lineUserId', lineUserId: { $first: '$lineUserId' }, lineUserName: { $first: '$lineUserName' }, lineUserProfilePic: { $first: '$lineUserProfilePic' },
          nickname: { $first: '$nickname' }, fullName: { $first: '$fullName' }, phone: { $first: '$phone' }, birthDate: { $first: '$birthDate' },
          firstSeen: { $last: '$createdAt' }, lastSeen: { $first: '$createdAt' }, bookings: { $push: { status: '$status', checkedIn: '$checkedIn' } },
        } },
        { $project: { _id: 0, lineUserId: 1, lineUserName: 1, lineUserProfilePic: 1, nickname: 1, fullName: 1, phone: 1, birthDate: 1, firstSeen: 1, lastSeen: 1,
          totalBookings: { $size: '$bookings' }, approvedBookings: { $size: { $filter: { input: '$bookings', as: 'b', cond: { $eq: ['$$b.status', 'approved'] } } } }, checkedIn: { $size: { $filter: { input: '$bookings', as: 'b', cond: { $eq: ['$$b.checkedIn', true] } } } } } },
      ]).toArray();
      const adminUsers = await db.collection('admin_users').find({}, { projection: { _id: 0 } }).toArray();
      const adminMap = new Map(adminUsers.map((user: any) => [user.lineUserId, user]));
      const users = grouped.map((user: any) => ({ ...user, role: adminMap.get(user.lineUserId)?.role || 'customer', isBlocked: !!adminMap.get(user.lineUserId)?.isBlocked, adminNote: adminMap.get(user.lineUserId)?.note || '' }));
      const filtered = users.filter((user: any) => (!q || [user.nickname, user.fullName, user.phone, user.lineUserName, user.lineUserId].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase())) && (role === 'blocked' ? user.isBlocked : role === 'all' || user.role === role));
      filtered.sort((a: any, b: any) => sort === 'totalBookings' ? b.totalBookings - a.totalBookings : sort === 'checkedIn' ? b.checkedIn - a.checkedIn : sort === 'nickname' ? String(b.nickname || '').localeCompare(String(a.nickname || '')) : new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
      return NextResponse.json({ success: true, users: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize });
    }
    // Only the fields used below are read (not e.g. ID numbers or medical
    // notes), and the block-list is read at the same time.
    const [{ data: bookings, error }, { data: adminUsers }] = await Promise.all([
      dataStore
        .from('bookings')
        .select('lineUserId, lineUserName, lineUserProfilePic, nickname, fullName, phone, birthDate, createdAt, status, checkedIn')
        .order('createdAt', { ascending: false }),
      // Fetch block-list from admin_users table (if exists), gracefully ignore if not
      dataStore
        .from('admin_users')
        .select('lineUserId, role, isBlocked, note, createdAt'),
    ]);

    if (error) throw error;

    const adminMap: Record<string, any> = {};
    (adminUsers || []).forEach((u: any) => {
      adminMap[u.lineUserId] = u;
    });

    // Aggregate unique users from bookings
    const userMap: Record<string, any> = {};
    (bookings || []).forEach((b: any) => {
      if (!b.lineUserId) return;
      if (!userMap[b.lineUserId]) {
        userMap[b.lineUserId] = {
          lineUserId: b.lineUserId,
          lineUserName: b.lineUserName,
          lineUserProfilePic: b.lineUserProfilePic,
          nickname: b.nickname,
          fullName: b.fullName,
          phone: b.phone,
          birthDate: b.birthDate || null,
          bookings: [],
          firstSeen: b.createdAt,
          lastSeen: b.createdAt,
          role: adminMap[b.lineUserId]?.role || 'customer',
          isBlocked: adminMap[b.lineUserId]?.isBlocked || false,
          adminNote: adminMap[b.lineUserId]?.note || '',
        };
      }
      const u = userMap[b.lineUserId];
      // Bookings are newest first; retain the newest recorded birthday.
      if (!u.birthDate && b.birthDate) u.birthDate = b.birthDate;
      u.bookings.push(b);
      if (new Date(b.createdAt) < new Date(u.firstSeen)) u.firstSeen = b.createdAt;
      if (new Date(b.createdAt) > new Date(u.lastSeen))  u.lastSeen  = b.createdAt;
      // update latest contact info
      u.nickname = b.nickname;
      u.fullName  = b.fullName;
      u.phone     = b.phone;
    });

    const users = Object.values(userMap).map((u: any) => ({
      ...u,
      totalBookings:    u.bookings.length,
      approvedBookings: u.bookings.filter((b: any) => b.status === 'approved').length,
      checkedIn:        u.bookings.filter((b: any) => b.checkedIn).length,
      bookings: undefined, // remove raw array from response
    }));

    // Sort by lastSeen desc
    users.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());

    const page = Math.max(1, Number(params.get('page') || 1));
    const pageSize = 20;
    const q = (params.get('q') || '').trim().toLowerCase();
    const role = params.get('role') || 'all';
    const sort = params.get('sort') || 'lastSeen';
    const filtered = users.filter((user: any) => (!q || [user.nickname, user.fullName, user.phone, user.lineUserName, user.lineUserId].filter(Boolean).join(' ').toLowerCase().includes(q)) && (role === 'blocked' ? user.isBlocked : role === 'all' || user.role === role));
    filtered.sort((a: any, b: any) => {
      if (sort === 'totalBookings') return b.totalBookings - a.totalBookings;
      if (sort === 'checkedIn') return b.checkedIn - a.checkedIn;
      if (sort === 'nickname') return String(b.nickname || '').localeCompare(String(a.nickname || ''));
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
    });
    return NextResponse.json({ success: true, users: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
