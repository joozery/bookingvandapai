import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { data: van, error: vanError } = await supabase.from('vans').select('*').eq('id', id).single();
    if (vanError || !van) {
      return NextResponse.json({ success: false, error: 'Van not found' }, { status: 404 });
    }

    // Check if we are updating a staff seat name
    if (body.updateSeatId && body.staffName !== undefined) {
      const seats = [...(van.seats || [])];
      const seatIndex = seats.findIndex((s: any) => s.id === body.updateSeatId);
      if (seatIndex !== -1 && seats[seatIndex].type === 'staff') {
        seats[seatIndex].staffName = body.staffName;
        
        const { error: updateError } = await supabase.from('vans').update({ seats }).eq('id', id);
        if (updateError) throw updateError;
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: 'Staff seat not found' }, { status: 404 });
    } else {
      // General van details update
      const updates: any = {};
      if (body.plateNumber !== undefined) updates.plateNumber = body.plateNumber;
      if (body.driverName !== undefined) updates.driverName = body.driverName;
      if (body.driverPhone !== undefined) updates.driverPhone = body.driverPhone;

      const { error: updateError } = await supabase.from('vans').update(updates).eq('id', id);
      if (updateError) throw updateError;
      
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Check if it's the last van
    const { data: van, error: vanError } = await supabase.from('vans').select('tripId').eq('id', id).single();
    if (vanError || !van) {
      return NextResponse.json({ success: false, error: 'Van not found' }, { status: 404 });
    }

    const { count, error: countError } = await supabase.from('vans')
      .select('id', { count: 'exact' })
      .eq('tripId', van.tripId);
      
    if (countError) throw countError;

    if (count && count <= 1) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete the only van of this trip. A trip must have at least one van.',
      }, { status: 400 });
    }

    // Delete van (bookings cascade automatically in DB if setup correctly)
    const { error: deleteError } = await supabase.from('vans').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: 'Van and associated bookings deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
