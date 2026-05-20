import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('trips').delete().eq('id', id);
    
    if (error) throw error;
    
    // Note: Due to ON DELETE CASCADE on vans and bookings, 
    // related records will be automatically deleted by Supabase!

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, departureDate, durationDays, cost, pickupPoint, departureTime, tripPeriod, image } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (departureDate !== undefined) updates.departureDate = departureDate;
    if (durationDays !== undefined) updates.durationDays = Number(durationDays);
    if (cost !== undefined) updates.cost = Number(cost);
    if (pickupPoint !== undefined) updates.pickupPoint = pickupPoint;
    if (departureTime !== undefined) updates.departureTime = departureTime;
    if (tripPeriod !== undefined) updates.tripPeriod = tripPeriod;
    if (image !== undefined) updates.image = image;

    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, trip: data?.[0] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

