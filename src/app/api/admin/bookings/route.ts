// src/app/api/admin/bookings/route.ts
import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';
import { requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';

// This route is used by the admin UI (InsuranceTab) to fetch all bookings
// It bypasses RLS because the DataStore client uses the service role key.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const admin = await requireAdmin(['insurance', 'bookings']);
  if (admin instanceof Response) return admin;
  try {
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get('page') || 1));
    const pageSize = Math.min(30, Math.max(1, Number(params.get('pageSize') || 30)));
    const paged = params.has('page');
    const tripId = params.get('tripId');
    const q = (params.get('q') || '').trim().replace(/[%(),]/g, ' ');
    let bookingsQuery = dataStore.from('bookings').select('*', paged ? { count: 'exact' } : undefined).order('createdAt', { ascending: false });
    bookingsQuery = bookingsQuery.or('status.eq.approved,checkedIn.eq.true');
    if (tripId && tripId !== 'all') bookingsQuery = bookingsQuery.eq('tripId', tripId);
    if (q) bookingsQuery = bookingsQuery.or(`fullName.ilike.%${q}%,nickname.ilike.%${q}%,phone.ilike.%${q}%,nationalId.ilike.%${q}%`);
    if (paged) bookingsQuery = bookingsQuery.range((page - 1) * pageSize, page * pageSize - 1);
    const { data: bookings, error, count } = await bookingsQuery;
    if (error) {
      console.error('Admin bookings fetch error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Fetch trips and vans for resolving names
    const bookingTripIds = [...new Set((bookings || []).map((booking: any) => booking.tripId).filter(Boolean))];
    const bookingVanIds = [...new Set((bookings || []).map((booking: any) => booking.vanId).filter(Boolean))];
    const bookingUserIds = [...new Set((bookings || []).map((booking: any) => booking.lineUserId).filter(Boolean))];
    let profilesQuery = dataStore.from('profiles').select('*');
    if (bookingUserIds.length) profilesQuery = profilesQuery.in('lineUserId', bookingUserIds);
    else profilesQuery = profilesQuery.eq('lineUserId', '__no_matching_user__');
    const { data: profiles, error: profilesError } = await profilesQuery;
    if (profilesError) console.error('Admin profiles fetch error:', profilesError);
    const [{ data: trips }, { data: vans }] = await Promise.all([
      bookingTripIds.length ? dataStore.from('trips').select('id, name').in('id', bookingTripIds) : Promise.resolve({ data: [] as any[] }),
      bookingVanIds.length ? dataStore.from('vans').select('id, vanNumber').in('id', bookingVanIds) : Promise.resolve({ data: [] as any[] })
    ]);

    const profileMap = new Map();
    if (profiles) {
      profiles.forEach((p: any) => {
        if (p.lineUserId) {
          profileMap.set(p.lineUserId, p);
        }
      });
    }

    const tripMap = new Map((trips || []).map((t: any) => [t.id, t.name]));
    const vanMap = new Map((vans || []).map((v: any) => [v.id, v.vanNumber]));

    const mergedBookings = (bookings || []).map((booking: any) => {
      const profile = profileMap.get(booking.lineUserId);
      return {
        ...booking,
        fullName: profile?.fullName || booking.fullName,
        tripName: tripMap.get(booking.tripId) || 'Unknown Trip',
        vanNumber: vanMap.get(booking.vanId) || 1,
        nationalId: booking.nationalId || profile?.nationalId || null,
        birthDate: booking.birthDate || profile?.birthDate || null,
        emergencyName: booking.emergencyName || profile?.emergencyName || null,
        emergencyPhone: booking.emergencyPhone || profile?.emergencyPhone || null,
        allergies: booking.allergies || profile?.allergies || null,
        medicalConditions: booking.medicalConditions || profile?.medicalConditions || null,
        profile: profile || null
      };
    });

    return NextResponse.json({ success: true, bookings: mergedBookings, ...(paged ? { total: count || 0, page, pageSize } : {}) });
  } catch (e: any) {
    console.error('Unexpected error fetching admin bookings:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
