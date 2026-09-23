import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { extraSeatId, setExtraSeat } from '@/lib/extraSeat';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.extraSeatEnabled !== undefined) {
      const session = await getServerSession(authOptions);
      const user = session?.user as { role?: string; username?: string; permissions?: string[] } | undefined;
      if (user?.role !== 'admin' || (user.username !== 'admin' && !user.permissions?.includes('vans'))) {
        return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์จัดการรถ' }, { status: 403 });
      }
      if (typeof body.extraSeatEnabled !== 'boolean') {
        return NextResponse.json({ success: false, error: 'สถานะเบาะเสริมไม่ถูกต้อง' }, { status: 400 });
      }
    }

    const { data: van, error: vanError } = await supabase.from('vans').select('*').eq('id', id).single();
    if (vanError || !van) {
      return NextResponse.json({ success: false, error: 'Van not found' }, { status: 404 });
    }

    if (body.extraSeatEnabled !== undefined) {
      if (!body.extraSeatEnabled) {
        // Transfer requests can be pending while the seat itself is still available.
        const { data: bookings, error } = await supabase.from('bookings').select('id')
          .eq('vanId', id).eq('seatId', extraSeatId(id))
          .in('status', ['approved', 'pending', 'cancel_pending']).limit(1);
        if (error) throw error;
        if (bookings?.length) {
          return NextResponse.json({ success: false, error: 'ไม่สามารถปิดเบาะเสริมที่มีการจองหรือรออนุมัติได้' }, { status: 409 });
        }
      }
      let seats;
      try {
        seats = setExtraSeat(van.seats || [], id, body.extraSeatEnabled);
      } catch (error) {
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 409 });
      }
      const { data: updated, error } = await supabase.from('vans').update({ seats })
        .eq('id', id).eq('seats', JSON.stringify(van.seats)).select('id');
      if (error) throw error;
      if (!updated?.length) {
        return NextResponse.json({ success: false, error: 'ข้อมูลที่นั่งเปลี่ยนแล้ว กรุณาโหลดใหม่และลองอีกครั้ง' }, { status: 409 });
      }
      return NextResponse.json({ success: true });
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
