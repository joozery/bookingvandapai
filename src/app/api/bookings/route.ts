import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    const vanId = searchParams.get('vanId');
    const lineUserId = searchParams.get('lineUserId');
    
    let query = supabase.from('bookings').select('*').order('createdAt', { ascending: false });

    if (tripId) query = query.eq('tripId', tripId);
    if (vanId) query = query.eq('vanId', vanId);
    if (lineUserId) query = query.eq('lineUserId', lineUserId);

    const { data: bookings, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, bookings: bookings || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tripId,
      vanId,
      seatId,
      nickname,
      fullName,
      phone,
      lineUserId,
      lineUserName,
      lineUserProfilePic,
      note,
    } = body;

    if (!tripId || !vanId || !seatId || !nickname || !fullName || !phone || !lineUserId) {
      return NextResponse.json({ success: false, error: 'Please provide all required booking fields' }, { status: 400 });
    }

    // 1. Fetch Van and check seat
    const { data: van, error: vanError } = await supabase.from('vans').select('*').eq('id', vanId).single();
    if (vanError || !van) {
      return NextResponse.json({ success: false, error: 'Van not found' }, { status: 404 });
    }

    const seats = [...(van.seats || [])];
    const seatIndex = seats.findIndex((s: any) => s.id === seatId);
    
    if (seatIndex === -1) {
      return NextResponse.json({ success: false, error: 'Seat not found' }, { status: 404 });
    }

    const seat = seats[seatIndex];

    if (seat.type !== 'customer') {
      return NextResponse.json({ success: false, error: 'Only customer seats can be booked' }, { status: 400 });
    }

    if (seat.status !== 'available') {
      return NextResponse.json({ success: false, error: 'This seat is already booked or pending approval' }, { status: 400 });
    }

    // 2. Check for existing bookings
    const { data: userBookings, error: bookingsError } = await supabase.from('bookings')
      .select('*')
      .eq('lineUserId', lineUserId)
      .eq('tripId', tripId)
      .in('status', ['approved', 'pending']);
      
    if (bookingsError) throw bookingsError;

    let replacesBookingId: string | null = null;

    if (userBookings && userBookings.length > 0) {
      const hasPendingChange = userBookings.some((b) => b.status === 'pending' && b.replacesBookingId);
      if (hasPendingChange) {
        return NextResponse.json({
          success: false,
          error: 'คุณมีรายการขอเปลี่ยนที่นั่งที่อยู่ระหว่างรอการอนุมัติแล้ว',
        }, { status: 400 });
      }

      const activeBooking = userBookings.find((b) => b.status === 'approved') || userBookings.find((b) => b.status === 'pending');
      
      if (activeBooking) {
        replacesBookingId = activeBooking.id;
      } else {
        return NextResponse.json({
          success: false,
          error: 'คุณมีรายการจองสำหรับทริปนี้แล้ว',
        }, { status: 400 });
      }
    }

    // 3. Handle seat replacement immediately if replacesBookingId exists
    if (replacesBookingId) {
      const { data: oldBooking } = await supabase.from('bookings').select('*').eq('id', replacesBookingId).single();
      if (oldBooking) {
        // Free the old seat in the database
        const { data: oldVan } = await supabase.from('vans').select('*').eq('id', oldBooking.vanId).single();
        if (oldVan) {
          const oldSeats = [...(oldVan.seats || [])];
          const oldSeatIndex = oldSeats.findIndex((s: any) => s.id === oldBooking.seatId);
          if (oldSeatIndex !== -1) {
            oldSeats[oldSeatIndex].status = 'available';
            oldSeats[oldSeatIndex].bookingId = null;
            await supabase.from('vans').update({ seats: oldSeats }).eq('id', oldBooking.vanId);
          }
        }
        // Delete the old booking record
        await supabase.from('bookings').delete().eq('id', replacesBookingId);
      }
    }

    // 4. Create new booking as already APPROVED
    const newBookingId = `booking-${Date.now()}`;
    const newBooking = {
      id: newBookingId,
      tripId,
      vanId,
      seatId,
      seatLabel: seat.label,
      nickname,
      fullName,
      phone,
      lineUserId,
      lineUserName,
      lineUserProfilePic,
      status: 'approved', // Auto-approved!
      createdAt: new Date().toISOString(),
      checkedIn: false,
      replacesBookingId: null, // Seat change completed immediately
      note: note || '',
    };

    const { error: insertError } = await supabase.from('bookings').insert([newBooking]);
    if (insertError) throw insertError;

    // 5. Update the seat status in Van directly to 'booked' (auto-approved)
    seats[seatIndex].status = 'booked';
    seats[seatIndex].bookingId = newBookingId;

    const { error: updateVanError } = await supabase.from('vans').update({ seats }).eq('id', vanId);
    if (updateVanError) {
       // Rollback booking if van update fails
       await supabase.from('bookings').delete().eq('id', newBookingId);
       throw updateVanError;
    }

    return NextResponse.json({
      success: true,
      booking: newBooking,
      message: replacesBookingId 
        ? 'เปลี่ยนที่นั่งสำเร็จเรียบร้อยแล้ว!' 
        : 'จองที่นั่งสำเร็จและได้รับการอนุมัติทันที!'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
