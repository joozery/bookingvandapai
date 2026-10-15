import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import { reviewCopyUpdates } from '@/lib/reviewCopy';
import { countAvailableSeats } from '@/lib/seatAvailability';
import { generateSeatsForVan, getDb, Trip, Van } from '@/lib/db';
import { getMongoDb } from '@/lib/mongodb';

const TRIPS_CACHE_TTL_MS = 15_000;
let tripsCache: { trips: any[]; expiresAt: number } | null = null;

function enrichTrips(trips: Trip[], vans: Van[]) {
  const vansByTrip = new Map<string, Van[]>();
  for (const van of vans) {
    const tripVans = vansByTrip.get(van.tripId) || [];
    tripVans.push(van);
    vansByTrip.set(van.tripId, tripVans);
  }

  return trips.map(trip => {
    const tripVans = (vansByTrip.get(trip.id) || []).sort((a, b) => (a.vanNumber || 0) - (b.vanNumber || 0));
    const totalAvailable = Array.isArray(tripVans[0]?.seats)
      ? countAvailableSeats(tripVans) ?? 0
      : tripVans.reduce((total: number, van: any) => total + (Number(van.availableSeatCount) || 0), 0);
    return { ...trip, availableSeats: totalAvailable, vans: tripVans };
  });
}

async function loadVanSummaries() {
  const db = await getMongoDb();
  return db.collection('vans').aggregate([
    { $sort: { vanNumber: 1 } },
    {
      $project: {
        id: 1,
        tripId: 1,
        vanNumber: 1,
        plateNumber: 1,
        driverName: 1,
        driverPhone: 1,
        staffName: 1,
        availableSeatCount: {
          $size: {
            $filter: {
              input: { $ifNull: ['$seats', []] },
              as: 'seat',
              cond: {
                $and: [
                  { $in: ['$$seat.type', ['customer', 'staff']] },
                  { $eq: ['$$seat.status', 'available'] },
                ],
              },
            },
          },
        },
        staffSeat: {
          $arrayElemAt: [
            {
              $filter: {
                input: { $ifNull: ['$seats', []] },
                as: 'seat',
                cond: { $eq: ['$$seat.type', 'staff'] },
              },
            },
            0,
          ],
        },
      },
    },
  ]).toArray();
}

export async function GET() {
  if (tripsCache && tripsCache.expiresAt > Date.now()) {
    return NextResponse.json({ success: true, trips: tripsCache.trips }, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=120' },
    });
  }
  try {
    // These reads are independent. Start them together so a cold Mongo
    // connection and the second collection do not add their latencies.
    const [tripsResult, vans] = await Promise.all([
      supabase.from('trips').select('id,name,departureDate,durationDays,cost,pickupPoint,departureTime,status,image,tripPeriod,guideName,reviewTitle,reviewDescription').order('created_at', { ascending: false }),
      loadVanSummaries(),
    ]);
    if (tripsResult.error) throw tripsResult.error;

    const enrichedTrips = enrichTrips(tripsResult.data || [], vans as any[]).map((trip: any) => ({
      ...trip,
      // The landing page only needs staff information. Full seat maps are
      // fetched later when the visitor selects a trip.
      vans: (trip.vans || []).map((van: any) => {
        const staffSeat = (van.seats || []).find((seat: any) => seat.type === 'staff');
        const { _id: _mongoId, seats: _seats, staffSeat: _staffSeat, availableSeatCount: _availableSeatCount, ...summary } = van;
        return {
          ...summary,
          staffName: van.staffName || van.staffSeat?.staffName || van.staffSeat?.passengerName || staffSeat?.staffName || staffSeat?.passengerName || null,
        };
      }),
    }));

    tripsCache = { trips: enrichedTrips, expiresAt: Date.now() + TRIPS_CACHE_TTL_MS };
    return NextResponse.json({ success: true, trips: enrichedTrips }, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=120' },
    });
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
