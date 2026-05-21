import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, checkedIn, nationalId, birthDate } = body;

    const { data: booking, error: bookingError } = await supabase.from('bookings').select('*').eq('id', id).single();
    if (bookingError || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Case 1: Checking In
    if (checkedIn !== undefined) {
      const updates = {
        checkedIn: !!checkedIn,
        checkedInAt: checkedIn ? new Date().toISOString() : null,
      };
      
      const { error: updateError } = await supabase.from('bookings').update(updates).eq('id', id);
      if (updateError) throw updateError;
      
      return NextResponse.json({ success: true, booking: { ...booking, ...updates } });
    }

    // Case 2: Status Update (Approve / Reject)
    if (status) {
      if (status === 'approved') {
        // Check and update the current seat status to 'booked' (red)
        const { data: van, error: vanError } = await supabase.from('vans').select('*').eq('id', booking.vanId).single();
        if (van && !vanError) {
          const seats = [...(van.seats || [])];
          const seatIndex = seats.findIndex((s: any) => s.id === booking.seatId);
          if (seatIndex !== -1) {
            if (seats[seatIndex].status === 'booked') {
              return NextResponse.json({ success: false, error: 'ที่นั่งเป้าหมายถูกจองโดยผู้โดยสารท่านอื่นแล้ว ไม่สามารถอนุมัติได้' }, { status: 400 });
            }
            seats[seatIndex].status = 'booked';
            seats[seatIndex].bookingId = id;
            await supabase.from('vans').update({ seats }).eq('id', booking.vanId);
          }
        }

        // Update booking status
        const { error: updateError } = await supabase.from('bookings').update({ status: 'approved' }).eq('id', id);
        if (updateError) throw updateError;
        booking.status = 'approved';

        // Handle seat change request replacement if exists
        if (booking.replacesBookingId) {
          const replacesBookingId = booking.replacesBookingId;
          const { data: oldBooking } = await supabase.from('bookings').select('*').eq('id', replacesBookingId).single();
          
          if (oldBooking) {
            // Free the old seat
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
            
            // Delete the old booking
            await supabase.from('bookings').delete().eq('id', replacesBookingId);
          }
          
          // Clear replacesBookingId from current booking
          await supabase.from('bookings').update({ replacesBookingId: null }).eq('id', id);
        }
      } else if (status === 'rejected') {
        const { error: updateError } = await supabase.from('bookings').update({ status: 'rejected' }).eq('id', id);
        if (updateError) throw updateError;
        booking.status = 'rejected';

        // Free up the seat
        const { data: van, error: vanError } = await supabase.from('vans').select('*').eq('id', booking.vanId).single();
        if (van && !vanError) {
          const seats = [...(van.seats || [])];
          const seatIndex = seats.findIndex((s: any) => s.id === booking.seatId);
          if (seatIndex !== -1) {
            seats[seatIndex].status = 'available';
            seats[seatIndex].bookingId = null;
            await supabase.from('vans').update({ seats }).eq('id', booking.vanId);
          }
        }
      }

      return NextResponse.json({ success: true, booking });
    }

    // Case 3: Update Insurance Data
    if (nationalId !== undefined || birthDate !== undefined) {
      const updates: any = {};
      if (nationalId !== undefined) updates.nationalId = nationalId;
      if (birthDate !== undefined) updates.birthDate = birthDate;
      
      const { error: updateError } = await supabase.from('bookings').update(updates).eq('id', id);
      if (updateError) throw updateError;

      // Sync to profiles table so the user's profile is updated permanently
      if (booking.lineUserId) {
        const profileUpdates: any = {};
        if (nationalId !== undefined) profileUpdates.nationalId = nationalId;
        if (birthDate !== undefined) profileUpdates.birthDate = birthDate;
        
        await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('lineUserId', booking.lineUserId);
      }
      
      return NextResponse.json({ success: true, booking: { ...booking, ...updates } });
    }

    return NextResponse.json({ success: false, error: 'No update parameters provided' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const { data: booking, error: bookingError } = await supabase.from('bookings').select('*').eq('id', id).single();
    if (bookingError || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Free the seat associated with this booking
    const { data: van } = await supabase.from('vans').select('*').eq('id', booking.vanId).single();
    if (van) {
      const seats = [...(van.seats || [])];
      const seatIndex = seats.findIndex((s: any) => s.id === booking.seatId);
      if (seatIndex !== -1 && seats[seatIndex].bookingId === id) {
        seats[seatIndex].status = 'available';
        seats[seatIndex].bookingId = null;
        await supabase.from('vans').update({ seats }).eq('id', booking.vanId);
      }
    }

    // Delete the booking
    const { error: deleteError } = await supabase.from('bookings').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true, message: 'Booking cancelled and deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const { data: booking, error: bookingError } = await supabase.from('bookings').select('*').eq('id', id).single();
    if (bookingError || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Include trip and van details for convenience
    const { data: trip } = await supabase.from('trips').select('*').eq('id', booking.tripId).single();
    const { data: van } = await supabase.from('vans').select('*').eq('id', booking.vanId).single();

    // Fetch user profile to merge insurance details
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('lineUserId', booking.lineUserId)
      .single();

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        tripName: trip?.name || 'ทริปเดินทาง',
        pickupPoint: trip?.pickupPoint || '',
        departureDate: trip?.departureDate || '',
        departureTime: trip?.departureTime || '',
        durationDays: trip?.durationDays || 1,
        cost: trip?.cost || 0,
        plateNumber: van?.plateNumber || '',
        driverName: van?.driverName || '',
        driverPhone: van?.driverPhone || '',
        vanNumber: van?.vanNumber || 1,
        nationalId: booking.nationalId || profile?.nationalId || null,
        birthDate: booking.birthDate || profile?.birthDate || null,
        emergencyName: booking.emergencyName || profile?.emergencyName || null,
        emergencyPhone: booking.emergencyPhone || profile?.emergencyPhone || null,
        allergies: booking.allergies || profile?.allergies || null,
        medicalConditions: booking.medicalConditions || profile?.medicalConditions || null,
        profile: profile || null
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
