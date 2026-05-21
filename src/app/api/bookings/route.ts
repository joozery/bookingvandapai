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

    // Fetch profiles to merge
    const { data: profiles } = await supabase.from('profiles').select('*');
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach((p: any) => {
        if (p.lineUserId) {
          profileMap.set(p.lineUserId, p);
        }
      });
    }

    const merged = (bookings || []).map((booking: any) => {
      const profile = profileMap.get(booking.lineUserId);
      return {
        ...booking,
        nationalId: booking.nationalId || profile?.nationalId || null,
        birthDate: booking.birthDate || profile?.birthDate || null,
        emergencyName: booking.emergencyName || profile?.emergencyName || null,
        emergencyPhone: booking.emergencyPhone || profile?.emergencyPhone || null,
        allergies: booking.allergies || profile?.allergies || null,
        medicalConditions: booking.medicalConditions || profile?.medicalConditions || null,
        profile: profile || null
      };
    });

    return NextResponse.json({ success: true, bookings: merged });
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
      const isStaffInSubsequentVan = seat.type === 'staff' && (van.vanNumber || 1) > 1;
      if (!isStaffInSubsequentVan) {
        return NextResponse.json({ success: false, error: 'Only customer seats can be booked' }, { status: 400 });
      }
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

    // 3. Create and insert the booking
    const newBookingId = `booking-${Date.now()}`;
    const isTransfer = !!replacesBookingId;

    // Fetch user profile to copy insurance info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('lineUserId', lineUserId)
      .single();

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
      status: isTransfer ? 'pending' : 'approved',
      createdAt: new Date().toISOString(),
      checkedIn: false,
      replacesBookingId: replacesBookingId || null,
      note: note || '',
      nationalId: profile?.nationalId || null,
      birthDate: profile?.birthDate || null,
      emergencyName: profile?.emergencyName || null,
      emergencyPhone: profile?.emergencyPhone || null,
      allergies: profile?.allergies || null,
      medicalConditions: profile?.medicalConditions || null,
    };

    const { error: insertError } = await supabase.from('bookings').insert([newBooking]);
    if (insertError) throw insertError;

    // 4. Update the seat status in Van directly if it's a normal booking (auto-approved)
    if (!isTransfer) {
      seats[seatIndex].status = 'booked';
      seats[seatIndex].bookingId = newBookingId;

      const { error: updateVanError } = await supabase.from('vans').update({ seats }).eq('id', vanId);
      if (updateVanError) {
         // Rollback booking if van update fails
         await supabase.from('bookings').delete().eq('id', newBookingId);
         throw updateVanError;
      }
    }

    return NextResponse.json({
      success: true,
      booking: newBooking,
      message: isTransfer 
        ? 'ส่งคำขอย้ายที่นั่งเรียบร้อยแล้ว! กรุณารอแอดมินอนุมัติ' 
        : 'จองที่นั่งสำเร็จและได้รับการอนุมัติทันที!'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
