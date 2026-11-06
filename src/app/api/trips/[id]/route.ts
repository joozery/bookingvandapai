import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';
import { reviewCopyUpdates } from '@/lib/reviewCopy';
import { normalizeDepositAmount } from '@/lib/paymentRules';
import { requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';
import { paymentDb, type PaymentOrder } from '@/lib/paymentStore';
import { grantCredit } from '@/lib/creditStore';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const admin = await requireAdmin(['trips']);
  if (admin instanceof Response) return admin;
  try {
    const { id } = await params;
    const db = await paymentDb();
    const orders = await db.collection<PaymentOrder>('paymentOrders').find({ tripId: id, paidSatang: { $gt: 0 } }, { projection: { _id: 0, id: 1, userId: 1, userName: 1, paidSatang: 1 } }).toArray();
    const userIds = [...new Set(orders.map(order => order.userId))];
    const { data: profiles } = userIds.length ? await dataStore.from('profiles').select('lineUserId, fullName, nickname, lineUserName').in('lineUserId', userIds) : { data: [] };
    const profileMap = new Map<string, { lineUserId: string; fullName?: string; nickname?: string; lineUserName?: string }>();
    for (const profile of profiles || []) {
      const value = profile as { lineUserId: string; fullName?: string; nickname?: string; lineUserName?: string };
      profileMap.set(value.lineUserId, value);
    }
    return NextResponse.json({ success: true, recipients: orders.map(order => {
      const profile = profileMap.get(order.userId);
      return { orderId: order.id, userId: order.userId, name: profile?.fullName || profile?.nickname || profile?.lineUserName || order.userName || order.userId, amountSatang: order.paidSatang };
    }) });
  } catch (error: any) { return NextResponse.json({ success: false, error: error.message }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const admin = await requireAdmin(['trips']);
  if (admin instanceof Response) return admin;
  try {
    const { id } = await params;
    const { data: deletedTrip } = await dataStore.from('trips').select('id, name, departureDate, cost').eq('id', id).maybeSingle();
    const { error } = await dataStore.from('trips').delete().eq('id', id);
    
    if (error) throw error;
    
    // Note: Due to ON DELETE CASCADE on vans and bookings, 
    // related records will be automatically deleted by DataStore!

    await recordAudit(admin, { action: 'delete', resource: 'trip', resourceId: id, request, summary: `ลบทริป ${deletedTrip?.name || id}`, before: deletedTrip || null });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const admin = await requireAdmin(['trips', 'completed-trips']);
  if (admin instanceof Response) return admin;
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.guideName !== undefined && (typeof body.guideName !== 'string' || body.guideName.trim().length > 200)) {
      return NextResponse.json({ success: false, error: 'ชื่อสตาฟต้องเป็นข้อความไม่เกิน 200 ตัวอักษร' }, { status: 400 });
    }
    const { name, departureDate, durationDays, cost, flashSalePrice, pickupPoint, departureTime, tripPeriod, image, status } = body;

    if (status !== undefined && status !== 'draft' && status !== 'active' && status !== 'completed' && status !== 'cancelled') {
      return NextResponse.json({ success: false, error: 'Invalid trip status' }, { status: 400 });
    }

    const updates: any = {};
    if (body.guideName !== undefined) updates.guideName = body.guideName.trim();
    try { Object.assign(updates, reviewCopyUpdates(body)); }
    catch (error) { return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 }); }
    if (status !== undefined) updates.status = status;
    if (name !== undefined) updates.name = name;
    if (departureDate !== undefined) updates.departureDate = departureDate;
    if (durationDays !== undefined) updates.durationDays = Number(durationDays);
    if (cost !== undefined) updates.cost = Number(cost);
    if (flashSalePrice !== undefined) updates.flashSalePrice = flashSalePrice === '' || flashSalePrice === null ? null : Number(flashSalePrice);
    if (pickupPoint !== undefined) updates.pickupPoint = pickupPoint;
    if (departureTime !== undefined) updates.departureTime = departureTime;
    if (tripPeriod !== undefined) updates.tripPeriod = tripPeriod;
    if (image !== undefined) updates.image = image;

    // Check existence separately. Some DataStore/RLS configurations return an
    // empty representation from update().select() even when the update succeeds.
    const { data: existingTrip, error: findError } = await dataStore
      .from('trips')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw findError;
    if (!existingTrip) {
      return NextResponse.json({ success: false, error: 'Trip not found' }, { status: 404 });
    }

    // Deposit is validated against the price being saved (or the current one).
    if (body.depositAmount !== undefined || cost !== undefined) {
      const deposit = body.depositAmount !== undefined ? body.depositAmount : existingTrip.depositAmount;
      const savedCost = Number(updates.cost ?? existingTrip.cost ?? 0);
      try { updates.depositAmount = savedCost > 0 ? normalizeDepositAmount(deposit, savedCost) : null; }
      catch (error) { return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 }); }
    }

    const finalStatus = updates.status ?? existingTrip.status;
    const finalCost = Number(updates.cost ?? existingTrip.cost ?? 0);
    const finalFlashSale = updates.flashSalePrice !== undefined ? updates.flashSalePrice : existingTrip.flashSalePrice;
    if (finalFlashSale !== null && finalFlashSale !== undefined && finalFlashSale !== '' && (!Number.isFinite(Number(finalFlashSale)) || Number(finalFlashSale) <= 0 || Number(finalFlashSale) >= finalCost)) {
      return NextResponse.json({ success: false, error: 'ราคา Flash Sale ต้องมากกว่า 0 และต่ำกว่าราคาปกติ' }, { status: 400 });
    }
    if (finalStatus === 'active' && (!Number.isFinite(finalCost) || finalCost <= 0)) {
      return NextResponse.json({ success: false, error: 'กรุณาใส่ราคาทริปก่อนเปิดทริป' }, { status: 400 });
    }

    const { error: updateError } = await dataStore
      .from('trips')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;

    if (finalStatus === 'cancelled' && existingTrip.status !== 'cancelled') {
      const db = await paymentDb();
      const paidOrders = await db.collection<PaymentOrder>('paymentOrders').find({ tripId: id, paidSatang: { $gt: 0 } }).toArray();
      for (const order of paidOrders) {
        await grantCredit({ userId: order.userId, amountSatang: order.paidSatang, sourceKey: `trip-cancel:${id}:${order.id}`, sourceTripId: id, reason: `คืนเครดิตจากการยกเลิกทริป ${existingTrip.name}` });
      }
      const { data: tripBookings } = await dataStore.from('bookings').select('id, vanId, seatId').eq('tripId', id).in('status', ['pending', 'approved', 'cancel_pending']);
      for (const booking of tripBookings || []) {
        await dataStore.from('bookings').update({ status: 'rejected' }).eq('id', booking.id);
        const { data: van } = await dataStore.from('vans').select('seats').eq('id', booking.vanId).maybeSingle();
        if (van?.seats) {
          const seats = van.seats.map((seat: any) => seat.id === booking.seatId ? { ...seat, status: 'available', bookingId: null } : seat);
          await dataStore.from('vans').update({ seats }).eq('id', booking.vanId);
        }
      }
    }

    await recordAudit(admin, { action: 'update', resource: 'trip', resourceId: id, request, summary: `แก้ไขทริป ${existingTrip.name}`, before: existingTrip, after: { ...existingTrip, ...updates }, fields: Object.keys(updates) });
    return NextResponse.json({ success: true, trip: { ...existingTrip, ...updates } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

