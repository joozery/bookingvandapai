import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';
import { bookingPayments } from '@/lib/bookingPayments';
import { syncPaymentSeat } from '@/lib/seatMove';
import { requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, checkedIn, nationalId, birthDate } = body;

    const { data: booking, error: bookingError } = await dataStore.from('bookings').select('*').eq('id', id).single();
    if (bookingError || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // The owner may only request cancellation. Everything else is staff work:
    // check-in, insurance details, and approving/rejecting bookings.
    const ownerCancel = status === 'cancel_pending' && checkedIn === undefined && nationalId === undefined && birthDate === undefined;
    const needed = checkedIn !== undefined ? ['checkin', 'bookings']
      : nationalId !== undefined || birthDate !== undefined ? ['insurance', 'bookings']
      : ['bookings'];
    const access = ownerCancel ? await requireOwnerOrAdmin(booking.lineUserId, ['bookings']) : await requireAdmin(needed);
    if (access instanceof Response) return access;
    // Staff actions are audited (a customer's own cancellation request is not).
    const actor = 'username' in access ? access : null;
    const who = `${booking.fullName || booking.nickname || ''} ที่นั่ง ${booking.seatLabel || '-'}`;

    // Case 1: Checking In
    if (checkedIn !== undefined) {
      const updates = {
        checkedIn: !!checkedIn,
        checkedInAt: checkedIn ? new Date().toISOString() : null,
      };
      
      const { error: updateError } = await dataStore.from('bookings').update(updates).eq('id', id);
      if (updateError) throw updateError;
      
      if (actor) await recordAudit(actor, { action: 'update', resource: 'booking', resourceId: id, request, summary: `${updates.checkedIn ? 'เช็คอิน' : 'ยกเลิกเช็คอิน'} ${who}` });
      return NextResponse.json({ success: true, booking: { ...booking, ...updates } });
    }

    // Case 2: Status Update (Approve / Reject)
    if (status) {
      if (status === 'approved') {
        // Check and update the current seat status to 'booked' (red)
        const { data: van, error: vanError } = await dataStore.from('vans').select('*').eq('id', booking.vanId).single();
        if (van && !vanError) {
          const seats = [...(van.seats || [])];
          const seatIndex = seats.findIndex((s: any) => s.id === booking.seatId);
          if (seatIndex !== -1) {
            if (seats[seatIndex].status === 'booked' && seats[seatIndex].bookingId !== id) {
              return NextResponse.json({ success: false, error: 'ที่นั่งเป้าหมายถูกจองโดยผู้โดยสารท่านอื่นแล้ว ไม่สามารถอนุมัติได้' }, { status: 400 });
            }
            seats[seatIndex].status = 'booked';
            seats[seatIndex].bookingId = id;
            await dataStore.from('vans').update({ seats }).eq('id', booking.vanId);
          }
        }

        // Update booking status
        const { error: updateError } = await dataStore.from('bookings').update({ status: 'approved' }).eq('id', id);
        if (updateError) throw updateError;
        booking.status = 'approved';

        // Handle seat change request replacement if exists
        if (booking.replacesBookingId) {
          const replacesBookingId = booking.replacesBookingId;
          const { data: oldBooking } = await dataStore.from('bookings').select('*').eq('id', replacesBookingId).single();
          
          if (oldBooking) {
            // Free the old seat
            const { data: oldVan } = await dataStore.from('vans').select('*').eq('id', oldBooking.vanId).single();
            if (oldVan) {
              const oldSeats = [...(oldVan.seats || [])];
              const oldSeatIndex = oldSeats.findIndex((s: any) => s.id === oldBooking.seatId);
              if (oldSeatIndex !== -1) {
                oldSeats[oldSeatIndex].status = 'available';
                oldSeats[oldSeatIndex].bookingId = null;
                await dataStore.from('vans').update({ seats: oldSeats }).eq('id', oldBooking.vanId);
              }
            }
            
            // Delete the old booking
            await dataStore.from('bookings').delete().eq('id', replacesBookingId);

            // The payment moves with the customer to the replacement booking
            // (the old booking is gone, so the unique paymentOrderId is free).
            try {
              if (oldBooking.paymentOrderId) {
                await dataStore.from('bookings').update({ paymentOrderId: oldBooking.paymentOrderId }).eq('id', id);
                booking.paymentOrderId = oldBooking.paymentOrderId;
              }
              await syncPaymentSeat(booking, { vanId: oldBooking.vanId, seatId: oldBooking.seatId, seatLabel: oldBooking.seatLabel || '' }, 'อนุมัติคำขอเปลี่ยนที่นั่งของลูกค้า', replacesBookingId);
            } catch (error) {
              console.error('[seat-change:payment-sync]', error instanceof Error ? error.message : error);
            }
          }
          
          // Clear replacesBookingId from current booking
          await dataStore.from('bookings').update({ replacesBookingId: null }).eq('id', id);
        }
      } else if (status === 'rejected') {
        const { error: updateError } = await dataStore.from('bookings').update({ status: 'rejected' }).eq('id', id);
        if (updateError) throw updateError;
        booking.status = 'rejected';

        // Free up the seat
        const { data: van, error: vanError } = await dataStore.from('vans').select('*').eq('id', booking.vanId).single();
        if (van && !vanError) {
          const seats = [...(van.seats || [])];
          const seatIndex = seats.findIndex((s: any) => s.id === booking.seatId);
          if (seatIndex !== -1) {
            seats[seatIndex].status = 'available';
            seats[seatIndex].bookingId = null;
            await dataStore.from('vans').update({ seats }).eq('id', booking.vanId);
          }
        }
      } else if (status === 'cancel_pending') {
        const { error: updateError } = await dataStore.from('bookings').update({ status: 'cancel_pending' }).eq('id', id);
        if (updateError) throw updateError;
        booking.status = 'cancel_pending';
      }

      if (actor) await recordAudit(actor, { action: 'update', resource: 'booking', resourceId: id, request, summary: `${status === 'approved' ? 'อนุมัติ' : status === 'rejected' ? 'ปฏิเสธ' : 'เปลี่ยนสถานะ'}การจอง ${who}${booking.replacesBookingId ? ' (คำขอเปลี่ยนที่นั่ง)' : ''}`, changes: [{ field: 'สถานะ', before: null, after: status }] });
      return NextResponse.json({ success: true, booking });
    }

    // Case 3: Update Insurance Data
    if (nationalId !== undefined || birthDate !== undefined) {
      const updates: any = {};
      if (nationalId !== undefined) updates.nationalId = nationalId;
      if (birthDate !== undefined) updates.birthDate = birthDate;
      
      const { error: updateError } = await dataStore.from('bookings').update(updates).eq('id', id);
      if (updateError) throw updateError;

      // Sync to profiles table so the user's profile is updated permanently
      if (booking.lineUserId) {
        const profileUpdates: any = {};
        if (nationalId !== undefined) profileUpdates.nationalId = nationalId;
        if (birthDate !== undefined) profileUpdates.birthDate = birthDate;
        
        await dataStore
          .from('profiles')
          .update(profileUpdates)
          .eq('lineUserId', booking.lineUserId);
      }
      
      if (actor) await recordAudit(actor, { action: 'update', resource: 'booking', resourceId: id, request, summary: `แก้ไขข้อมูลประกัน ${who}`, changes: Object.keys(updates).map(field => ({ field: field === 'nationalId' ? 'เลขบัตรประชาชน' : 'วันเกิด', before: field === 'nationalId' && booking.nationalId ? `•••${String(booking.nationalId).slice(-4)}` : booking[field] ?? null, after: field === 'nationalId' && updates[field] ? `•••${String(updates[field]).slice(-4)}` : updates[field] })) });
      return NextResponse.json({ success: true, booking: { ...booking, ...updates } });
    }

    return NextResponse.json({ success: false, error: 'No update parameters provided' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const admin = await requireAdmin(['bookings']);
  if (admin instanceof Response) return admin;
  try {
    const { id } = await params;

    const { data: booking, error: bookingError } = await dataStore.from('bookings').select('*').eq('id', id).single();
    if (bookingError || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Free the seat associated with this booking
    const { data: van } = await dataStore.from('vans').select('*').eq('id', booking.vanId).single();
    if (van) {
      const seats = [...(van.seats || [])];
      const seatIndex = seats.findIndex((s: any) => s.id === booking.seatId);
      if (seatIndex !== -1 && seats[seatIndex].bookingId === id) {
        seats[seatIndex].status = 'available';
        seats[seatIndex].bookingId = null;
        await dataStore.from('vans').update({ seats }).eq('id', booking.vanId);
      }
    }

    // Delete the booking
    const { error: deleteError } = await dataStore.from('bookings').delete().eq('id', id);
    if (deleteError) throw deleteError;

    await recordAudit(admin, { action: 'delete', resource: 'booking', resourceId: id, request, summary: `ลบการจอง ${booking.fullName || booking.nickname || ''} ที่นั่ง ${booking.seatLabel || '-'}` });
    return NextResponse.json({ success: true, message: 'Booking cancelled and deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const { data: booking, error: bookingError } = await dataStore.from('bookings').select('*').eq('id', id).single();
    if (bookingError || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    // Ticket details include ID number and medical notes: owner or staff only.
    const access = await requireOwnerOrAdmin(booking.lineUserId, ['bookings', 'checkin', 'insurance']);
    if (access instanceof Response) return access;

    // Include trip and van details for convenience
    const payments = await bookingPayments([booking]);
    const { data: trip } = await dataStore.from('trips').select('*').eq('id', booking.tripId).single();
    const { data: van } = await dataStore.from('vans').select('*').eq('id', booking.vanId).single();

    // Fetch user profile to merge insurance details
    const { data: profile } = await dataStore
      .from('profiles')
      .select('*')
      .eq('lineUserId', booking.lineUserId)
      .single();

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        payment: payments.get(booking.id) || null,
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
        fullName: profile?.fullName || booking.fullName,
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
