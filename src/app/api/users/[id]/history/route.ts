import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { requireAdmin } from '@/lib/adminAuth';
import { getMongoDb } from '@/lib/mongodb';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: Request, props: RouteParams) {
  const admin = await requireAdmin(['users', 'insurance', 'bookings']);
  if (admin instanceof Response) return admin;
  try {
    const { id: lineUserId } = await props.params;
    
    const db = await getMongoDb();
    const bookings = await db.collection('bookings').find(
      { lineUserId },
      { projection: { _id: 0, id: 1, status: 1, createdAt: 1, seatLabel: 1, tripId: 1, vanId: 1 } },
    ).sort({ createdAt: -1 }).toArray();
    const tripIds = [...new Set(bookings.map(booking => String(booking.tripId || '')).filter(Boolean))];
    const vanIds = [...new Set(bookings.map(booking => String(booking.vanId || '')).filter(Boolean))];
    const [trips, vans] = await Promise.all([
      tripIds.length ? db.collection('trips').find({ id: { $in: tripIds } }, { projection: { _id: 0, id: 1, name: 1, departureDate: 1, pickupPoint: 1, departureTime: 1 } }).toArray() : [],
      vanIds.length ? db.collection('vans').find({ id: { $in: vanIds } }, { projection: { _id: 0, id: 1, vanNumber: 1, plateNumber: 1 } }).toArray() : [],
    ]);
    const tripMap = new Map(trips.map(trip => [String(trip.id), trip] as const));
    const vanMap = new Map(vans.map(van => [String(van.id), van] as const));
    const enrichedBookings = bookings.map(booking => ({
      ...booking,
      trips: tripMap.get(String(booking.tripId)) || null,
      vans: vanMap.get(String(booking.vanId)) || null,
    }));

    return NextResponse.json({ success: true, bookings: enrichedBookings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
