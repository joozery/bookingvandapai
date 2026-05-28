import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { generateSeatsForVan, Trip, Van } from '@/lib/db';

export async function GET() {
  try {
    const { data: trips, error: tripsError } = await supabase.from('trips').select('*').order('created_at', { ascending: false });
    if (tripsError) throw tripsError;

    const { data: vans, error: vansError } = await supabase.from('vans').select('*');
    if (vansError) throw vansError;
    
    const enrichedTrips = (trips || []).map(trip => {
      const tripVans = (vans || []).filter(v => v.tripId === trip.id);
      let totalAvailable = 0;
      tripVans.forEach(van => {
        totalAvailable += (van.seats || []).filter((s: any) => s.type === 'customer' && s.status === 'available').length;
      });
      return { ...trip, availableSeats: totalAvailable };
    });

    return NextResponse.json({ success: true, trips: enrichedTrips });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, departureDate, durationDays, cost, pickupPoint, departureTime, tripPeriod, plateNumber, driverName, driverPhone, image } = body;

    if (!name || !departureDate || !durationDays || !cost || !pickupPoint || !departureTime) {
      return NextResponse.json({ success: false, error: 'Please provide all required trip fields' }, { status: 400 });
    }

    const newTripId = `trip-${Date.now()}`;

    const newTrip = {
      id: newTripId,
      name,
      departureDate,
      durationDays: Number(durationDays),
      cost: Number(cost),
      pickupPoint,
      departureTime,
      tripPeriod,
      image,
      status: 'active',
    };

    const { error: tripError } = await supabase.from('trips').insert([newTrip]);
    if (tripError) throw tripError;

    // Auto-create Vans for this trip
    const vansCount = Math.max(1, Number(body.vansCount || 1));
    const vansToInsert = [];
    
    for (let i = 1; i <= vansCount; i++) {
      const newVanId = `van-${newTripId}-${i}`;
      vansToInsert.push({
        id: newVanId,
        tripId: newTripId,
        vanNumber: i,
        plateNumber: i === 1 ? (plateNumber || 'ยังไม่ได้ระบุ') : 'ยังไม่ได้ระบุ',
        driverName: i === 1 ? (driverName || 'ยังไม่ได้ระบุ') : 'ยังไม่ได้ระบุ',
        driverPhone: i === 1 ? (driverPhone || 'ยังไม่ได้ระบุ') : 'ยังไม่ได้ระบุ',
        seats: generateSeatsForVan(newVanId),
      });
    }

    const { error: vanError } = await supabase.from('vans').insert(vansToInsert);
    if (vanError) throw vanError;

    return NextResponse.json({ success: true, trip: newTrip });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
