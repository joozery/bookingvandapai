import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const tripId = params.get('tripId');
    const page = Number(params.get('page') || 1);
    if (!tripId || !Number.isSafeInteger(page) || page < 1 || page > 100000) return NextResponse.json({ success: false, error: 'ข้อมูลทริปหรือเลขหน้าไม่ถูกต้อง' }, { status: 400, headers });
    const { data: trip, error: tripError } = await supabase.from('trips').select('id, name, status, departureDate, durationDays').eq('id', tripId).maybeSingle();
    if (tripError) throw tripError;
    if (!trip || trip.status !== 'completed') return NextResponse.json({ success: false, error: 'เปิดดูรีวิวสาธารณะได้เมื่อแอดมินปิดทริปแล้ว' }, { status: 404, headers });

    // Use the same visible-only dataset for both the average and the list.
    // Explicitly select public fields; never send LINE IDs, contact details or hidden reviews.
    const visibleReviews: { id: string; rating: number; comment: string; createdAt: string }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.from('trip_reviews').select('id, rating, comment, createdAt').eq('tripId', tripId).eq('isHidden', false).order('createdAt', { ascending: false }).order('id').range(offset, offset + 999);
      if (error) throw error;
      visibleReviews.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    const count = visibleReviews.length;
    const pageCount = Math.max(1, Math.ceil(count / 10));
    const currentPage = Math.min(page, pageCount);
    const average = count ? visibleReviews.reduce((sum, review) => sum + review.rating, 0) / count : null;
    return NextResponse.json({ success: true, trip, count, average, page: currentPage, pageCount, reviews: visibleReviews.slice((currentPage - 1) * 10, currentPage * 10) }, { headers });
  } catch {
    return NextResponse.json({ success: false, error: 'โหลดรีวิวไม่สำเร็จ กรุณาลองใหม่' }, { status: 500, headers });
  }
}
