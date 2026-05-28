import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, props: RouteParams) {
  try {
    const { id: lineUserId } = await props.params;
    
    // Fetch bookings for this lineUserId, joining with trips and vans
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        status,
        createdAt,
        seatLabel,
        trips (
          id,
          name,
          departureDate,
          pickupPoint,
          departureTime
        ),
        vans (
          vanNumber,
          plateNumber
        )
      `)
      .eq('lineUserId', lineUserId)
      .order('createdAt', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, bookings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
