import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';

/** GET /api/users
 *  Aggregates unique LINE users from bookings table, enriched with stats.
 */
export async function GET() {
  const admin = await requireAdmin([]);
  if (admin instanceof Response) return admin;
  try {
    // Only the fields used below are read (not e.g. ID numbers or medical
    // notes), and the block-list is read at the same time.
    const [{ data: bookings, error }, { data: adminUsers }] = await Promise.all([
      supabase
        .from('bookings')
        .select('lineUserId, lineUserName, lineUserProfilePic, nickname, fullName, phone, birthDate, createdAt, status, checkedIn')
        .order('createdAt', { ascending: false }),
      // Fetch block-list from admin_users table (if exists), gracefully ignore if not
      supabase
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

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
