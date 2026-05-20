import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { generateSeatsForVan } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');

    let query = supabase.from('vans').select('*').order('vanNumber', { ascending: true });
    if (tripId) {
      query = query.eq('tripId', tripId);
    }
    const { data: vans, error: vansError } = await query;
    if (vansError) throw vansError;

    // Fetch bookings to enrich passenger names
    const { data: bookings, error: bookingsError } = await supabase.from('bookings').select('id, nickname, "fullName"');
    if (bookingsError) throw bookingsError;

    // Inject passenger names into seats that are booked or pending
    const enrichedVans = (vans || []).map(van => {
      const newSeats = (van.seats || []).map((seat: any) => {
        if (seat.bookingId) {
          const booking = bookings.find(b => b.id === seat.bookingId);
          if (booking) {
            return { ...seat, passengerName: booking.nickname || booking.fullName?.split(' ')[0] };
          }
        }
        return seat;
      });
      return { ...van, seats: newSeats };
    });

    return NextResponse.json({ success: true, vans: enrichedVans });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tripId, plateNumber, driverName, driverPhone } = body;

    if (!tripId) {
      return NextResponse.json({ success: false, error: 'tripId is required' }, { status: 400 });
    }
    
    // Check if trip exists
    const { data: tripData, error: tripError } = await supabase.from('trips').select('id').eq('id', tripId).single();
    if (tripError || !tripData) {
      return NextResponse.json({ success: false, error: 'Trip not found' }, { status: 404 });
    }

    // Determine the next van number for this trip
    const { data: tripVans, error: vansError } = await supabase.from('vans').select('vanNumber').eq('tripId', tripId);
    if (vansError) throw vansError;
    
    const nextVanNumber = (tripVans && tripVans.length > 0) 
      ? Math.max(...tripVans.map((v) => v.vanNumber)) + 1 
      : 1;

    const newVanId = `van-${tripId}-${nextVanNumber}-${Date.now()}`;
    const newVan = {
      id: newVanId,
      tripId,
      vanNumber: nextVanNumber,
      plateNumber: plateNumber || 'ยังไม่ระบุ',
      driverName: driverName || 'ยังไม่ระบุ',
      driverPhone: driverPhone || 'ยังไม่ระบุ',
      seats: generateSeatsForVan(newVanId),
    };

    const { error: insertError } = await supabase.from('vans').insert([newVan]);
    if (insertError) throw insertError;

    return NextResponse.json({ success: true, van: newVan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
