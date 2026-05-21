// src/app/api/admin/bookings/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// This route is used by the admin UI (InsuranceTab) to fetch all bookings
// It bypasses RLS because the Supabase client uses the service role key.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) {
      console.error('Admin bookings fetch error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Fetch user profiles to merge into bookings
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Admin profiles fetch error:', profilesError);
    }

    const profileMap = new Map();
    if (profiles) {
      profiles.forEach((p: any) => {
        if (p.lineUserId) {
          profileMap.set(p.lineUserId, p);
        }
      });
    }

    const mergedBookings = (bookings || []).map((booking: any) => {
      const profile = profileMap.get(booking.lineUserId);
      return {
        ...booking,
        nationalId: booking.nationalId || profile?.nationalId || null,
        birthDate: booking.birthDate || profile?.birthDate || null,
        profile: profile || null
      };
    });

    return NextResponse.json({ success: true, bookings: mergedBookings });
  } catch (e: any) {
    console.error('Unexpected error fetching admin bookings:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
