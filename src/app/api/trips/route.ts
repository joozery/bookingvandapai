import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { dataStore } from '@/lib/dataStore';
import { reviewCopyUpdates } from '@/lib/reviewCopy';
import { countAvailableSeats } from '@/lib/seatAvailability';
import { generateSeatsForVan, getDb, Trip, Van } from '@/lib/db';
import { getMongoDb } from '@/lib/mongodb';
import { normalizeDepositAmount, flashSaleActive } from '@/lib/paymentRules';
import { requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';



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

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get('page') || 1));
    const pageSize = Math.min(20, Math.max(1, Number(params.get('pageSize') || 20)));
    const paged = params.has('page');
    const status = params.get('status') || 'all';
    const search = (params.get('q') || '').trim();
    const tripId = params.get('tripId') || '';
    const tripName = params.get('tripName') || '';
    // These reads are independent. Start them together so a cold Mongo
    // connection and the second collection do not add their latencies.
    let tripsQuery = dataStore.from('trips').select('id,name,departureDate,durationDays,cost,flashSalePrice,depositAmount,pickupPoint,departureTime,status,image,tripPeriod,guideName,reviewTitle,reviewDescription,isTestTrip', paged ? { count: 'exact' } : undefined).order('created_at', { ascending: false });
    if (status !== 'all') tripsQuery = tripsQuery.eq('status', status);
    if (tripId) tripsQuery = tripsQuery.eq('id', tripId);
    if (tripName) tripsQuery = tripsQuery.eq('name', tripName);
    if (search) {
      const safeSearch = search.replace(/[%(),]/g, ' ');
      tripsQuery = tripsQuery.or(`name.ilike.%${safeSearch}%,pickupPoint.ilike.%${safeSearch}%,departureDate.ilike.%${safeSearch}%,tripPeriod.ilike.%${safeSearch}%`);
    }
    if (paged) tripsQuery = tripsQuery.range((page - 1) * pageSize, page * pageSize - 1);
    const [tripsResult, vans] = await Promise.all([
      tripsQuery,
      loadVanSummaries(),
    ]);
    if (tripsResult.error) throw tripsResult.error;

    const enrichedTrips = enrichTrips(tripsResult.data || [], vans as any[]).map((trip: any) => ({
      ...trip,
      flashSaleActive: flashSaleActive(trip),
      displayCost: flashSaleActive(trip) ? Number(trip.flashSalePrice) : Number(trip.cost),
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

    {
      const db = await getMongoDb();
      const holds = await db.collection('paymentOrders').aggregate([
        { $match: { bookingId: { $exists: false }, $or: [{ status: { $in: ['deposit_paid', 'paid'] } }, { status: 'pending', expiresAt: { $gt: Date.now() } }] } },
        { $group: { _id: '$tripId', count: { $sum: 1 } } },
      ]).toArray();
      const byTrip = new Map(holds.map(hold => [hold._id, hold.count]));
      // Capacity documents include holds whose initial order write is being
      // recovered. Once initialized they are the reservation authority.
      const capacities = await db.collection('paymentCapacity').find({}, { projection: { holds: 1 } }).toArray();
      for (const capacity of capacities) byTrip.set(capacity._id, (capacity.holds || []).filter((hold: { paid: boolean; expiresAt: number }) => hold.paid || hold.expiresAt > Date.now()).length);
      for (const trip of enrichedTrips) trip.availableSeats = Math.max(0, trip.availableSeats - (byTrip.get(trip.id) || 0));
      return NextResponse.json({ success: true, trips: enrichedTrips, ...(paged ? { total: tripsResult.count || 0, page, pageSize } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
    }
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
  const admin = await requireAdmin(['trips']);
  if (admin instanceof Response) return admin;
  try {
    const body = await request.json();
    if (body.guideName !== undefined && (typeof body.guideName !== 'string' || body.guideName.trim().length > 200)) {
      return NextResponse.json({ success: false, error: 'ชื่อสตาฟต้องเป็นข้อความไม่เกิน 200 ตัวอักษร' }, { status: 400 });
    }
    const { name, departureDate, durationDays, cost, pickupPoint, departureTime, tripPeriod, plateNumber, driverName, driverPhone, image } = body;

    if (!name || !departureDate || !durationDays || !pickupPoint || !departureTime) {
      return NextResponse.json({ success: false, error: 'Please provide all required trip fields' }, { status: 400 });
    }

    const tripCost = cost === '' || cost === null || cost === undefined ? 0 : Number(cost);
    if (!Number.isFinite(tripCost) || tripCost < 0) {
      return NextResponse.json({ success: false, error: 'Invalid trip cost' }, { status: 400 });
    }
    const flashSalePrice = body.flashSalePrice === '' || body.flashSalePrice === null || body.flashSalePrice === undefined ? null : Number(body.flashSalePrice);
    if (flashSalePrice !== null && (!Number.isFinite(flashSalePrice) || flashSalePrice <= 0 || flashSalePrice >= tripCost)) {
      return NextResponse.json({ success: false, error: 'ราคา Flash Sale ต้องมากกว่า 0 และต่ำกว่าราคาปกติ' }, { status: 400 });
    }

    let depositAmount: number | null;
    try { depositAmount = tripCost > 0 ? normalizeDepositAmount(body.depositAmount, tripCost) : null; }
    catch (error) { return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 }); }

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
      cost: tripCost,
      flashSalePrice,
      depositAmount,
      pickupPoint,
      departureTime,
      tripPeriod,
      image,
      status: 'draft',
    };

    const { error: tripError } = await dataStore.from('trips').insert([newTrip]);
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

    const { error: vanError } = await dataStore.from('vans').insert(vansToInsert);
    if (vanError) throw vanError;

    await recordAudit(admin, { action: 'create', resource: 'trip', resourceId: newTripId, request, summary: `สร้างทริป ${name}`, after: { name, departureDate, cost: Number(cost), depositAmount } });
    return NextResponse.json({ success: true, trip: newTrip });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
