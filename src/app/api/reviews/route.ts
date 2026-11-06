import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { dataStore } from '@/lib/dataStore';
import { isTripReviewOpen } from '@/lib/tripReview';
import { recordAudit } from '@/lib/audit';
import { adminWith } from '@/lib/adminAuth';
import { getMongoDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
type ReviewUser = { id?: string; role?: string };
const fields = 'id, tripId, reviewerName, rating, comment, createdAt';
const fail = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

async function canManageReviews(user: ReviewUser) {
  if (!user.id || user.role !== 'admin') return false;
  const { data: admin, error } = await dataStore.from('admins').select('username, permissions, isBlocked').eq('id', user.id).maybeSingle();
  if (error) throw error;
  return !!admin && !admin.isBlocked && (admin.username === 'admin' || admin.permissions?.includes('reviews'));
}

async function eligibility(tripId: string, userId: string) {
  const { data: trip, error } = await dataStore.from('trips').select('id, departureDate, durationDays').eq('id', tripId).maybeSingle();
  if (error) throw error;
  if (!trip) return { error: 'ไม่พบทริป', status: 404 };
  if (!isTripReviewOpen(trip)) return { error: 'เปิดประเมินตั้งแต่วันกลับ เวลา 00:00 น. ตามเวลาไทย', status: 409 };
  const { data: bookings, error: bookingError } = await dataStore.from('bookings').select('nickname, fullName').eq('tripId', tripId).eq('lineUserId', userId).eq('status', 'approved').limit(1);
  if (bookingError) throw bookingError;
  if (!bookings?.length) return { error: 'เฉพาะผู้มีการจองที่อนุมัติแล้วในทริปนี้เท่านั้นที่ประเมินได้', status: 403 };
  return { name: bookings[0].nickname || bookings[0].fullName || 'ผู้ร่วมทริป' };
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as ReviewUser | undefined;
    if (!user?.id) return fail('กรุณาเข้าสู่ระบบ', 401);
    const params = new URL(request.url).searchParams;
    if (params.get('admin') === '1') {
      if (!await canManageReviews(user)) return fail('ไม่มีสิทธิ์ดูรีวิว', 403);
      const db = await getMongoDb();
      const tripRows = await db.collection('trips').find({}, { projection: { _id: 0, id: 1, name: 1, status: 1 } }).toArray();
      const tripMap = new Map<string, any>(tripRows.map((trip: any) => [trip.id, trip] as [string, any]));
      const trip = params.get('trip') || '';
      const tripStatus = params.get('tripStatus') || '';
      const visibility = params.get('visibility') || '';
      const rating = Number(params.get('rating') || 0);
      const comment = params.get('comment') || '';
      const q = (params.get('search') || '').trim().toLocaleLowerCase('th');
      const page = Math.max(1, Number(params.get('page') || 1));
      const pageSize = 20;
      const filter: Record<string, unknown> = {};
      if (trip) filter.tripId = trip;
      if (tripStatus) filter.tripId = { $in: tripRows.filter((item: any) => item.status === tripStatus).map((item: any) => item.id) };
      if (visibility) filter.isHidden = visibility === 'hidden';
      if (rating) filter.rating = rating;
      if (comment === 'with') filter.comment = { $regex: /\S/ };
      if (comment === 'without') filter.comment = { $not: /\S/ };
      if (q) {
        const tripIds = tripRows.filter((item: any) => String(item.name || '').toLocaleLowerCase('th').includes(q)).map((item: any) => item.id);
        filter.$or = [{ reviewerName: { $regex: q, $options: 'i' } }, { comment: { $regex: q, $options: 'i' } }, ...(tripIds.length ? [{ tripId: { $in: tripIds } }] : [])];
      }
      const reviewsCollection = db.collection('trip_reviews');
      const [total, rows] = await Promise.all([
        reviewsCollection.countDocuments(filter),
        reviewsCollection.find(filter, { projection: { _id: 0, id: 1, tripId: 1, reviewerName: 1, rating: 1, comment: 1, createdAt: 1, isHidden: 1 } }).sort({ createdAt: -1, id: 1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
      ]);
      const reviews = rows.map((review: any) => ({ ...review, createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : String(review.createdAt || ''), isHidden: !!review.isHidden }));
      return NextResponse.json({ success: true, reviews, total, page, pageSize }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const tripId = params.get('tripId');
    if (!tripId) return fail('กรุณาระบุทริป', 400);
    const { data: review, error } = await dataStore.from('trip_reviews').select(fields).eq('tripId', tripId).eq('lineUserId', user.id).maybeSingle();
    if (error) throw error;
    if (!review) {
      const eligible = await eligibility(tripId, user.id);
      if (eligible.error) return fail(eligible.error, eligible.status!);
    }
    return NextResponse.json({ success: true, review }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return fail('โหลดรีวิวไม่สำเร็จ กรุณาลองใหม่', 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as ReviewUser | undefined;
    if (!user?.id || user.role === 'admin') return fail('กรุณาเข้าสู่ระบบด้วย LINE ของผู้ร่วมทริป', 401);
    let body;
    try { body = await request.json(); } catch { return fail('ข้อมูลไม่ถูกต้อง', 400); }
    if (!body || typeof body.tripId !== 'string' || !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5 || typeof body.comment !== 'string' || body.comment.length > 2000) return fail('กรุณาให้คะแนน 1–5 ดาว และข้อความไม่เกิน 2,000 ตัวอักษร', 400);
    const eligible = await eligibility(body.tripId, user.id);
    if (eligible.error) return fail(eligible.error, eligible.status!);
    const { data: review, error } = await dataStore.from('trip_reviews').insert({ tripId: body.tripId, lineUserId: user.id, reviewerName: eligible.name, rating: body.rating, comment: body.comment.trim(), createdAt: new Date() }).select(fields).single();
    if (error?.code === '23505') return fail('คุณประเมินทริปนี้แล้ว ประเมินได้หนึ่งครั้งต่อทริป', 409);
    if (error) throw error;
    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch {
    return fail('บันทึกรีวิวไม่สำเร็จ กรุณาลองใหม่', 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as ReviewUser | undefined;
    if (!user?.id) return fail('กรุณาเข้าสู่ระบบ', 401);
    if (!await canManageReviews(user)) return fail('ไม่มีสิทธิ์จัดการรีวิว', 403);
    let body;
    try { body = await request.json(); } catch { return fail('ข้อมูลไม่ถูกต้อง', 400); }
    if (!body || typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id) || typeof body.isHidden !== 'boolean') return fail('กรุณาระบุรีวิวและสถานะการแสดงผลให้ถูกต้อง', 400);
    const { data: review, error } = await dataStore.from('trip_reviews').update({ isHidden: body.isHidden }).eq('id', body.id).select(`${fields}, isHidden`).maybeSingle();
    if (error) throw error;
    if (!review) return fail('ไม่พบรีวิว', 404);
    const actor = await adminWith(['reviews']);
    if (actor) await recordAudit(actor, { action: 'update', resource: 'review', resourceId: body.id, request, summary: `${body.isHidden ? 'ซ่อน' : 'แสดง'}รีวิว` });
    return NextResponse.json({ success: true, review });
  } catch {
    return fail('เปลี่ยนสถานะรีวิวไม่สำเร็จ กรุณาลองใหม่', 500);
  }
}
