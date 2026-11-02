import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { reviewCopyUpdates } from '@/lib/reviewCopy';
import { normalizeDepositAmount } from '@/lib/paymentRules';
import { requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  const admin = await requireAdmin(['trips']);
  if (admin instanceof Response) return admin;
  try {
    const { id } = await params;
    const { data: deletedTrip } = await supabase.from('trips').select('id, name, departureDate, cost').eq('id', id).maybeSingle();
    const { error } = await supabase.from('trips').delete().eq('id', id);
    
    if (error) throw error;
    
    // Note: Due to ON DELETE CASCADE on vans and bookings, 
    // related records will be automatically deleted by Supabase!

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
    const { name, departureDate, durationDays, cost, pickupPoint, departureTime, tripPeriod, image, status } = body;

    if (status !== undefined && status !== 'active' && status !== 'completed') {
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
    if (pickupPoint !== undefined) updates.pickupPoint = pickupPoint;
    if (departureTime !== undefined) updates.departureTime = departureTime;
    if (tripPeriod !== undefined) updates.tripPeriod = tripPeriod;
    if (image !== undefined) updates.image = image;

    // Check existence separately. Some Supabase/RLS configurations return an
    // empty representation from update().select() even when the update succeeds.
    const { data: existingTrip, error: findError } = await supabase
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
      try { updates.depositAmount = normalizeDepositAmount(deposit, updates.cost ?? existingTrip.cost); }
      catch (error) { return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 }); }
    }

    const { error: updateError } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;

    await recordAudit(admin, { action: 'update', resource: 'trip', resourceId: id, request, summary: `แก้ไขทริป ${existingTrip.name}`, before: existingTrip, after: { ...existingTrip, ...updates }, fields: Object.keys(updates) });
    return NextResponse.json({ success: true, trip: { ...existingTrip, ...updates } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

