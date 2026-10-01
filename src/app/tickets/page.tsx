"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import DigitalTicket from '@/components/DigitalTicket';
import { domToPng } from 'modern-screenshot';
import {
  Armchair,
  Download,
  RefreshCw,
  ChevronLeft,
  User,
  Compass,
  Search,
  AlertTriangle,
  ChevronRight,
  Ticket,
  Calendar,
  Clock,
  MapPin,
  X,
  CheckCircle2,
  Bus,
  Star,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { extraSeatId } from '@/lib/extraSeat';
import VanSeatCard from '@/components/VanSeatCard';
import { formatThaiDate } from '@/lib/dateFormat';

interface Trip {
  id: string;
  name: string;
  departureDate: string;
  durationDays: number;
  cost: number;
  pickupPoint: string;
  departureTime: string;
  tripPeriod?: string;
  image?: string;
  availableSeats?: number;
}

interface Booking {
  id: string;
  tripId: string;
  vanId: string;
  seatId: string;
  seatLabel: string;
  nickname: string;
  fullName: string;
  phone: string;
  lineUserId: string;
  lineUserName: string;
  lineUserProfilePic: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancel_pending';
  createdAt: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  replacesBookingId?: string | null;
  note?: string;
  tripName?: string;
  departureDate?: string;
  departureTime?: string;
  durationDays?: number;
  cost?: number;
  pickupPoint?: string;
  plateNumber?: string;
  driverName?: string;
  driverPhone?: string;
  vanNumber?: number;
}

export default function TicketsPage() {
  const { data: session } = useSession();
  const [lineUser, setLineUser] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingTicketId, setDownloadingTicketId] = useState<string | null>(null);
  
  // Interactive UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Van Seating Map states
  const [vans, setVans] = useState<any[]>([]);
  const [loadingVans, setLoadingVans] = useState(false);
  const [activeVanId, setActiveVanId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      setLineUser({
        userId: (session.user as any).id || session.user.email || '',
      });
    } else if (session === null) {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (lineUser?.userId) {
      fetchData();
    }
  }, [lineUser]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch both trips and user bookings concurrently
      const [tripsRes, bookingsRes] = await Promise.all([
        fetch('/api/trips'),
        fetch(`/api/bookings?lineUserId=${lineUser.userId}`),
      ]);

      const tripsData = await tripsRes.json();
      const bookingsData = await bookingsRes.json();

      if (tripsData.success) {
        setTrips(tripsData.trips);
      }

      if (bookingsData.success) {
        const fullBookings = await Promise.all(
          bookingsData.bookings.map(async (b: any) => {
            try {
              const ticketRes = await fetch(`/api/bookings/${b.id}`);
              const ticketData = await ticketRes.json();
              return ticketData.success ? ticketData.booking : b;
            } catch (e) {
              return b;
            }
          })
        );
        fullBookings.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBookings(fullBookings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Group user bookings by trip
  const bookedTrips = useMemo(() => {
    if (!bookings.length) return [];
    
    // Map trip IDs where user has at least 1 booking
    const tripBookingMap = new Map<string, Booking[]>();
    bookings.forEach((b) => {
      const list = tripBookingMap.get(b.tripId) || [];
      list.push(b);
      tripBookingMap.set(b.tripId, list);
    });

    // Build unique trip list with booking data
    const result: { trip: Trip; userBookings: Booking[] }[] = [];
    
    tripBookingMap.forEach((userBookings, tripId) => {
      // Find matching trip object or fallback from booking fields
      const matchedTrip = trips.find((t) => t.id === tripId) || {
        id: tripId,
        name: userBookings[0]?.tripName || 'ทริปเดินทาง',
        departureDate: userBookings[0]?.departureDate || '',
        durationDays: userBookings[0]?.durationDays || 1,
        cost: userBookings[0]?.cost || 0,
        pickupPoint: userBookings[0]?.pickupPoint || '',
        departureTime: userBookings[0]?.departureTime || '',
        tripPeriod: '',
      };

      result.push({
        trip: matchedTrip,
        userBookings,
      });
    });

    // Sort by departure date ascending — soonest trip appears first
    result.sort((a, b) => {
      const da = a.trip.departureDate || '';
      const db = b.trip.departureDate || '';
      return da.localeCompare(db);
    });

    return result;
  }, [bookings, trips]);

  // Filtered trips based on user search input
  const filteredBookedTrips = useMemo(() => {
    if (!searchQuery.trim()) return bookedTrips;
    const query = searchQuery.toLowerCase();
    return bookedTrips.filter(({ trip }) =>
      trip.name.toLowerCase().includes(query) ||
      (trip.departureDate && trip.departureDate.toLowerCase().includes(query))
    );
  }, [bookedTrips, searchQuery]);

  // Split into upcoming and past trips
  const { upcomingTrips, pastTrips } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming: typeof filteredBookedTrips = [];
    const past: typeof filteredBookedTrips = [];
    filteredBookedTrips.forEach((item) => {
      const dep = item.trip.departureDate;
      if (!dep) { upcoming.push(item); return; }
      const endDate = new Date(dep);
      endDate.setDate(endDate.getDate() + (item.trip.durationDays || 1));
      if (endDate < today) past.push(item);
      else upcoming.push(item);
    });
    // For past trips, sort descending so recent past trips appear first
    past.sort((a, b) => (b.trip.departureDate || '').localeCompare(a.trip.departureDate || ''));
    return { upcomingTrips: upcoming, pastTrips: past };
  }, [filteredBookedTrips]);

  // Selected Trip Data Memo
  const selectedTripData = useMemo(() => {
    return selectedTripId 
      ? bookedTrips.find((item) => item.trip.id === selectedTripId) 
      : null;
  }, [selectedTripId, bookedTrips]);

  // Fetch van data when selectedTripId changes
  useEffect(() => {
    if (!selectedTripId) {
      setVans([]);
      setActiveVanId(null);
      return;
    }

    const fetchTripVans = async () => {
      try {
        setLoadingVans(true);
        const res = await fetch(`/api/vans?tripId=${selectedTripId}`);
        const data = await res.json();
        if (data.success && data.vans) {
          setVans(data.vans);
          // Find van containing user's booking, fallback to first van
          const userVan = data.vans.find((v: any) =>
            v.seats.some((s: any) =>
              selectedTripData?.userBookings.some(
                (ub) => ub.seatId === s.id || ub.vanId === v.id || (ub.vanNumber === v.vanNumber && ub.seatLabel === s.label)
              )
            )
          );
          if (userVan) {
            setActiveVanId(userVan.id);
          } else if (data.vans.length > 0) {
            setActiveVanId(data.vans[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingVans(false);
      }
    };

    fetchTripVans();
  }, [selectedTripId, selectedTripData]);

  const handleDownload = async (ticketId: string, seatLabel: string) => {
    const ele = document.getElementById(`ticket-${ticketId}`);
    if (!ele) return;
    
    setDownloadingTicketId(ticketId);
    try {
      const dataUrl = await domToPng(ele, {
        backgroundColor: '#ffffff',
        scale: 4
      });
      const filename = `BookingTicket-Seat${seatLabel || 'X'}.png`;

      if (navigator.share) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'บัตรโดยสาร' });
            setDownloadingTicketId(null);
            return;
          }
        } catch (e) {}
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingTicketId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brand-700 bg-canvas font-bold">
        <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-md border border-purple-100">
          <RefreshCw className="w-5 h-5 text-violet-600 animate-spin" />
          <span>กำลังโหลดข้อมูลตั๋วโดยสาร...</span>
        </div>
      </div>
    );
  }

  if (!lineUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-600 bg-canvas px-4 text-center">
        <Armchair className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">กรุณาเข้าสู่ระบบก่อน</h2>
        <p className="text-sm text-slate-500 mb-6">คุณต้องเข้าสู่ระบบผ่านหน้าแรกเพื่อดูตั๋วของคุณ</p>
        <Link href="/" className="px-6 py-3 bg-brand-700 text-white rounded-xl font-bold theme-action shadow-md">
          ไปที่หน้าแรก
        </Link>
      </div>
    );
  }

  // Check if a seat belongs to current user
  const isUserSeat = (seat: any, van: any) => {
    if (!seat || !selectedTripData) return false;
    return selectedTripData.userBookings.some((b) => 
      (seat.bookingId && seat.bookingId === b.id) ||
      (b.seatId && b.seatId === seat.id) ||
      (b.vanId === van.id && b.seatLabel === seat.label) ||
      (b.vanNumber === van.vanNumber && b.seatLabel === seat.label)
    );
  };

  const renderTicketPageSeat = (seat: any, van: any) => {
    if (!seat) {
      return <div className="h-16 sm:h-20 w-full" />;
    }

    const isDriver = seat.type === 'driver';
    const isStaff = seat.type === 'staff';
    const isUser = isUserSeat(seat, van);
    const isBooked = seat.status === 'booked' || !!seat.bookingId || seat.status === 'pending';
    const isAvailable = seat.status === 'available' && !isBooked;
    const isBlocked = seat.status === 'blocked';

    return (
      <VanSeatCard
        key={seat.id}
        seat={seat}
        van={van}
        isUser={isUser}
        isBooked={isBooked}
        isAvailable={isAvailable}
        isStaff={isStaff}
        isDriver={isDriver}
        isBlocked={isBlocked}
      />
    );
  };

  const activeVan = vans.find((v) => v.id === activeVanId) || vans[0];

  return (
    <div className="min-h-screen bg-canvas text-slate-800 pb-20 font-sans">
      
      {/* Header */}
      <header className="theme-chrome bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-1 text-slate-500 hover:text-brand-700 transition">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-bold">กลับหน้าแรก</span>
        </Link>
        <h1 className="text-base font-black text-ticket-ink tracking-tight uppercase flex items-center gap-2">
          <Ticket className="w-5 h-5 text-violet-600" />
          ตั๋วของฉัน
        </h1>
        <div className="w-16"></div> {/* Spacer for centering */}
      </header>

      <main className="max-w-4xl mx-auto p-3 sm:p-5 md:p-6 mt-2">
        
        {/* VIEW 1: SELECTED TRIP TICKET VIEWER MODAL / FULL VIEW */}
        {selectedTripData ? (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
            {/* Top Back Navigation Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-purple-100 shadow-sm">
              <button
                onClick={() => setSelectedTripId(null)}
                className="inline-flex items-center gap-2 text-xs font-black text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>กลับไปเลือกทริปอื่น</span>
              </button>

              <span className="text-xs font-bold text-slate-500">
                ตั๋วทั้งหมด {selectedTripData.userBookings.length} ใบ
              </span>
            </div>

            {/* Trip Header Card */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 text-white shadow-lg bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 border border-white/20">
              {selectedTripData.trip.image && (
                <img
                  src={selectedTripData.trip.image}
                  alt={selectedTripData.trip.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
              )}
              <div className="relative z-10 space-y-2">
                <span className="bg-amber-400 text-amber-950 font-black px-3 py-1 rounded-full text-[10px] tracking-wide uppercase inline-block shadow-sm">
                  ทริปที่คุณเลือก
                </span>
                <h2 className="text-lg sm:text-2xl font-black text-white drop-shadow-sm">
                  {selectedTripData.trip.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-200">
                  <span>📅 {selectedTripData.trip.durationDays - 1} วัน {selectedTripData.trip.durationDays - 2} คืน</span>
                  <span>📍 ออกเดินทาง {formatThaiDate(selectedTripData.trip.departureDate)}</span>
                  {selectedTripData.trip.departureTime && <span>🕒 {selectedTripData.trip.departureTime} น.</span>}
                </div>
              </div>
            </div>

            {/* Grid Layout: Left = Digital Ticket(s), Right = Van Seating Map */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Digital Ticket(s) (Takes 6 cols on lg screens) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black text-sm border-b border-purple-100 pb-2">
                  <Ticket className="w-4 h-4 text-purple-600" />
                  <span>ตั๋วโดยสารของคุณ</span>
                </div>

                <div className="space-y-5">
                  {selectedTripData.userBookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-col items-center bg-white p-3 sm:p-5 rounded-3xl border border-purple-100 shadow-md transition-all hover:shadow-xl overflow-hidden"
                    >
                      <DigitalTicket booking={b as any} htmlId={`ticket-${b.id}`} />

                      <div className="w-full mt-4 flex flex-col gap-2.5">
                        <button
                          onClick={() => handleDownload(b.id, b.seatLabel)}
                          disabled={downloadingTicketId === b.id}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition duration-200 flex items-center justify-center gap-2 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {downloadingTicketId === b.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
                              <span>กำลังบันทึกรูป...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 text-purple-300" />
                              <span>บันทึกรูปตั๋ว</span>
                            </>
                          )}
                        </button>

                        <Link
                          href={`/?tripId=${b.tripId}&step=5`}
                          className="w-full py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-brand-700 text-xs font-black transition duration-200 shadow-sm text-center flex items-center justify-center gap-1"
                        >
                          <Armchair className="w-4 h-4 text-purple-600" />
                          <span>จัดการตั๋ว / ขอย้ายที่นั่ง</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Van Seating Layout (Takes 6 cols on lg screens) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-black text-sm border-b border-purple-100 pb-2">
                  <Armchair className="w-4 h-4 text-purple-600" />
                  <span>ผังที่นั่งในรถตู้</span>
                </div>

                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-purple-100 shadow-md space-y-4">
                  {loadingVans ? (
                    <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
                      <span className="text-xs font-bold">กำลังโหลดผังที่นั่ง...</span>
                    </div>
                  ) : vans.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs font-bold">
                      ยังไม่มีข้อมูลรถตู้ในทริปนี้
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Van Selector Tabs if multiple vans */}
                      {vans.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                          {vans.map((v) => {
                            const hasUserSeat = v.seats.some((s: any) => isUserSeat(s, v));
                            const isActive = activeVanId === v.id;
                            return (
                              <button
                                key={v.id}
                                onClick={() => setActiveVanId(v.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 flex items-center gap-1.5 ${
                                  isActive
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                                }`}
                              >
                                <Bus className="w-3.5 h-3.5" />
                                <span>รถตู้คันที่ {v.vanNumber}</span>
                                {hasUserSeat && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                                      isActive
                                        ? 'bg-amber-300 text-amber-950'
                                        : 'bg-purple-200 text-purple-800'
                                    }`}
                                  >
                                    ตั๋วของคุณ
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Selected Van Card Header & Info */}
                      {activeVan && (
                        <div className="space-y-3">
                          {/* Driver & Van Info Pill */}
                          <div className="bg-purple-50/80 border border-purple-100 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 text-purple-950 font-black">
                              <Bus className="w-4 h-4 text-purple-700" />
                              <span>รถตู้คันที่ {activeVan.vanNumber}</span>
                              <span className="text-purple-700 font-bold bg-white px-2 py-0.5 rounded-md border border-purple-200 text-[10.5px]">
                                {activeVan.plateNumber || 'ยังไม่ระบุทะเบียน'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-600">
                              {activeVan.driverName && (
                                <span>คนขับ: <strong className="text-slate-800">{activeVan.driverName}</strong></span>
                              )}
                              {activeVan.driverPhone && (
                                <a
                                  href={`tel:${activeVan.driverPhone}`}
                                  className="text-purple-700 font-bold hover:underline"
                                >
                                  📞 {activeVan.driverPhone}
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Realistic Van Chassis Graphic Container (Matching Reference Screenshot) */}
                          <div className="relative max-w-sm sm:max-w-md mx-auto bg-purple-50/40 p-3 sm:p-5 rounded-[44px] border-4 border-purple-200/90 shadow-xl overflow-hidden select-none my-2">
                            {/* Front Headlights */}
                            <div className="absolute top-2 left-6 w-7 h-2.5 bg-amber-300 rounded-full shadow-sm z-10" />
                            <div className="absolute top-2 right-6 w-7 h-2.5 bg-amber-300 rounded-full shadow-sm z-10" />

                            {/* Front Side Mirrors */}
                            <div className="absolute top-12 -left-1.5 w-3 h-8 bg-slate-600 rounded-l-md shadow-sm z-10" />
                            <div className="absolute top-12 -right-1.5 w-3 h-8 bg-slate-600 rounded-r-md shadow-sm z-10" />

                            {/* Rear Wheels */}
                            <div className="absolute bottom-16 -left-1.5 w-3 h-10 bg-slate-700 rounded-l-md shadow-sm z-10" />
                            <div className="absolute bottom-16 -right-1.5 w-3 h-10 bg-slate-700 rounded-r-md shadow-sm z-10" />

                            {/* Dashboard Console & Steering Wheel Line */}
                            <div className="w-full bg-slate-100/90 border border-slate-200 rounded-2xl p-2 mb-3 flex items-center justify-between text-slate-500 text-[10px] font-bold">
                              <span className="text-[10px] text-slate-400 pl-2 uppercase tracking-wider">หน้ารถ</span>
                              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-xs text-slate-700">
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
                                  <circle cx="12" cy="12" r="9" />
                                  <circle cx="12" cy="12" r="3" />
                                  <line x1="12" y1="3" x2="12" y2="9" />
                                  <line x1="4.05" y1="16.5" x2="9.5" y2="13.5" />
                                  <line x1="19.95" y1="16.5" x2="14.5" y2="13.5" />
                                </svg>
                                <span className="text-[10px] font-black">คนขับ</span>
                              </div>
                            </div>

                            {/* Inner Passenger Cabin Floor */}
                            <div className="relative bg-white/95 rounded-[32px] p-3 sm:p-4 border-2 border-slate-200/90 shadow-inner">
                              {/* Vertical Door Badge on Left Side of Cabin */}
                              <div className="absolute -left-2.5 top-24 bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-full text-[8.5px] font-black tracking-widest uppercase shadow-xs -rotate-90 origin-center z-20 pointer-events-none">
                                ประตู
                              </div>

                              {/* Seat Map Grid */}
                              <div className="space-y-2.5">
                                {/* Row 1: Seat 1, Aisle, Driver */}
                                <div className="grid grid-cols-3 gap-2">
                                  {renderTicketPageSeat(
                                    activeVan.seats.find((s: any) => s.row === 1 && s.col === 1),
                                    activeVan
                                  )}
                                  {renderTicketPageSeat(null, activeVan)}
                                  {renderTicketPageSeat(
                                    activeVan.seats.find((s: any) => s.row === 1 && s.col === 3),
                                    activeVan
                                  )}
                                </div>

                                {/* Rows 2, 3, 4 */}
                                {[2, 3, 4].map((r) => {
                                  const extraSeat = activeVan.seats.find(
                                    (s: any) => s.id === extraSeatId(activeVan.id) || s.label === 'เสริม'
                                  );
                                  const isRow4Extra = r === 4 && !!extraSeat;
                                  return (
                                    <div
                                      key={r}
                                      className={`grid gap-2 ${
                                        isRow4Extra ? 'grid-cols-4' : 'grid-cols-3'
                                      }`}
                                    >
                                      {(isRow4Extra ? [1, 1.5, 2, 3] : [1, 2, 3]).map((c) =>
                                        renderTicketPageSeat(
                                          activeVan.seats.find(
                                            (s: any) => s.row === r && s.col === c
                                          ),
                                          activeVan
                                        )
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Rear Bumper Line */}
                            <div className="w-24 h-2 bg-slate-400 rounded-full mx-auto mt-3 shadow-xs" />
                          </div>

                          {/* Seat Legend */}
                          <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5 text-[10.5px] font-bold text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-md bg-gradient-to-br from-purple-600 to-indigo-700 border border-amber-300 shadow-sm" />
                              <span>ที่นั่งของคุณ</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-300" />
                              <span>จองแล้ว</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-md bg-emerald-50 border border-emerald-300" />
                              <span>ว่าง</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-md bg-slate-900 border border-slate-950" />
                              <span>คนขับ/สตาฟ</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (

        /* VIEW 2: TRIP SELECTION MENU LIST (MATCHING USER SCREENSHOT DESIGN) */
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-4 sm:p-6 border border-purple-100 shadow-xl space-y-5">
          
          {/* Header Title with Icon */}
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                เลือกทริป
              </h2>
              <p className="text-xs font-bold text-slate-400">
                เลือกทริปเพื่อเปิดดูตั๋วโดยสารดิจิทัลของคุณ
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาทริป..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50/80 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-xs sm:text-sm font-semibold transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Notice Warning Pill */}
          <div className="flex items-start gap-2.5 bg-amber-50/90 border border-amber-200/80 p-3.5 rounded-2xl text-amber-900 text-xs font-bold leading-relaxed shadow-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              แสดงเฉพาะทริปที่คุณทำการจองตั๋วไว้แล้วเท่านั้น กดเลือกทริปการเดินทางเพื่อดูตั๋วโดยสารของคุณได้ทันที
            </span>
          </div>

          {/* Booked Trips List */}
          <div className="space-y-3.5">
            {filteredBookedTrips.length === 0 ? (
              <div className="py-12 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 space-y-3">
                <Armchair className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-500">
                  {searchQuery ? 'ไม่พบทริปที่ตรงกับการค้นหา' : 'ยังไม่มีตั๋วโดยสารในระบบ'}
                </p>
                <Link
                  href="/"
                  className="inline-block text-xs font-black text-white bg-brand-700 hover:bg-brand-800 px-5 py-2.5 rounded-xl transition shadow-md theme-action"
                >
                  ไปค้นหาทริปและจองตั๋วเลย
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Upcoming trips */}
                {upcomingTrips.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-purple-700 bg-purple-100 border border-purple-200 px-3 py-1 rounded-full">🚐 ทริปที่กำลังจะมาถึง</span>
                    </div>
                    {upcomingTrips.map(({ trip, userBookings }) => (
                      <div
                        key={trip.id}
                        onClick={() => setSelectedTripId(trip.id)}
                        className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-lg cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl group border border-white/20 select-none min-h-[135px] flex flex-col justify-between"
                      >
                        <img src={trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80'} alt={trip.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/80 to-slate-950/65 group-hover:from-slate-950/95 transition-colors" />
                        <div className="relative z-10 flex items-start justify-between gap-3">
                          <div className="space-y-1 max-w-[78%]">
                            <h3 className="text-base sm:text-lg font-black text-white leading-snug drop-shadow-sm group-hover:text-purple-200 transition-colors">{trip.name}</h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-300">
                              <span>📅 {trip.durationDays - 1} วัน {trip.durationDays - 2} คืน</span>
                              {trip.tripPeriod && (() => { const p = trip.tripPeriod.split('||'); const dateOnly = (p[1] || p[0]).trim(); return dateOnly ? <span className="font-normal text-slate-300">({dateOnly})</span> : null; })()}
                            </div>
                          </div>
                          <span className="bg-purple-600/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10.5px] font-black border border-white/20 shadow-md shrink-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>มีตั๋ว ({userBookings.length} ใบ)</span>
                          </span>
                        </div>
                        <div className="relative z-10 flex items-end justify-between gap-3 pt-3 mt-2 border-t border-white/10">
                          <div className="space-y-0.5 text-[11px] sm:text-xs font-medium text-slate-300">
                            <p>📍 วันที่ออกเดินทาง {formatThaiDate(trip.departureDate)} {trip.departureTime ? `🕒 ${trip.departureTime} น.` : ''}</p>
                            <p className="text-amber-300 font-black text-xs sm:text-sm">฿{trip.cost?.toLocaleString('th-TH')} <span className="text-[10px] text-slate-300 font-normal">/ ท่าน</span></p>
                          </div>
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white group-hover:bg-purple-600 transition-colors shadow-md shrink-0">
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Past trips */}
                {pastTrips.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <span>🏁</span>
                        <span>ทริปที่จบแล้ว · ร่วมแสดงความคิดเห็น</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {pastTrips.length} ทริป
                      </span>
                    </div>
                    {pastTrips.map(({ trip, userBookings }) => (
                      <Link
                        key={trip.id}
                        href={`/?tripId=${encodeURIComponent(trip.id)}`}
                        className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-md cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-xl group border border-purple-200/40 select-none min-h-[140px] flex flex-col justify-between block"
                      >
                        <img
                          src={trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80'}
                          alt={trip.name}
                          className="absolute inset-0 w-full h-full object-cover grayscale-[40%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-purple-950/70 group-hover:from-slate-950/95 group-hover:to-purple-900/80 transition-colors" />
                        
                        {/* Top info */}
                        <div className="relative z-10 flex items-start justify-between gap-3">
                          <div className="space-y-1 max-w-[72%] sm:max-w-[78%]">
                            <h3 className="text-base sm:text-lg font-black text-white leading-snug drop-shadow-sm group-hover:text-purple-200 transition-colors">
                              {trip.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-300">
                              <span>📅 {trip.durationDays - 1} วัน {trip.durationDays - 2} คืน</span>
                              {trip.tripPeriod && (() => {
                                const p = trip.tripPeriod.split('||');
                                const dateOnly = (p[1] || p[0]).trim();
                                return dateOnly ? <span className="font-normal text-slate-300">({dateOnly})</span> : null;
                              })()}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="bg-amber-500/90 text-slate-950 px-2.5 py-1 rounded-full text-[10.5px] font-black border border-amber-300/40 shadow-sm flex items-center gap-1">
                              <Star className="w-3 h-3 fill-slate-950 text-slate-950" />
                              <span>แสดงความคิดเห็น</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              ตั๋ว {userBookings.length} ใบ
                            </span>
                          </div>
                        </div>

                        {/* Bottom action row */}
                        <div className="relative z-10 flex items-end justify-between gap-3 pt-3 mt-2 border-t border-white/10">
                          <div className="space-y-0.5 text-[11px] sm:text-xs font-medium text-slate-300">
                            <p>📍 วันที่ออกเดินทาง {formatThaiDate(trip.departureDate)} {trip.departureTime ? `🕒 ${trip.departureTime} น.` : ''}</p>
                            <div className="flex items-center gap-3">
                              <p className="text-slate-300 font-bold text-xs">฿{trip.cost?.toLocaleString('th-TH')} <span className="text-[10px] text-slate-400 font-normal">/ ท่าน</span></p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedTripId(trip.id);
                                }}
                                className="text-[10.5px] font-bold text-purple-300 hover:text-white underline hover:no-underline"
                              >
                                ดูตั๋วโดยสาร
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 bg-purple-600/90 hover:bg-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-bold border border-white/20 shadow-md group-hover:translate-x-0.5 transition-transform shrink-0">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>เขียนรีวิว</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-2 px-6 flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
        {/* Tab 1: สำรวจ */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 transition-colors duration-200 text-slate-400 hover:text-slate-600`}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          </div>
          <span className="text-[9.5px] font-bold">สำรวจ</span>
        </Link>

        {/* Tab 2: ตั๋วของฉัน */}
        <button
          onClick={() => setSelectedTripId(null)}
          className={`flex flex-col items-center gap-0.5 transition-colors duration-200 text-brand-700`}
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            <Armchair className="w-5 h-5" />
          </div>
          <span className="text-[9.5px] font-bold">ตั๋วของฉัน</span>
          <span className="w-1 h-1 bg-brand-700 rounded-full mt-0.5" />
        </button>

        {/* Tab 3: โปรไฟล์ */}
        <Link
          href="/?tab=profile"
          className={`flex flex-col items-center gap-0.5 transition-colors duration-200 text-slate-400 hover:text-slate-600`}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <span className="text-[9.5px] font-bold">โปรไฟล์</span>
        </Link>
      </div>
    </div>
  );
}
