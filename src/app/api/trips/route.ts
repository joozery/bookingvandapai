import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { reviewCopyUpdates } from '@/lib/reviewCopy';
import { countAvailableSeats } from '@/lib/seatAvailability';
import { generateSeatsForVan, getDb, Trip, Van } from '@/lib/db';

function enrichTrips(trips: Trip[], vans: Van[]) {
  const vansByTrip = new Map<string, Van[]>();
  for (const van of vans) {
    const tripVans = vansByTrip.get(van.tripId) || [];
    tripVans.push(van);
    vansByTrip.set(van.tripId, tripVans);
  }

  return trips.map(trip => {
    const tripVans = (vansByTrip.get(trip.id) || []).sort((a, b) => (a.vanNumber || 0) - (b.vanNumber || 0));
    const totalAvailable = countAvailableSeats(tripVans) ?? 0;
    return { ...trip, availableSeats: totalAvailable, vans: tripVans };
  });
}

export async function GET() {
  try {
    // These reads are independent. Start them together so a cold Mongo
    // connection and the second collection do not add their latencies.
    const [tripsResult, vansResult] = await Promise.all([
      supabase.from('trips').select('*').order('created_at', { ascending: false }),
      supabase.from('vans').select('*').order('vanNumber', { ascending: true }),
    ]);
    if (tripsResult.error) throw tripsResult.error;
    if (vansResult.error) throw vansResult.error;

    const enrichedTrips = enrichTrips(tripsResult.data || [], vansResult.data || []);

    return NextResponse.json({ success: true, trips: enrichedTrips });
  } catch (error: any) {
    // Development fallback only: keep the local preview usable when the
    // external MongoDB host is unreachable. Production never falls back to
    // stale local data.
    const isLocalNetworkBlock = String(error?.message || '').includes('EACCES');
    if (process.env.NODE_ENV !== 'production' || isLocalNetworkBlock) {
      const local = getDb();
      return NextResponse.json({ success: true, trips: enrichTrips(local.trips, local.vans), source: 'local-fallback' });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.guideName !== undefined && (typeof body.guideName !== 'string' || body.guideName.trim().length > 200)) {
      return NextResponse.json({ success: false, error: 'ชื่อสตาฟต้องเป็นข้อความไม่เกิน 200 ตัวอักษร' }, { status: 400 });
    }
    const { name, departureDate, durationDays, cost, pickupPoint, departureTime, tripPeriod, plateNumber, driverName, driverPhone, image } = body;

    if (!name || !departureDate || !durationDays || !cost || !pickupPoint || !departureTime) {
      return NextResponse.json({ success: false, error: 'Please provide all required trip fields' }, { status: 400 });
    }

    const newTripId = `trip-${Date.now()}`;
    let reviewCopy;
    try { reviewCopy = reviewCopyUpdates(body); }
    catch (error) { return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 }); }

    const newTrip = {
      ...reviewCopy,
      id: newTripId,
      guideName: body.guideName?.trim() || '',
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
    const vansList = body.vansList || [];
    const vansToInsert: any[] = [];
    
    for (let i = 1; i <= vansCount; i++) {
      const newVanId = `van-${newTripId}-${i}`;
      const vanData = vansList[i - 1] || {};
      
      vansToInsert.push({
        id: newVanId,
        tripId: newTripId,
        vanNumber: i,
        plateNumber: vanData.plateNumber || 'ยังไม่ได้ระบุ',
        driverName: vanData.driverName || 'ยังไม่ได้ระบุ',
        driverPhone: vanData.driverPhone || 'ยังไม่ได้ระบุ',
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
