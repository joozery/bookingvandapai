import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { dataStore } from '@/lib/dataStore';
import { isTripReviewOpen } from '@/lib/tripReview';
import { paymentUser, checkPaymentOrigin, paymentError } from '@/lib/paymentAuth';
import { bookPaidSeat, expireOverdueDepositBookings } from '@/lib/paymentStore';
import { bookingPayments } from '@/lib/bookingPayments';
import { requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';
import { getMongoDb } from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    const vanId = searchParams.get('vanId');
    const lineUserId = searchParams.get('lineUserId');
    const pageValue = Number(searchParams.get('page') || 0);
    const pageSize = Math.min(20, Math.max(1, Number(searchParams.get('pageSize') || 20)));
    const paged = Number.isFinite(pageValue) && pageValue > 0;
    const status = searchParams.get('status');
    const search = (searchParams.get('q') || '').trim();
    const tripStatus = searchParams.get('tripStatus');
    const pendingChange = searchParams.get('pendingChange') === '1';

    // A customer may list only their own bookings; anything else is staff-only.
    const access = lineUserId ? await requireOwnerOrAdmin(lineUserId, []) : await requireAdmin([]);
    if (access instanceof Response) return access;
    await expireOverdueDepositBookings();
    let tripScope: string[] | null = null;
    if (tripStatus === 'active' || tripStatus === 'completed') {
      let tripQuery = dataStore.from('trips').select('id');
      tripQuery = tripStatus === 'completed' ? tripQuery.eq('status', 'completed') : tripQuery.neq('status', 'completed');
      const { data: scopedTrips, error: tripScopeError } = await tripQuery;
      if (tripScopeError) throw tripScopeError;
      tripScope = (scopedTrips || []).map((trip: any) => String(trip.id));
    }
    let query = dataStore.from('bookings').select('*', paged ? { count: 'exact' } : undefined).order('createdAt', { ascending: false });

    if (tripId) query = query.eq('tripId', tripId);
    if (vanId) query = query.eq('vanId', vanId);
    if (lineUserId) query = query.eq('lineUserId', lineUserId);
    if (status && status !== 'all') query = query.eq('status', status);
    if (pendingChange) query = query.neq('replacesBookingId', null);
    if (tripScope) query = tripScope.length ? query.in('tripId', tripScope) : query.eq('tripId', '__no_matching_trip__');
    if (search) {
      const safeSearch = search.replace(/[%(),]/g, ' ').trim();
      if (safeSearch) query = query.or(`fullName.ilike.%${safeSearch}%,nickname.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,seatLabel.ilike.%${safeSearch}%`);
    }
    if (paged) query = query.range((pageValue - 1) * pageSize, pageValue * pageSize - 1);

    // Only load the relevant profile for customer requests. Admin requests
    // without a lineUserId still receive the complete profile merge as before.
    // Profiles do not depend on the bookings result, so read both together.
    let profilesQuery = dataStore.from('profiles').select('*');
    if (lineUserId) profilesQuery = profilesQuery.eq('lineUserId', lineUserId);
    const [{ data: bookings, error, count }, { data: profiles }] = await Promise.all([query, profilesQuery]);
    if (error) throw error;
    const profileMap = new Map();
    if (profiles) {
      profiles.forEach((p: any) => {
        if (p.lineUserId) {
          profileMap.set(p.lineUserId, p);
        }
      });
    }

    // Enrich all returned bookings in one query so the client does not need
    // one additional /api/bookings/:id request per booking.
    const tripIds = [...new Set((bookings || []).map((booking: any) => booking.tripId).filter(Boolean))];
    const vanIds = [...new Set((bookings || []).map((booking: any) => booking.vanId).filter(Boolean))];
    // Trips, vans and payments are independent reads; run them together.
    const [{ data: trips }, { data: vans }, payments] = await Promise.all([
      tripIds.length > 0
        ? dataStore.from('trips').select('id, name, departureDate, departureTime, durationDays, cost, pickupPoint').in('id', tripIds)
        : Promise.resolve({ data: [] as any[] }),
      vanIds.length > 0
        ? dataStore.from('vans').select('id, vanNumber, plateNumber, driverName, driverPhone').in('id', vanIds)
        : Promise.resolve({ data: [] as any[] }),
      bookingPayments(bookings || []),
    ]);
    const tripMap = new Map<string, any>((trips || []).map((trip: any) => [trip.id, trip] as [string, any]));
    const vanMap = new Map<string, any>((vans || []).map((van: any) => [van.id, van] as [string, any]));

    const merged = (bookings || []).map((booking: any) => {
      const profile = profileMap.get(booking.lineUserId);
      const trip = tripMap.get(booking.tripId);
      const van = vanMap.get(booking.vanId);
      return {
        ...booking,
        plateNumber: van?.plateNumber || '',
        driverName: van?.driverName || '',
        driverPhone: van?.driverPhone || '',
        vanNumber: van?.vanNumber || 1,
        payment: payments.get(booking.id) || null,
        tripName: trip?.name || 'ทริปเดินทาง',
        departureDate: trip?.departureDate || null,
        departureTime: trip?.departureTime || null,
        durationDays: trip?.durationDays || 0,
        cost: trip?.cost || 0,
        pickupPoint: trip?.pickupPoint || '',
        fullName: profile?.fullName || booking.fullName,
        nationalId: booking.nationalId || profile?.nationalId || null,
        birthDate: booking.birthDate || profile?.birthDate || null,
        emergencyName: booking.emergencyName || profile?.emergencyName || null,
        emergencyPhone: booking.emergencyPhone || profile?.emergencyPhone || null,
        allergies: booking.allergies || profile?.allergies || null,
        medicalConditions: booking.medicalConditions || profile?.medicalConditions || null,
        profile: profile || null
      };
    });

    return NextResponse.json({ success: true, bookings: merged, ...(paged ? { total: count || 0, page: pageValue, pageSize } : {}) });
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
      adminPartnerId,
    } = body;

    if (!tripId || !vanId || !seatId || !nickname || !fullName || !phone || !lineUserId) {
      return NextResponse.json({ success: false, error: 'Please provide all required booking fields' }, { status: 400 });
    }

    const manualToken = typeof body.manualToken === 'string' ? body.manualToken : '';
    const partnerAdminId = typeof adminPartnerId === 'string' ? adminPartnerId.trim().slice(0, 120) : '';
    if (partnerAdminId) {
      const adminAccount = await (await getMongoDb()).collection('admins').findOne({ id: partnerAdminId, isBlocked: { $ne: true } }, { projection: { _id: 1 } });
      if (!adminAccount) return NextResponse.json({ success: false, error: 'ไม่พบบัญชี Admin หุ้นส่วนที่เลือก' }, { status: 400 });
    }
    let manualBooking = false;
    if (manualToken) {
      const manualLink = await (await getMongoDb()).collection('manualBookingLinks').findOne({ token: manualToken, tripId, active: true });
      if (!manualLink) return NextResponse.json({ success: false, error: 'ลิงก์จอง Manual ไม่ถูกต้องหรือถูกปิดใช้งานแล้ว' }, { status: 403 });
      manualBooking = true;
    }

    // Closing checkout must never bypass verified payment for new bookings.
    if (!manualBooking) {
      try {
        checkPaymentOrigin(request);
        const user = await paymentUser();
        if (lineUserId !== user.id) throw new Error('ไม่สามารถจองแทนบัญชีอื่นได้');
        if (![tripId, vanId, seatId, nickname, fullName, phone].every(value => typeof value === 'string' && value.trim() && value.length <= 300)) throw new Error('ข้อมูลการจองไม่ถูกต้อง');
        const { data: previous, error: previousError } = await dataStore.from('bookings').select('id, paymentOrderId, vanId, seatId').eq('lineUserId', user.id).eq('tripId', tripId).in('status', ['approved', 'pending']);
        if (previousError) throw previousError;
        // Existing bookings keep the existing transfer/approval flow. New
        // bookings must consume the authenticated owner's verified payment.
        if (!previous?.length || previous.some((booking: { paymentOrderId?: string; vanId: string; seatId: string }) => booking.paymentOrderId && booking.vanId === vanId && booking.seatId === seatId)) {
          const booking = await bookPaidSeat(user.id, { tripId, vanId, seatId, nickname, fullName, phone, note }, user);
          return NextResponse.json({ success: true, booking, message: 'ชำระเงินและจองที่นั่งสำเร็จ' });
        }
      } catch (error) { return paymentError(error); }
    }

    const { data: trip, error: tripError } = await dataStore.from('trips').select('status, departureDate, durationDays').eq('id', tripId).maybeSingle();
    if (tripError) throw tripError;
    if (!trip) {
      return NextResponse.json({ success: false, error: 'Trip not found' }, { status: 404 });
    }
    if (trip.status !== 'active' || Number(trip.cost) <= 0 || isTripReviewOpen(trip)) {
      return NextResponse.json({ success: false, error: 'ทริปนี้จบไปแล้ว ไม่สามารถจองเพิ่มได้' }, { status: 409 });
    }

    // 1. Fetch Van and check seat
    const { data: van, error: vanError } = await dataStore.from('vans').select('*').eq('id', vanId).single();
    if (vanError || !van) {
      return NextResponse.json({ success: false, error: 'Van not found' }, { status: 404 });
    }
    if (van.tripId !== tripId) return NextResponse.json({ success: false, error: 'รถไม่ตรงกับทริปที่เลือก' }, { status: 400 });

    const seats = [...(van.seats || [])];
    const seatIndex = seats.findIndex((s: any) => s.id === seatId);
    
    if (seatIndex === -1) {
      return NextResponse.json({ success: false, error: 'Seat not found' }, { status: 404 });
    }

    const seat = seats[seatIndex];

    if (seat.type === 'driver') {
      return NextResponse.json({ success: false, error: 'Driver seats cannot be booked' }, { status: 400 });
    }

    if (seat.status !== 'available') {
      return NextResponse.json({ success: false, error: 'This seat is already booked or pending approval' }, { status: 400 });
    }

    // 2. Check for existing bookings
    const { data: userBookings, error: bookingsError } = await dataStore.from('bookings')
      .select('*')
      .eq('lineUserId', lineUserId)
      .eq('tripId', tripId)
      .in('status', ['approved', 'pending']);
      
    if (bookingsError) throw bookingsError;

    let replacesBookingId: string | null = null;

    if (userBookings && userBookings.length > 0) {
      const hasPendingChange = userBookings.some((b: any) => b.status === 'pending' && b.replacesBookingId);
      if (hasPendingChange) {
        return NextResponse.json({
          success: false,
          error: 'คุณมีรายการขอเปลี่ยนที่นั่งที่อยู่ระหว่างรอการอนุมัติแล้ว',
        }, { status: 400 });
      }

      const activeBooking = userBookings.find((b: any) => b.status === 'approved') || userBookings.find((b: any) => b.status === 'pending');
      
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
    const { data: profile } = await dataStore
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
      ...(manualBooking ? { bookingType: 'manual', paymentStatus: 'waived', paymentNote: 'ยกเว้นชำระเงินผ่านลิงก์ Manual' } : {}),
      ...(partnerAdminId ? { adminPartnerId: partnerAdminId } : {}),
    };

    const { error: insertError } = await dataStore.from('bookings').insert([newBooking]);
    if (insertError) throw insertError;

    // 4. Update the seat status in Van directly if it's a normal booking (auto-approved)
    if (!isTransfer) {
      seats[seatIndex].status = 'booked';
      seats[seatIndex].bookingId = newBookingId;

      const { error: updateVanError } = await dataStore.from('vans').update({ seats }).eq('id', vanId);
      if (updateVanError) {
         // Rollback booking if van update fails
         await dataStore.from('bookings').delete().eq('id', newBookingId);
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
