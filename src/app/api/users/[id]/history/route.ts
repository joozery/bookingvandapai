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
      // Keep the legacy tripName when it exists. Older bookings can outlive
      // their trip document, so the history should still have a useful label.
      { projection: { _id: 0, id: 1, status: 1, createdAt: 1, seatLabel: 1, tripId: 1, tripName: 1, vanId: 1 } },
    ).sort({ createdAt: -1 }).toArray();
    // Do not stringify IDs before querying. Some old records were written with
    // a non-string tripId; stringifying them makes an otherwise valid trip
    // impossible to resolve. The map below still normalizes both sides for
    // matching the enriched booking back to its trip.
    const tripIdValues = bookings.map(booking => booking.tripId).filter(value => value !== undefined && value !== null && value !== '');
    const vanIds = [...new Set(bookings.map(booking => String(booking.vanId || '')).filter(Boolean))];
    const bookingIds = bookings.map(booking => booking.id).filter(Boolean);
    const [trips, vans, paymentOrders, deletedTripAudits] = await Promise.all([
      tripIdValues.length ? db.collection('trips').find({ id: { $in: tripIdValues } }, { projection: { _id: 0, id: 1, name: 1, departureDate: 1, pickupPoint: 1, departureTime: 1 } }).toArray() : [],
      vanIds.length ? db.collection('vans').find({ id: { $in: vanIds } }, { projection: { _id: 0, id: 1, vanNumber: 1, plateNumber: 1 } }).toArray() : [],
      bookingIds.length ? db.collection('paymentOrders').find({ bookingId: { $in: bookingIds } }, { projection: { _id: 0, bookingId: 1, tripName: 1 } }).toArray() : [],
      tripIdValues.length ? db.collection('auditLogs').find({ resource: 'trip', action: 'delete', resourceId: { $in: tripIdValues } }, { projection: { _id: 0, resourceId: 1, changes: 1 } }).toArray() : [],
    ]);
    const tripMap = new Map(trips.map(trip => [String(trip.id), trip] as const));
    const vanMap = new Map(vans.map(van => [String(van.id), van] as const));
    const paymentTripNameMap = new Map(paymentOrders.map(order => [String(order.bookingId), String(order.tripName || '')] as const));
    const deletedTripMap = new Map(deletedTripAudits.map(audit => {
      const changes = Array.isArray(audit.changes) ? audit.changes : [];
      const name = changes.find(change => change.field === 'name')?.before;
      const departureDate = changes.find(change => change.field === 'departureDate')?.before;
      return [String(audit.resourceId), { id: audit.resourceId, name, departureDate }] as const;
    }));
    const enrichedBookings = bookings.map(booking => ({
      ...booking,
      trips: tripMap.get(String(booking.tripId)) || deletedTripMap.get(String(booking.tripId)) || (
        booking.tripName || paymentTripNameMap.get(String(booking.id))
          ? { name: booking.tripName || paymentTripNameMap.get(String(booking.id)) }
          : null
      ),
      vans: vanMap.get(String(booking.vanId)) || null,
    }));

    return NextResponse.json({ success: true, bookings: enrichedBookings });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'โหลดประวัติการเดินทางไม่สำเร็จ' }, { status: 500 });
  }
}
