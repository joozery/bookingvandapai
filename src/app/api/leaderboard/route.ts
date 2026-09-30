import { NextResponse } from 'next/server';
import { bookingLeaderboard } from '@/lib/bookingLeaderboard';
import { leaderboardKey, loadHiddenLeaderboardKeys, loadLeaderboardBookings } from '@/lib/leaderboardStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const page = Number(new URL(request.url).searchParams.get('page') || 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    return NextResponse.json({ success: false, error: 'เลขหน้าไม่ถูกต้อง' }, { status: 400 });
  }
  try {
    const [bookings, hiddenKeys] = await Promise.all([loadLeaderboardBookings(), loadHiddenLeaderboardKeys()]);
    const hiddenUsers = new Set(bookings.filter(booking => hiddenKeys.has(leaderboardKey(booking.lineUserId))).map(booking => booking.lineUserId));
    // Only public nicknames and aggregated counts leave the server.
    const rankings = bookingLeaderboard(bookings, hiddenUsers);
    const pageCount = Math.max(1, Math.ceil(rankings.length / 10));
    const currentPage = Math.min(page, pageCount);
    return NextResponse.json({ success: true, rankings: rankings.slice((currentPage - 1) * 10, currentPage * 10),
      total: rankings.length, page: currentPage, pageCount }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ success: false, error: 'โหลดอันดับไม่สำเร็จ กรุณาลองอีกครั้ง' }, { status: 500 });
  }
}
