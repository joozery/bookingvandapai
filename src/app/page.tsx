'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import {
  Compass,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Armchair,
  Check,
  ChevronRight,
  Shield,
  Info,
  HelpCircle,
  MessageSquare,
  Lock,
  Download,
  X
} from 'lucide-react';

interface Seat {
  id: string;
  label: string;
  type: 'driver' | 'staff' | 'customer';
  status: 'available' | 'pending' | 'booked';
  staffName?: string;
  bookingId?: string | null;
  passengerName?: string;
  row: number;
  col: number;
}

interface Van {
  id: string;
  tripId: string;
  vanNumber: number;
  plateNumber: string;
  driverName: string;
  driverPhone: string;
  seats: Seat[];
}

interface Trip {
  id: string;
  name: string;
  departureDate: string;
  durationDays: number;
  cost: number;
  pickupPoint: string;
  departureTime: string;
  status: 'active' | 'completed';
  image?: string;
  tripPeriod?: string;
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
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  replacesBookingId?: string | null;
  note?: string;
}

const MOCK_LINE_USERS = [
  {
    userId: 'line-user-1',
    displayName: 'นัท นักเที่ยวป่า',
    pictureUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  },
  {
    userId: 'line-user-2',
    displayName: 'ฝน ทะเลหมอก',
    pictureUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    userId: 'line-user-3',
    displayName: 'บิ๊ก แบ็คแพ็ค',
    pictureUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  }
];

export default function CustomerPage() {
  const { data: session, status: sessionStatus } = useSession();

  // Authentication & Simulation States
  const [lineUser, setLineUser] = useState<{ userId: string; displayName: string; pictureUrl: string } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [customLineName, setCustomLineName] = useState('');
  const [customLinePic, setCustomLinePic] = useState('https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80');

  // Main Data States
  const [trips, setTrips] = useState<Trip[]>([]);
  const [urlTripId, setUrlTripId] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [vans, setVans] = useState<Van[]>([]);
  const [selectedVan, setSelectedVan] = useState<Van | null>(null);
  const [userBooking, setUserBooking] = useState<(Booking & { tripName?: string; pickupPoint?: string; departureDate?: string; departureTime?: string; durationDays?: number; cost?: number; plateNumber?: string; driverName?: string; driverPhone?: string; vanNumber?: number }) | null>(null);

  // Interaction States
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isRequestingTransfer, setIsRequestingTransfer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);

  // Form States
  const [nickname, setNickname] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  // Profile Form States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  
  const [nationalId, setNationalId] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [consentInsurance, setConsentInsurance] = useState(false);

  // 1. Fetch Trips initially
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tripIdParam = params.get('tripId');
    if (tripIdParam) {
      setUrlTripId(tripIdParam);
    }
    fetchTrips();
  }, []);

  // Sync NextAuth session with local lineUser state
  useEffect(() => {
    if (session?.user) {
      setLineUser({
        userId: (session.user as any).id || session.user.email || `line-user-${Date.now()}`,
        displayName: session.user.name || 'ผู้ใช้งาน LINE',
        pictureUrl: session.user.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      });
    } else {
      setLineUser(null);
    }
  }, [session]);

  // 2. Fetch bookings when LINE User or Selected Trip changes
  useEffect(() => {
    if (lineUser) {
      fetchUserProfile();
    } else {
      setHasProfile(false);
      setShowProfileModal(false);
    }
    
    if (lineUser && selectedTrip && hasProfile) {
      fetchUserBooking();
    } else {
      setUserBooking(null);
    }
  }, [lineUser, selectedTrip, hasProfile]);

  // 3. Realtime polling for Seats & Bookings of the selected Van
  useEffect(() => {
    if (!selectedTrip) return;

    fetchVans(selectedTrip.id);

    const interval = setInterval(() => {
      fetchVansSilent(selectedTrip.id);
      if (lineUser) {
        fetchUserBookingSilent();
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [selectedTrip, selectedVan?.id, lineUser]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/trips');
      const data = await res.json();
      if (data.success) {
        setTrips(data.trips);
        if (data.trips.length > 0) {
          const params = new URLSearchParams(window.location.search);
          const tripIdParam = params.get('tripId');
          if (tripIdParam) {
            const t = data.trips.find((x: Trip) => x.id === tripIdParam);
            setSelectedTrip(t || data.trips[0]);
          } else {
            setSelectedTrip(data.trips[0]);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVans = async (tripId: string) => {
    try {
      const res = await fetch(`/api/vans?tripId=${tripId}`);
      const data = await res.json();
      if (data.success && data.vans.length > 0) {
        setVans(data.vans);
        const currentSelectedId = selectedVan?.id;
        const matchedVan = data.vans.find((v: Van) => v.id === currentSelectedId);
        setSelectedVan(matchedVan || data.vans[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVansSilent = async (tripId: string) => {
    try {
      const res = await fetch(`/api/vans?tripId=${tripId}`);
      const data = await res.json();
      if (data.success && data.vans.length > 0) {
        setVans(data.vans);
        if (selectedVan) {
          const updated = data.vans.find((v: Van) => v.id === selectedVan.id);
          if (updated) {
            setSelectedVan(updated);
          }
        }
      }
    } catch (err) {
      // Silent error
    }
  };

  const fetchUserProfile = async () => {
    if (!lineUser) return;
    try {
      const res = await fetch(`/api/profile?lineUserId=${lineUser.userId}`);
      const data = await res.json();
      if (data.success && data.profile) {
        setHasProfile(true);
        setFullName(data.profile.fullName || '');
        setNickname(data.profile.nickname || '');
        setPhone(data.profile.phone || '');
        setNationalId(data.profile.nationalId || '');
        setBirthDate(data.profile.birthDate || '');
        setEmergencyName(data.profile.emergencyName || '');
        setEmergencyPhone(data.profile.emergencyPhone || '');
        setAllergies(data.profile.allergies || '');
        setMedicalConditions(data.profile.medicalConditions || '');
        setConsentInsurance(true);
        setShowProfileModal(false);
      } else {
        setHasProfile(false);
        setConsentInsurance(false);
        setShowProfileModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineUser) return;
    if (!fullName.trim() || !nickname.trim() || !phone.trim() || !nationalId.trim() || !birthDate.trim() || !emergencyName.trim() || !emergencyPhone.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอกข้อมูลบังคับให้ครบถ้วนทุกช่อง' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!consentInsurance) {
      setMessage({ type: 'error', text: 'กรุณากดยินยอมเพื่อให้ใช้ข้อมูลในการทำประกัน' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      setIsSubmittingProfile(true);
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: lineUser.userId,
          fullName,
          nickname,
          phone,
          nationalId,
          birthDate,
          emergencyName,
          emergencyPhone,
          allergies,
          medicalConditions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'บันทึกข้อมูลส่วนตัวสำเร็จ' });
        setHasProfile(true);
        setShowProfileModal(false);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsSubmittingProfile(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const fetchUserBooking = async () => {
    if (!lineUser || !selectedTrip) return;
    try {
      const res = await fetch(`/api/bookings?lineUserId=${lineUser.userId}&tripId=${selectedTrip.id}`);
      const data = await res.json();
      if (data.success && data.bookings.length > 0) {
        const approvedBooking = data.bookings.find((b: Booking) => b.status === 'approved');
        const pendingBooking = data.bookings.find((b: Booking) => b.status === 'pending');
        const activeBooking = approvedBooking || pendingBooking;

        if (activeBooking) {
          const ticketRes = await fetch(`/api/bookings/${activeBooking.id}`);
          const ticketData = await ticketRes.json();
          if (ticketData.success) {
            const bookingToSet = { ...ticketData.booking };
            if (approvedBooking && pendingBooking && pendingBooking.replacesBookingId === approvedBooking.id) {
              bookingToSet.pendingTransfer = pendingBooking;
            }
            setUserBooking(bookingToSet);
            setNickname(ticketData.booking.nickname);
            setFullName(ticketData.booking.fullName);
            setPhone(ticketData.booking.phone);
            setNote(ticketData.booking.note || '');
          }
        } else {
          setUserBooking(null);
        }
      } else {
        setUserBooking(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserBookingSilent = async () => {
    if (!lineUser || !selectedTrip) return;
    try {
      const res = await fetch(`/api/bookings?lineUserId=${lineUser.userId}&tripId=${selectedTrip.id}`);
      const data = await res.json();
      if (data.success) {
        const approvedBooking = data.bookings.find((b: Booking) => b.status === 'approved');
        const pendingBooking = data.bookings.find((b: Booking) => b.status === 'pending');
        const activeBooking = approvedBooking || pendingBooking;

        if (activeBooking) {
          const ticketRes = await fetch(`/api/bookings/${activeBooking.id}`);
          const ticketData = await ticketRes.json();
          if (ticketData.success) {
            const bookingToSet = { ...ticketData.booking };
            if (approvedBooking && pendingBooking && pendingBooking.replacesBookingId === approvedBooking.id) {
              bookingToSet.pendingTransfer = pendingBooking;
            }
            setUserBooking(bookingToSet);
          }
        } else {
          setUserBooking(null);
        }
      }
    } catch (err) {
      // Silent error
    }
  };

  const handleLogin = (user: { userId: string; displayName: string; pictureUrl: string }) => {
    setLineUser(user);
    setShowLoginModal(false);
  };

  const handleLoginClick = () => {
    signIn('line');
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLineName.trim()) return;
    const user = {
      userId: `line-custom-${Date.now()}`,
      displayName: customLineName,
      pictureUrl: customLinePic,
    };
    handleLogin(user);
  };

  const handleLogout = () => {
    signOut();
  };

  const handleSeatClick = (seat: Seat) => {
    if (!lineUser) {
      setShowLoginModal(true);
      return;
    }

    if (seat.type === 'driver') {
      setMessage({ type: 'error', text: 'ที่นั่งนี้เป็นของคนขับ (ไม่สามารถเลือกได้)' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (seat.type === 'staff') {
      setMessage({
        type: 'error',
        text: `ที่นั่งผู้จัด (ไม่สามารถจองได้): ${seat.staffName || 'ผู้จัดประจำทริป'}`
      });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    if (seat.status !== 'available') {
      setMessage({ type: 'error', text: 'ที่นั่งนี้มีผู้จองหรือกำลังรออนุมัติแล้ว' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    // If requesting transfer, just pick new target seat (don't block due to existing booking)
    if (isRequestingTransfer) {
      if (selectedSeat?.id === seat.id) {
        setSelectedSeat(null);
      } else {
        setSelectedSeat(seat);
      }
      return;
    }

    // Normal flow: block if already booked (and not in transfer mode)
    if (userBooking && userBooking.status === 'approved') {
      setMessage({ type: 'error', text: 'คุณมีการจองอยู่แล้ว หากต้องการย้ายที่นั่ง กรุณากดปุ่ม "ขอย้ายที่นั่ง" ก่อน' });
      setTimeout(() => setMessage(null), 4000);
      return;
    }

    // Toggle seat selection
    if (selectedSeat?.id === seat.id) {
      setSelectedSeat(null);
    } else {
      setSelectedSeat(seat);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineUser || !selectedTrip || !selectedVan || !selectedSeat) return;

    if (!nickname.trim() || !fullName.trim() || !phone.trim()) {
      setMessage({ type: 'error', text: 'กรุณากรอกข้อมูลบังคับให้ครบถ้วนทุกช่อง' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedTrip.id,
          vanId: selectedVan.id,
          seatId: selectedSeat.id,
          nickname,
          fullName,
          phone,
          lineUserId: lineUser.userId,
          lineUserName: lineUser.displayName,
          lineUserProfilePic: lineUser.pictureUrl,
          note,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setSelectedSeat(null);
        setNote('');
        setIsRequestingTransfer(false);
        fetchUserBooking();
        fetchVans(selectedTrip.id);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('คุณต้องการยกเลิกการจอง/การส่งคำขอนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'ยกเลิกคำขอจองสำเร็จแล้ว' });
        setUserBooking(null);
        if (selectedTrip) {
          fetchVans(selectedTrip.id);
        }
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการยกเลิก' });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getReturnDate = (depDate: string, days: number) => {
    if (!depDate) return '';
    // Format depDate "15 ธ.ค. 2567"
    return depDate; // Render simple string representation
  };

  const parsePlate = (plate?: string) => {
    if (!plate) return { number: '-', province: '-' };
    const parts = plate.trim().split(/\s+/);
    const number = parts[0] || '-';
    const province = parts.slice(1).join(' ') || 'กรุงเทพ';
    return { number, province };
  };

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return;
    
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 4 // Increased from 2 to 4 for ultra-crisp high-definition (HD) ticket image
      });
      
      const filename = `BookingTicket-Seat${userBooking?.seatLabel || 'X'}.png`;

      // Try Web Share API for mobile (allows saving to gallery easily)
      if (navigator.share) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], filename, { type: 'image/png' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'บัตรโดยสาร Booking Van',
            });
            setIsDownloading(false);
            return; // Success!
          }
        } catch (shareErr) {
          console.error("Share failed", shareErr);
          // Fall back to standard download if share is aborted or fails
        }
      }

      // Fallback: standard download link (works on desktop and some browsers)
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      link.click();
      
    } catch (err) {
      console.error("Error capturing ticket", err);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกรูปบัตรโดยสาร' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsDownloading(false);
    }
  };

  // Determine current timeline step
  const getTimelineStep = () => {
    if (!selectedTrip) return 1;
    if (!selectedVan) return 2;
    if (!selectedSeat && !userBooking) return 3;
    if (selectedSeat && !userBooking) return 4;
    return 5;
  };

  const currentStep = getTimelineStep();

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] text-slate-800 min-h-screen">
      {/* Global alert messages banner */}
      {message && (
        <div className="fixed top-24 right-4 z-50 animate-bounce max-w-sm">
          <div
            className={`p-4 rounded-xl shadow-2xl flex items-start gap-3 backdrop-blur-xl border ${
              message.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p className="text-xs font-semibold">{message.text}</p>
          </div>
        </div>
      )}

      {/* Header Panel matching screenshot */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Real Brand Logo */}
            <div className="shrink-0 shadow-md rounded-2xl overflow-hidden bg-white p-1 border-2 border-[#4c1d95] flex items-center justify-center">
              <img src="/logo/logo.png" alt="DAPAIDERNPAI Logo" className="w-12 h-12 object-contain" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight leading-none">
                จองที่นั่งรถตู้ 11 ที่นั่ง
              </h1>
              <div className="text-[11px] sm:text-xs text-slate-400 font-semibold mt-1 flex flex-wrap items-center gap-1.5">
                <span>เลือกทริป</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span>เลือกรถตู้</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-[#4c1d95] font-bold">เลือกที่นั่ง</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span>กรอกข้อมูล</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span>ยืนยันการจอง</span>
              </div>
            </div>
          </div>

          {/* Quick links on the right */}
          <div className="flex items-center space-x-3 self-start md:self-center text-xs font-semibold text-slate-600">
            <button className="hidden sm:flex items-center space-x-1 hover:text-[#4c1d95] transition px-2.5 py-1.5 rounded-lg hover:bg-slate-100">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>วิธีการใช้งาน</span>
            </button>
            <button className="hidden sm:flex items-center space-x-1 hover:text-[#4c1d95] transition px-2.5 py-1.5 rounded-lg hover:bg-slate-100">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span>ติดต่อแอดมิน</span>
            </button>
            <a href="/admin" className="hidden sm:flex items-center space-x-1 text-[#4c1d95] hover:text-purple-900 bg-purple-50 hover:bg-purple-100 transition px-3 py-1.5 rounded-lg border border-purple-200 mr-2">
              <User className="w-4 h-4 text-purple-700" />
              <span>แอดมิน</span>
            </a>
            
            {/* User Profile & Logout */}
            {lineUser && (
              <div className="flex items-center bg-white border border-slate-200 rounded-full py-1 px-1 pr-3 shadow-sm ml-auto">
                <img src={lineUser.pictureUrl} alt={lineUser.displayName} className="w-7 h-7 rounded-full border border-slate-100 object-cover mr-2" />
                <span className="font-bold text-slate-700 text-[11px] mr-3 truncate max-w-[100px]">{lineUser.displayName}</span>
                <button onClick={() => setShowProfileModal(true)} className="text-slate-500 hover:text-[#4c1d95] transition flex items-center justify-center p-1.5 rounded-full hover:bg-purple-50 mr-1" title="แก้ไขข้อมูลส่วนตัว">
                  <User className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleLogout} className="text-rose-500 hover:text-white hover:bg-rose-500 transition flex items-center justify-center p-1.5 rounded-full bg-rose-50" title="ออกจากระบบ">
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Steps horizontal timeline matching screenshot */}
      {lineUser && hasProfile && (
      <section className="bg-white border-b border-slate-200 py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500">
          
          {/* Step 1 */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
              currentStep > 1 ? 'bg-[#4c1d95]' : 'bg-[#4c1d95] ring-4 ring-purple-100'
            }`}>
              {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span className={`hidden md:inline ${currentStep >= 1 ? 'text-[#4c1d95]' : ''}`}>เลือกทริป</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 min-w-[10px] ${currentStep > 1 ? 'bg-[#4c1d95]' : 'bg-slate-200'}`} />

          {/* Step 2 */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
              currentStep > 2 ? 'bg-[#4c1d95]' : currentStep === 2 ? 'bg-[#4c1d95] ring-4 ring-purple-100' : 'bg-slate-200'
            }`}>
              {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <span className={`hidden md:inline ${currentStep >= 2 ? 'text-[#4c1d95]' : ''}`}>เลือกรถตู้</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 min-w-[10px] ${currentStep > 2 ? 'bg-[#4c1d95]' : 'bg-slate-200'}`} />

          {/* Step 3 */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
              currentStep === 3 ? 'bg-[#4c1d95] ring-4 ring-purple-100' : currentStep > 3 ? 'bg-[#4c1d95]' : 'bg-slate-200'
            }`}>
              {currentStep > 3 ? <Check className="w-4 h-4" /> : '3'}
            </div>
            <span className={`hidden md:inline ${currentStep >= 3 ? 'text-[#4c1d95]' : ''}`}>เลือกที่นั่ง</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 min-w-[10px] ${currentStep > 3 ? 'bg-[#4c1d95]' : 'bg-slate-200'}`} />

          {/* Step 4 */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
              currentStep === 4 ? 'bg-[#4c1d95] ring-4 ring-purple-100' : currentStep > 4 ? 'bg-[#4c1d95]' : 'bg-slate-200'
            }`}>
              {currentStep > 4 ? <Check className="w-4 h-4" /> : '4'}
            </div>
            <span className={`hidden md:inline ${currentStep >= 4 ? 'text-[#4c1d95]' : ''}`}>กรอกข้อมูล</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 min-w-[10px] ${currentStep > 4 ? 'bg-[#4c1d95]' : 'bg-slate-200'}`} />

          {/* Step 5 */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
              currentStep === 5 ? 'bg-[#4c1d95] ring-4 ring-purple-100' : 'bg-slate-200'
            }`}>
              {currentStep > 5 ? <Check className="w-4 h-4" /> : '5'}
            </div>
            <span className={`hidden md:inline ${currentStep === 5 ? 'text-[#4c1d95]' : ''}`}>ยืนยันการจอง</span>
          </div>

        </div>
      </section>
      )}

      {!lineUser ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 mt-10">
           <Compass className="w-24 h-24 text-[#4c1d95] mb-6 opacity-80" />
           <h2 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">ยินดีต้อนรับสู่ระบบจองรถตู้</h2>
           <p className="text-sm text-slate-500 mb-8 max-w-sm leading-relaxed">กรุณาล็อกอินด้วยบัญชี LINE ของท่านเพื่อดำเนินการจองที่นั่งและเข้าสู่ระบบ</p>
           <button onClick={handleLoginClick} className="bg-[#06C755] hover:bg-[#05b34c] text-white px-8 py-3.5 rounded-full font-bold text-sm transition shadow-xl shadow-[#06C755]/20 flex items-center gap-2 transform hover:scale-105">
              <MessageSquare className="w-5 h-5" />
              <span>ล็อกอินเข้าสู่ระบบด้วย LINE</span>
           </button>
        </div>
      ) : (!hasProfile || showProfileModal) ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 animate-in fade-in zoom-in-95 duration-500 mt-4">
          <div className="bg-white max-w-md w-full rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
             <div className="bg-[#4c1d95] p-6 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                   <Shield className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">ข้อมูลส่วนตัวเพื่อการทำประกัน</h2>
                <p className="text-white/80 text-xs mt-1">กรุณากรอกข้อมูลให้ครบถ้วนเพื่อผลประโยชน์ของท่าน</p>
             </div>
             <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-[11px] font-bold text-slate-500 mb-1">
                    ชื่อ-นามสกุล (Full Name) <span className="text-red-500">*</span>
                  </label>
                  <input type="text" id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="เช่น สมชาย ใจดี" className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="nickname" className="block text-[11px] font-bold text-slate-500 mb-1">
                      ชื่อเล่น (Nickname) <span className="text-red-500">*</span>
                    </label>
                    <input type="text" id="nickname" required value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="เช่น นัท" className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-[11px] font-bold text-slate-500 mb-1">
                      เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                    </label>
                    <input type="tel" id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="เช่น 081-234-5678" className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
                  </div>
                </div>

                <div>
                  <label htmlFor="nationalId" className="block text-[11px] font-bold text-slate-500 mb-1">
                    เลขบัตรประจำตัวประชาชน (National ID) <span className="text-red-500">*</span>
                  </label>
                  <input type="text" id="nationalId" required value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="เลข 13 หลัก" maxLength={13} className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
                </div>

                <div>
                  <label htmlFor="birthDate" className="block text-[11px] font-bold text-slate-500 mb-1">
                    วันเดือนปีเกิด (Date of Birth) <span className="text-red-500">*</span>
                  </label>
                  <input type="date" id="birthDate" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="emergencyName" className="block text-[11px] font-bold text-slate-500 mb-1">
                      ชื่อผู้ติดต่อฉุกเฉิน <span className="text-red-500">*</span>
                    </label>
                    <input type="text" id="emergencyName" required value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="เช่น แม่, พ่อ" className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
                  </div>
                  <div>
                    <label htmlFor="emergencyPhone" className="block text-[11px] font-bold text-slate-500 mb-1">
                      เบอร์โทรฉุกเฉิน <span className="text-red-500">*</span>
                    </label>
                    <input type="tel" id="emergencyPhone" required value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="เช่น 089-123-4567" className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
                  </div>
                </div>

                <div>
                  <label htmlFor="allergies" className="block text-[11px] font-bold text-slate-500 mb-1">แพ้อาหาร (ถ้ามี)</label>
                  <input type="text" id="allergies" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="เช่น อาหารทะเล, ถั่ว" className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
                </div>

                <div>
                  <label htmlFor="medicalConditions" className="block text-[11px] font-bold text-slate-500 mb-1">โรคประจำตัว (ถ้ามี)</label>
                  <input type="text" id="medicalConditions" value={medicalConditions} onChange={(e) => setMedicalConditions(e.target.value)} placeholder="เช่น หอบหืด, เบาหวาน" className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
                </div>

                <div className="flex items-start gap-2.5 bg-purple-50/50 border border-purple-100 rounded-xl p-3 mt-2">
                  <input
                    type="checkbox"
                    id="consentInsurance"
                    required
                    checked={consentInsurance}
                    onChange={(e) => setConsentInsurance(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 text-[#4c1d95] focus:ring-[#4c1d95] accent-[#4c1d95] cursor-pointer"
                  />
                  <label htmlFor="consentInsurance" className="text-[10.5px] leading-relaxed text-slate-600 font-semibold cursor-pointer select-none">
                    ข้าพเจ้ายินยอมให้ผู้จัดทริป “ด่าไป เดินไป” เก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้า ได้แก่ ชื่อ-นามสกุล เบอร์โทรศัพท์ เลขบัตรประชาชน วันเดือนปีเกิด ข้อมูลผู้ติดต่อฉุกเฉิน รวมถึงข้อมูลสุขภาพ เช่น โรคประจำตัว และอาการแพ้อาหาร เพื่อใช้ในการ:
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-500 font-medium">
                      <li>ทำประกันการเดินทาง</li>
                      <li>ติดต่อประสานงาน และดูแลความปลอดภัยในทริปนี้</li>
                    </ul>
                  </label>
                </div>

                <div className="flex gap-2 mt-4">
                  {hasProfile && (
                    <button type="button" onClick={() => setShowProfileModal(false)} className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-3 rounded-xl transition duration-200 shadow-sm flex items-center justify-center">
                      ยกเลิก
                    </button>
                  )}
                  <button type="submit" disabled={isSubmittingProfile} className={`flex-1 bg-[#4c1d95] hover:bg-[#3b1774] text-white text-xs font-bold py-3 rounded-xl transition duration-200 shadow-md flex items-center justify-center space-x-2 disabled:opacity-50`}>
                    {isSubmittingProfile ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <span>บันทึกข้อมูลส่วนตัว</span>
                    )}
                  </button>
                </div>
             </form>
          </div>
        </div>
      ) : (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: LEFT SIDE (3 columns on lg) - SELECT TRIP & VAN */}
        {/* ========================================================================= */}
        <section className="lg:col-span-3 flex flex-col gap-6">
          
          {/* 1.1 เลือกทริป */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 mb-4 flex items-center gap-1.5 uppercase tracking-wide">
              <Compass className="w-4 h-4 text-[#4c1d95]" />
              <span>เลือกทริป</span>
            </h2>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : trips.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">ไม่พบทริปเดินทางในขณะนี้</p>
            ) : (
              <div className="flex flex-col gap-3 max-h-[640px] overflow-y-auto pr-1.5 scrollbar-thin">
                {trips.map((trip) => {
                  const isSelected = selectedTrip?.id === trip.id;
                  const nights = trip.durationDays - 1;
                  const seatsLeft = trip.availableSeats ?? 0;
                  const isDisabled = urlTripId !== null && urlTripId !== trip.id;
                  return (
                    <button
                      key={trip.id}
                      onClick={() => {
                        if (isDisabled) return;
                        setSelectedTrip(trip);
                        setSelectedSeat(null);
                      }}
                      disabled={isDisabled}
                      className={`w-full text-left relative rounded-xl border transition-all duration-200 overflow-hidden flex flex-col ${
                        isSelected
                          ? 'border-[#4c1d95] ring-2 ring-[#4c1d95]/30 shadow-md shadow-purple-100'
                          : isDisabled
                            ? 'border-slate-200 opacity-50 cursor-not-allowed bg-slate-50'
                            : 'border-slate-200 hover:border-purple-200 hover:shadow-sm bg-white'
                      }`}
                    >
                      {/* Image header strip */}
                      <div className="relative w-full h-20 overflow-hidden">
                        <img
                          src={trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&auto=format&fit=crop&q=80'}
                          alt={trip.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        {/* Trip name overlaid on image */}
                        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 flex items-end justify-between">
                          <h3 className="text-white font-bold text-xs leading-tight drop-shadow flex-1 pr-2">{trip.name}</h3>
                          {/* Seat badge */}
                          <div className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            seatsLeft > 0
                              ? 'bg-emerald-500/90 text-white border-emerald-400'
                              : 'bg-rose-500/90 text-white border-rose-400'
                          }`}>
                            {seatsLeft > 0 ? `ว่าง ${seatsLeft} ที่` : 'เต็ม'}
                          </div>
                        </div>
                      </div>

                      {/* Details section */}
                      <div className={`px-3 py-2.5 flex items-center gap-2 ${isSelected ? 'bg-purple-50/50' : 'bg-white'}`}>
                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Duration row */}
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-[#4c1d95] shrink-0" />
                            <span className="text-[10px] font-bold text-slate-700">
                              {nights > 0 ? `${trip.durationDays} วัน ${nights} คืน` : `ไปเช้าเย็นกลับ (1 วัน)`}
                              {trip.tripPeriod && (
                                <span className="font-normal text-slate-500 ml-1">({trip.tripPeriod})</span>
                              )}
                            </span>
                          </div>
                          {/* Departure date + time row */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="text-[10px] text-slate-500 font-semibold">ออก {trip.departureDate}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="text-[10px] text-slate-500 font-semibold">{trip.departureTime} น.</span>
                            </div>
                          </div>
                        </div>

                        {/* Selected check */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#4c1d95] border-[#4c1d95] text-white'
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 1.2 เลือกรถตู้ */}
          {selectedTrip && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-in fade-in duration-200">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 mb-4 flex items-center gap-1.5 uppercase tracking-wide">
                <Armchair className="w-4 h-4 text-[#4c1d95]" />
                <span>เลือกรถตู้</span>
              </h2>

              {vans.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">กำลังโหลดข้อมูลตู้อันมีค่า...</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {vans.map((van) => {
                    const isVanSelected = selectedVan?.id === van.id;
                    return (
                      <button
                        key={van.id}
                        onClick={() => {
                          setSelectedVan(van);
                          setSelectedSeat(null);
                        }}
                        className={`text-left relative rounded-xl border p-3 flex gap-3 transition-all duration-200 items-center ${
                          isVanSelected
                            ? 'border-[#4c1d95] bg-purple-50/40 ring-1 ring-[#4c1d95]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {/* Tiny White Van silhouette illustration */}
                        <div className="w-12 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0">
                          <svg viewBox="0 0 40 24" className="w-8 h-8 text-slate-500 fill-current">
                            <path d="M35 15h1v2a2 2 0 0 1-2 2h-1v-4zm-22 4h-2a2 2 0 0 1-2-2v-2h4v4zm16 0h-8v-4h8v4zm-12 0H9V9a2 2 0 0 1 2-2h18v12zM5 11h3v4H5v-4zm0 6h3v2H5v-2zm30-4h-4V9h3a1 1 0 0 1 1 1v3z" />
                            <circle cx="12" cy="20" r="3" fill="#334155" />
                            <circle cx="28" cy="20" r="3" fill="#334155" />
                          </svg>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-xs font-bold text-slate-800 leading-tight">
                            รถตู้คันที่ {van.vanNumber} (11 ที่นั่ง)
                          </h3>
                          <p className="text-[10px] text-slate-500 font-semibold mt-1">
                            คนขับ: {van.driverName}
                          </p>
                          <span className="text-[9px] text-[#4c1d95] font-bold bg-purple-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                            11 ที่นั่ง
                          </span>
                        </div>

                        {/* Selected Radio circle */}
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                          isVanSelected 
                            ? 'bg-[#4c1d95] border-[#4c1d95] text-white' 
                            : 'border-slate-300'
                        }`}>
                          {isVanSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </section>

        {/* ========================================================================= */}
        {/* COLUMN 2: MIDDLE (5 columns on lg) - DETAILED VAN & SEAT MAP */}
        {/* ========================================================================= */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {selectedVan ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-1 flex flex-col justify-between">
              
              {/* Van Title Header */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center space-x-2">
                    {/* Small van icon */}
                    <div className="bg-purple-100 text-[#4c1d95] p-2 rounded-xl">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                        <path d="M19 15h1V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6h1a2 2 0 0 0 4 0h10a2 2 0 0 0 4 0zM5 15a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm14 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                        รถตู้คันที่ {selectedVan.vanNumber} (11 ที่นั่ง)
                      </h2>
                      <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>กรุณาเลือกที่นั่ง (เบาะ 2 - 10 เท่านั้น)</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Realtime ping */}
                  <div className="flex items-center space-x-1.5 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full self-start sm:self-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                    <span className="text-[9px] font-bold text-green-700 tracking-wide uppercase">Realtime Active</span>
                  </div>
                </div>

                {/* ========================================== */}
                {/* HORIZONTAL SVG VAN CHASSIS SILHOUETTE MAP  */}
                {/* ========================================== */}
                {/* Responsive wrapper for vertical layout */}
                {/* Responsive wrapper for vertical layout */}
                <div className="w-full pb-3 pt-1 flex justify-center">
                  <div className="relative w-[320px] min-w-[320px] h-[580px] shrink-0 mx-auto bg-slate-50/50 rounded-[42px] shadow-xl border-4 border-slate-200 overflow-hidden flex items-center justify-center my-4">
                    
                    {/* SVG Van outline chassis - Luxury Light Vertical layout */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 580" className="absolute inset-0 w-full h-full text-slate-400 pointer-events-none">
                      {/* Outer metallic body in clean white and steel borders */}
                      <rect x="10" y="10" width="300" height="560" rx="38" fill="#ffffff" stroke="#cbd5e1" strokeWidth="4" />
                      
                      {/* Front headlights with glowing warm yellow effect */}
                      <rect x="25" y="6" width="22" height="6" rx="2" fill="#fef08a" opacity="0.9" />
                      <rect x="273" y="6" width="22" height="6" rx="2" fill="#fef08a" opacity="0.9" />
                      
                      {/* Front wheels */}
                      <rect x="2" y="80" width="8" height="40" rx="3" fill="#64748b" />
                      <rect x="310" y="80" width="8" height="40" rx="3" fill="#64748b" />
                      
                      {/* Rear wheels */}
                      <rect x="2" y="440" width="8" height="42" rx="3" fill="#64748b" />
                      <rect x="310" y="440" width="8" height="42" rx="3" fill="#64748b" />
                      
                      {/* Side mirrors */}
                      <rect x="1" y="90" width="9" height="26" rx="3" fill="#64748b" />
                      <rect x="310" y="90" width="9" height="26" rx="3" fill="#64748b" />
                      
                      {/* Front nose hood curves */}
                      <path d="M 65 10 Q 160 -4 255 10 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2.5" />
                      
                      {/* Rear bumper */}
                      <rect x="65" y="565" width="190" height="9" rx="3" fill="#64748b" />
                      
                      {/* Windshield */}
                      <path d="M 30 115 Q 160 90 290 115 L 290 132 Q 160 110 30 132 Z" fill="#e2e8f0" opacity="0.8" stroke="#cbd5e1" strokeWidth="1.5" />
                      <path d="M 50 117 Q 160 95 270 117" stroke="#ffffff" strokeWidth="1" opacity="0.4" fill="none" />
                      
                      {/* Dashboard Console */}
                      <rect x="35" y="68" width="250" height="34" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                      {/* Speedometer Glow */}
                      <rect x="175" y="74" width="40" height="10" rx="2" fill="#c084fc" opacity="0.25" />
                      {/* Steering Wheel on the Right (Thailand) */}
                      <circle cx="195" cy="85" r="11" fill="none" stroke="#94a3b8" strokeWidth="3" />
                      <line x1="184" y1="85" x2="206" y2="85" stroke="#94a3b8" strokeWidth="2" />
                      
                      {/* Ambient VIP Neon LED Light Strips along sides */}
                      <line x1="28" y1="140" x2="28" y2="520" stroke="#c084fc" strokeWidth="2" opacity="0.3" strokeDasharray="5 7" />
                      <line x1="292" y1="140" x2="292" y2="520" stroke="#c084fc" strokeWidth="2" opacity="0.3" strokeDasharray="5 7" />
                      
                      {/* Inner passenger cabin grid floor background */}
                      <rect x="25" y="140" width="270" height="395" rx="18" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />
                    </svg>

                    {/* ========================================== */}
                    {/* OVERLAY INTERACTIVE SEAT GRID LAYOUT       */}
                    {/* ========================================== */}
                    <div className="absolute inset-x-0 top-[140px] bottom-[45px] px-[36px] pt-4 pb-2 grid grid-rows-4 gap-y-4">
                      
                      {/* ROW 1: Staff 1 (Col 1 / left) & Driver D (Col 3 / right) */}
                      <div className="grid grid-cols-3 items-center justify-items-center">
                        
                        {/* Staff 1 (left / col 1) */}
                        {(() => {
                          const seat = selectedVan.seats.find((s) => s.row === 1 && s.col === 1);
                          if (!seat) return <div className="w-[58px] h-[64px]" />;
                          return (
                            <div className="relative w-[58px] h-[64px] rounded-[14px] flex flex-col justify-between p-1.5 transition-all duration-300 shadow-md select-none border border-b-[4px] bg-gradient-to-b from-[#e9d5ff] to-[#c084fc] border-[#a855f7] text-[#581c87] shadow-purple-200/50">
                              {/* Headrest */}
                              <div className="w-[32px] h-[10px] rounded-[4px] mx-auto bg-[#c084fc]/70" />
                              {/* Cushion */}
                              <div className="flex-1 w-full rounded-[8px] mt-1 flex flex-col items-center justify-center bg-purple-50/95 relative">
                                <span className="text-[10px] font-extrabold tracking-tight bg-purple-600 text-white rounded px-1 scale-90 mb-0.5">1</span>
                                <span className="text-[9px] font-bold leading-none">ผู้จัด</span>
                                <span className="text-[6.5px] text-purple-700 scale-90 font-medium">(Admin)</span>
                                {seat.staffName && (
                                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[6px] font-bold px-1 rounded-full whitespace-nowrap shadow-sm scale-75">
                                    {seat.staffName.split(' ')[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Walkway label (middle / col 2) -> empty now */}
                        <div className="w-[58px] h-[64px]" />

                        {/* Driver D (right / col 3) */}
                        {(() => {
                          const seat = selectedVan.seats.find((s) => s.row === 1 && s.col === 3);
                          return (
                            <div className="relative w-[58px] h-[64px] rounded-[14px] flex flex-col justify-between p-1.5 transition-all duration-300 shadow-md select-none border border-b-[4px] bg-slate-900 border-black text-white shadow-slate-900/50">
                              {/* Headrest */}
                              <div className="w-[32px] h-[10px] rounded-[4px] mx-auto bg-slate-700/80" />
                              {/* Cushion */}
                              <div className="flex-1 w-full rounded-[8px] mt-1 flex flex-col items-center justify-center bg-slate-800">
                                <span className="text-[10px] font-extrabold tracking-tight bg-black text-white rounded px-1 scale-90 mb-0.5">D</span>
                                <span className="text-[9px] font-bold leading-none text-white">คนขับ</span>
                                <span className="text-[6.5px] text-slate-400 scale-90 font-medium">(Driver)</span>
                              </div>
                            </div>
                          );
                        })()}

                      </div>

                      {/* ROW 2: Seats 4 (left), 3 (middle), 2 (right) */}
                      <div className="grid grid-cols-3 items-center justify-items-center relative">
                        {/* Door label (beside Seat 4) */}
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 bg-slate-100 text-slate-500 border border-slate-200/80 px-2.5 py-0.5 rounded text-[8px] font-bold text-center uppercase tracking-widest scale-90 select-none -rotate-90 origin-center translate-x-[-15px]">
                          ประตู
                        </div>
                        {[1, 2, 3].map((colVal) => {
                          const seat = selectedVan.seats.find((s) => s.row === 2 && s.col === colVal);
                          if (!seat) return <div key={colVal} className="w-[58px] h-[64px]" />;
                          return renderVanSeat(seat);
                        })}
                      </div>

                      {/* ROW 3: Seats 7 (left), 6 (middle), 5 (right) */}
                      <div className="grid grid-cols-3 items-center justify-items-center">
                        {[1, 2, 3].map((colVal) => {
                          const seat = selectedVan.seats.find((s) => s.row === 3 && s.col === colVal);
                          if (!seat) return <div key={colVal} className="w-[58px] h-[64px]" />;
                          return renderVanSeat(seat);
                        })}
                      </div>

                      {/* ROW 4: Seats 10 (left), 9 (middle), 8 (right) */}
                      <div className="grid grid-cols-3 items-center justify-items-center">
                        {[1, 2, 3].map((colVal) => {
                          const seat = selectedVan.seats.find((s) => s.row === 4 && s.col === colVal);
                          if (!seat) return <div key={colVal} className="w-[58px] h-[64px]" />;
                          return renderVanSeat(seat);
                        })}
                      </div>

                    </div>
                  </div>
                </div>

                {/* Color Legend exactly like screenshot */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[10px] font-bold text-slate-600 mb-5">
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-950" />
                    <span>D คนขับ (ไม่สามารถเลือกได้)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 rounded bg-purple-200 border border-purple-400" />
                    <span>1 ผู้จัด (ไม่สามารถเลือกได้)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 rounded bg-green-500 border border-green-600" />
                    <span>ว่าง</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-3.5 rounded bg-purple-800 border border-purple-950" />
                    <span>จองแล้ว</span>
                  </div>
                  <div className="flex items-center space-x-2 col-span-2 sm:col-span-1">
                    <div className="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-500" />
                    <span>รออนุมัติ</span>
                  </div>
                </div>
              </div>

              {/* Note information box at bottom */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-purple-950 leading-relaxed font-semibold">
                <Info className="w-4.5 h-4.5 text-[#4c1d95] shrink-0 mt-0.5" />
                <p>
                  หมายเหตุ: ที่นั่ง D (คนขับ) และ 1 (ผู้จัด) ไม่สามารถจองได้ • สามารถจองได้เฉพาะเบาะ 2 - 10 เท่านั้น
                </p>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 shadow-sm flex items-center justify-center flex-1">
              <div>
                <Armchair className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-sm">กรุณาเลือกทริปเดินทางเพื่อเริ่มเลือกรถและเบาะนั่ง</p>
              </div>
            </div>
          )}

        </section>

        {/* ========================================================================= */}
        {/* COLUMN 3: RIGHT SIDE (4 columns on lg) - BOOKING FORM / DIGITAL TICKET */}
        {/* ========================================================================= */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Active Digital Ticket display if user has a booking */}
          {lineUser && userBooking && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-100 pb-3">
                <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span>บัตรโดยสารการจอง</span>
              </h2>

              <div ref={ticketRef} className="relative w-full max-w-[380px] mx-auto bg-white rounded-[20px] overflow-hidden shadow-xl border border-slate-100 flex flex-col font-sans select-none">
                
                {/* 1. Header Section (Gradient purple with climber silhouette moon & birds) */}
                <div className="relative w-full h-[120px] bg-gradient-to-b from-[#56368C] via-[#3C1D6E] to-[#250A4E] overflow-hidden shrink-0">
                  {/* Inline Mountain and Climber Vector Illustration */}
                  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 120" preserveAspectRatio="none">
                    {/* Gradients definition */}
                    <defs>
                      <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="#EAD6FF" stopOpacity="0.3" />
                        <stop offset="50%" stopColor="#C59EFF" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#56368C" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Moon */}
                    <circle cx="270" cy="40" r="32" fill="url(#moonGlow)" />
                    <circle cx="270" cy="40" r="28" fill="#F3EEFA" opacity="0.9" />
                    
                    {/* Birds */}
                    <path d="M190,35 Q193,31 195,33 Q197,31 200,35 Q197,33 195,35 Z" fill="#1C063C" />
                    <path d="M218,25 Q222,21 224,23 Q226,21 230,25 Q226,23 224,25 Z" fill="#1C063C" />
                    <path d="M238,38 Q241,34 243,36 Q245,34 248,38 Q245,36 243,38 Z" fill="#1C063C" />

                    {/* Layer 1: Far Mountains (Lightest purple) */}
                    <path d="M0,120 L0,89 L70,71 L170,98 L250,64 L330,86 L380,68 L380,120 Z" fill="#3B1E6D" />
                    
                    {/* Layer 2: Mid Mountains */}
                    <path d="M140,120 L230,87 L300,45 L330,60 L380,49 L380,120 Z" fill="#1E073F" />
                    
                    {/* Climber silhouette on the main peak at x=300, y=45 */}
                    <path d="M292,32 C293,31 295,31 296,32 C297,33 297,35 296,36 C295,37 293,37 292,36 C291,35 291,33 292,32 Z" fill="#0D0120" /> {/* Head */}
                    {/* Torso & Arms */}
                    <path d="M294,36 L301,42 C303,44 306,41 304,39 L297,34 Z" fill="#0D0120" /> {/* Right Arm reaching out */}
                    <path d="M290,36 L283,30 C281,28 279,30 281,32 L287,37 Z" fill="#0D0120" /> {/* Left Arm reaching up */}
                    <path d="M291,36 C293,36 296,38 297,41 L293,48 L288,41 Z" fill="#0D0120" /> {/* Torso */}
                    {/* Legs bent in climbing/summit stance */}
                    <path d="M288,41 L279,45 L277,52 L282,52 L283,47 L290,43 Z" fill="#0D0120" /> {/* Left Leg */}
                    <path d="M293,41 L296,48 L299,50 L299,53 L295,53 L293,49 L291,43 Z" fill="#0D0120" /> {/* Right Leg */}

                    {/* Pine trees silhouettes on the right */}
                    <g fill="#0D0120">
                      <polygon points="360,60 355,74 365,74" />
                      <polygon points="360,70 352,89 368,89" />
                      <polygon points="360,85 348,109 372,109" />
                      <rect x="358" y="109" width="4" height="21" />
                    </g>
                    
                    {/* Pine trees silhouettes on the left */}
                    <g fill="#3B1E6D" opacity="0.6">
                      <polygon points="20,82 16,94 24,94" />
                      <polygon points="20,90 13,107 27,107" />
                      <polygon points="20,103 10,127 30,127" />
                    </g>
                  </svg>
                  
                  {/* Brand and Logo info overlay */}
                  <div className="absolute left-4 top-4.5 z-20 flex items-center gap-2.5">
                    <div className="w-[50px] h-[50px] bg-[#2E1A47] rounded-full p-0.5 border border-[#EAD6FF]/40 shadow-md flex items-center justify-center shrink-0">
                      <img src="/logo/logo.png" alt="Logo" className="w-[44px] h-[44px] object-contain rounded-full" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-[15px] tracking-wide text-yellow-300 drop-shadow-md font-sans uppercase">DAPAIDERNPAI</span>
                      <span className="font-bold text-[8px] tracking-[0.2em] text-[#EAD6FF] uppercase mt-0.5 drop-shadow">BOARDING PASS</span>
                    </div>
                  </div>
                </div>

                {/* Perforation 1 (Header to Body) */}
                <div className="relative flex items-center justify-center w-full bg-[#f3effa] select-none h-4">
                  <div className="absolute -left-2 w-4 h-4 rounded-full bg-[#f5f6fa] border-r border-[#EAD6FF]/30 z-10 shadow-inner"></div>
                  <div className="flex items-center justify-between w-full px-4 gap-1 opacity-50">
                    {Array.from({ length: 26 }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#2E1A47]/40 shrink-0" />
                    ))}
                  </div>
                  <div className="absolute -right-2 w-4 h-4 rounded-full bg-[#f5f6fa] border-l border-[#EAD6FF]/30 z-10 shadow-inner"></div>
                </div>

                {/* 2. Main Ticket Body (Destination, QR & Booking Details) */}
                <div className="bg-[#f3effa] px-4 pb-2.5 flex-1 flex flex-col">
                  
                  {/* Trip Title & QR row */}
                  <div className="flex justify-between items-stretch gap-3 py-1.5 border-b border-[#2E1A47]/15">
                    
                    {/* Left Column: Trip Info */}
                    <div className="flex flex-col justify-center flex-1 pr-1 min-w-0">
                      <span className="text-[9px] font-black text-[#5A3882]/80 uppercase tracking-wider block">ชื่อทริป</span>
                      <span className="text-[#2E1A47] font-black text-[18px] leading-tight block mt-0.5 tracking-tight truncate-two-lines">
                        {userBooking.tripName}
                      </span>
                      <div className="mt-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-[#2E1A47] text-white">
                          {userBooking.durationDays && userBooking.durationDays > 1 
                            ? `${userBooking.durationDays} วัน ${userBooking.durationDays - 1} คืน` 
                            : 'ไปเช้าเย็นกลับ (1 วัน)'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Vertical Dashed Line Divider */}
                    <div className="w-[1.5px] border-l border-dashed border-[#2E1A47]/20 my-0.5 shrink-0"></div>
                    
                    {/* Right Column: QR Code Container */}
                    <div className="shrink-0 flex flex-col items-center justify-center">
                      <div className="border border-[#2E1A47]/20 rounded-xl bg-white p-2 flex flex-col items-center justify-center w-[110px] shadow-sm">
                        <span className="text-[8px] font-black text-[#5A3882] mb-1 tracking-tight">เช็กอินก่อนขึ้นรถ</span>
                        <div className="bg-white p-0.5 rounded-lg">
                          <QRCodeSVG value={userBooking.id} size={66} level="M" includeMargin={false} />
                        </div>
                        <span className="text-[7px] font-bold text-[#5A3882]/85 text-center leading-tight mt-1 max-w-[95px]">
                          สแกน QR Code นี้ เพื่อเช็กอินก่อนขึ้นรถ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Booking details table grid */}
                  <div className="mt-2.5 border border-[#2E1A47]/15 rounded-xl overflow-hidden bg-white/40 backdrop-blur-sm shadow-sm">
                    {/* Row 1: Van and Seat Label */}
                    <div className="grid grid-cols-2 divide-x divide-[#2E1A47]/15 border-b border-[#2E1A47]/15">
                      <div className="p-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                          <Compass className="w-4.5 h-4.5 text-[#2E1A47]" />
                        </div>
                        <div>
                          <span className="text-[8.5px] font-black text-[#5A3882]/80 block leading-none">คันที่นั่ง</span>
                          <span className="text-[15px] font-black text-[#2E1A47] block mt-0.5 leading-none">{userBooking.vanNumber}</span>
                        </div>
                      </div>
                      <div className="p-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                          <Armchair className="w-4.5 h-4.5 text-[#2E1A47]" />
                        </div>
                        <div>
                          <span className="text-[8.5px] font-black text-[#5A3882]/80 block leading-none">หมายเลขที่นั่ง</span>
                          <span className="text-[15px] font-black text-[#2E1A47] block mt-0.5 leading-none font-mono">{userBooking.seatLabel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Departure Date and Time */}
                    <div className="grid grid-cols-2 divide-x divide-[#2E1A47]/15 border-b border-[#2E1A47]/15">
                      <div className="p-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                          <Calendar className="w-4.5 h-4.5 text-[#2E1A47]" />
                        </div>
                        <div>
                          <span className="text-[8.5px] font-black text-[#5A3882]/80 block leading-none">วันเดินทาง</span>
                          <span className="text-[11.5px] font-black text-[#2E1A47] block mt-0.5 leading-none">{userBooking.departureDate}</span>
                        </div>
                      </div>
                      <div className="p-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                          <Clock className="w-4.5 h-4.5 text-[#2E1A47]" />
                        </div>
                        <div>
                          <span className="text-[8.5px] font-black text-[#5A3882]/80 block leading-none">เวลาเดินทาง</span>
                          <span className="text-[11.5px] font-black text-[#2E1A47] block mt-0.5 leading-none">{userBooking.departureTime} น.</span>
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Pickup Point */}
                    <div className="p-2 flex items-center gap-2 border-b border-[#2E1A47]/15">
                      <div className="w-7 h-7 rounded-lg bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-4.5 h-4.5 text-[#2E1A47]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[8.5px] font-black text-[#5A3882]/80 block leading-none">สถานที่ขึ้นรถ</span>
                        <span className="text-[11.5px] font-black text-[#2E1A47] block mt-0.5 leading-tight truncate">{userBooking.pickupPoint}</span>
                      </div>
                    </div>

                    {/* Row 4: Passenger Info */}
                    <div className="grid grid-cols-2 divide-x divide-[#2E1A47]/15">
                      <div className="p-2 flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                          <User className="w-4.5 h-4.5 text-[#2E1A47]" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8.5px] font-black text-[#5A3882]/80 block leading-none">ชื่อลูกทริป</span>
                          <span className="text-[11.5px] font-black text-[#2E1A47] block mt-0.5 leading-tight truncate">{userBooking.fullName}</span>
                        </div>
                      </div>
                      <div className="p-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                          <Phone className="w-4.5 h-4.5 text-[#2E1A47]" />
                        </div>
                        <div>
                          <span className="text-[8.5px] font-black text-[#5A3882]/80 block leading-none">เบอร์โทรศัพท์ลูกทริป</span>
                          <span className="text-[11.5px] font-black text-[#2E1A47] block mt-0.5 leading-none">{userBooking.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {userBooking.note && (
                    <div className="mt-2 px-2.5 py-1.5 bg-purple-50/70 border border-purple-100/60 rounded-lg leading-relaxed">
                      <span className="text-[#5A3882] font-black text-[8px] block leading-none mb-0.5">รายละเอียดเพิ่มเติม (Note):</span>
                      <span className="text-[#2E1A47] font-bold text-[9.5px] block italic leading-tight">"{userBooking.note}"</span>
                    </div>
                  )}
                </div>

                {/* Perforation 2 (Body to Bottom Section) */}
                <div className="relative flex items-center justify-center w-full bg-[#f3effa] select-none h-4">
                  <div className="absolute -left-2 w-4 h-4 rounded-full bg-[#f5f6fa] border-r border-[#EAD6FF]/30 z-10 shadow-inner"></div>
                  <div className="flex items-center justify-between w-full px-4 gap-1 opacity-50">
                    {Array.from({ length: 26 }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#2E1A47]/40 shrink-0" />
                    ))}
                  </div>
                  <div className="absolute -right-2 w-4 h-4 rounded-full bg-[#f5f6fa] border-l border-[#EAD6FF]/30 z-10 shadow-inner"></div>
                </div>

                {/* 3. Bottom Driver Section with mountain scenery & Van vector graphic */}
                <div className="relative w-full bg-gradient-to-b from-[#DDCFEA] to-[#C9B6E1] p-4 pb-7 overflow-hidden shrink-0">
                  
                  {/* Inline Mountain & Van Silhouette vector on the right */}
                  <svg className="absolute right-0 bottom-0 w-[160px] h-[80px] pointer-events-none select-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" preserveAspectRatio="none">
                    {/* Landscape Background */}
                    <path d="M0,80 Q43,55 95,63 T160,46 L160,80 Z" fill="#2E1A47" opacity="0.35" />
                    
                    {/* Pine trees silhouettes */}
                    <g fill="#2E1A47" opacity="0.4">
                      <polygon points="10,59 7,67 13,67" />
                      <polygon points="10,65 6,76 14,76" />
                      <polygon points="22,63 19,72 25,72" />
                      <polygon points="22,69 18,78 26,78" />
                    </g>

                    {/* White Van Illustration */}
                    <g transform="translate(35, 38) scale(0.85)">
                      {/* Shadow */}
                      <ellipse cx="60" cy="38" rx="55" ry="5.5" fill="#1C063C" opacity="0.3" />
                      
                      {/* Van Body */}
                      <path d="M8,12 C8,8 14,4 25,3 L90,3 C102,3 108,6 110,12 L114,24 C115,26 114,35 111,35 L8,35 C5,35 5,28 6,24 Z" fill="#F8FAFC" />
                      <path d="M8,12 C8,8 14,4 25,3 L90,3 C102,3 108,6 110,12 L114,24" stroke="#CBD5E1" strokeWidth="0.8" fill="none" />
                      
                      {/* Windshield & Windows */}
                      <path d="M92,5 L106,6 L104,18 L90,18 Z" fill="#2E1A47" />
                      <path d="M60,5 L88,5 L88,18 L60,18 Z" fill="#2E1A47" />
                      <path d="M32,5 L56,5 L56,18 L32,18 Z" fill="#2E1A47" />
                      <path d="M11,6 C13,5 20,5 28,5 L28,18 L10,18 C9,15 9,10 11,6 Z" fill="#2E1A47" />
                      
                      {/* Bumper, Lights */}
                      <path d="M108,22 L114,24 C115,26 114,35 111,35 L98,35 Z" fill="#E2E8F0" />
                      <rect x="105" y="27" width="7" height="4.5" rx="1.5" fill="#475569" />
                      <rect x="107" y="29" width="4.5" height="2.5" rx="1" fill="#FEF08A" />
                      
                      {/* Wheels */}
                      <circle cx="92" cy="35" r="9.5" fill="#1e1b4b" />
                      <circle cx="92" cy="35" r="7.5" fill="#475569" />
                      <circle cx="92" cy="35" r="3.5" fill="#94A3B8" />
                      <circle cx="28" cy="35" r="9.5" fill="#1e1b4b" />
                      <circle cx="28" cy="35" r="7.5" fill="#475569" />
                      <circle cx="28" cy="35" r="3.5" fill="#94A3B8" />
                      
                      {/* Side Lines */}
                      <line x1="10" y1="24" x2="90" y2="24" stroke="#CBD5E1" strokeWidth="1" />
                      <rect x="5" y="21" width="3" height="4.5" fill="#EF4444" />
                    </g>
                  </svg>

                  {/* Driver information */}
                  <div className="inline-flex px-2 py-0.5 rounded bg-[#2E1A47] text-white text-[8.5px] font-black mb-2 shadow-sm uppercase tracking-wide relative z-10">
                    ข้อมูลคนขับรถตู้
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-2 relative z-10 max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-[#2E1A47]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[7.5px] font-bold text-[#5A3882]/85 block leading-none">ชื่อคนขับรถตู้</span>
                        <span className="text-[10.5px] font-black text-[#2E1A47] block mt-0.5 truncate leading-none">{userBooking.driverName || 'ยังไม่ระบุ'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                        <Phone className="w-3.5 h-3.5 text-[#2E1A47]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[7.5px] font-bold text-[#5A3882]/85 block leading-none">เบอร์โทรศัพท์คนขับ</span>
                        <span className="text-[10.5px] font-black text-[#2E1A47] block mt-0.5 truncate leading-none">{userBooking.driverPhone || 'ยังไม่ระบุ'}</span>
                      </div>
                    </div>
                  </div>

                  {/* License Plate Visual rendering */}
                  {(() => {
                    const plate = parsePlate(userBooking.plateNumber);
                    return (
                      <div className="mt-2.5 flex items-center gap-2 relative z-10">
                        {/* Realistic Thai Mini License Plate */}
                        <div className="border border-[#2E1A47] bg-white rounded px-1.5 py-0.5 flex flex-col items-center justify-center shrink-0 w-[58px] h-[28px] shadow-sm select-none">
                          <span className="text-[9px] font-extrabold text-[#2E1A47] leading-none tracking-tight">{plate.number}</span>
                          <div className="w-[90%] h-[0.5px] bg-[#2E1A47]/30 my-0.5"></div>
                          <span className="text-[5.5px] font-black text-[#2E1A47] leading-none scale-90">{plate.province}</span>
                        </div>
                        
                        <div>
                          <span className="text-[7.5px] font-bold text-[#5A3882]/80 block leading-none">ป้ายทะเบียนรถ</span>
                          <span className="text-[10.5px] font-black text-[#2E1A47] block mt-0.5 leading-none">{userBooking.plateNumber || 'ยังไม่ระบุ'}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bottom slogan centered exactly matching screenshot */}
                  <div className="absolute bottom-1.5 left-0 right-0 text-center text-[#2E1A47] text-[9.5px] font-black italic tracking-wide select-none">
                    ดำไป เดินไป • ไปด้วยกัน... สนุกกว่า
                  </div>
                </div>
              </div>

              {/* Pending Transfer Banner */}
              {(userBooking as any).pendingTransfer && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2.5 animate-in fade-in duration-300">
                  <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <RefreshCw className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-amber-800 leading-tight">
                      ขอย้ายที่นั่งไปที่ เบาะ {(userBooking as any).pendingTransfer.seatLabel} — รออนุมัติจากแอดมิน
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">คำขอจะถูกอนุมัติหรือปฏิเสธโดยแอดมิน</p>
                  </div>
                  <button
                    onClick={() => handleCancelBooking((userBooking as any).pendingTransfer.id)}
                    className="shrink-0 text-[10px] font-bold text-amber-700 hover:text-rose-600 underline transition"
                  >
                    ยกเลิก
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDownloadTicket}
                  disabled={isDownloading}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition duration-200 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังเตรียมรูปภาพ...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>บันทึกรูปบัตรโดยสาร</span>
                    </>
                  )}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCancelBooking(userBooking.id)}
                    className="flex-1 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600 text-[11px] font-bold transition duration-200"
                  >
                    ยกเลิกการจอง
                  </button>
                  {userBooking.status === 'approved' && !(userBooking as any).pendingTransfer && (
                    <button
                      onClick={() => {
                        setIsRequestingTransfer(true);
                        setSelectedSeat(null);
                        setMessage({
                          type: 'success',
                          text: 'กรุณาเลือกที่นั่งใหม่ที่ว่าง (สีเขียว) บนผังรถตู้เพื่อส่งคำขอย้ายที่นั่ง'
                        });
                        setTimeout(() => setMessage(null), 5000);
                      }}
                      className="flex-1 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#4c1d95] text-[11px] font-bold border border-purple-200 transition duration-200 flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>ขอย้ายที่นั่ง</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transfer Request Form — shown when isRequestingTransfer is active */}
          {lineUser && userBooking && isRequestingTransfer && (
            <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 border-b border-amber-100 pb-3">
                <h2 className="text-sm font-bold text-amber-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>ขอย้ายที่นั่ง</span>
                </h2>
                <button
                  onClick={() => { setIsRequestingTransfer(false); setSelectedSeat(null); }}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* From → To seat display */}
              <div className="flex items-center gap-2 mb-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <div className="text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">ที่นั่งปัจจุบัน</p>
                  <span className="text-lg font-black text-[#4c1d95] font-mono">{userBooking.seatLabel}</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <ChevronRight className="w-5 h-5 text-amber-400" />
                  <ChevronRight className="w-5 h-5 text-amber-500 -ml-3" />
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">ที่นั่งที่ต้องการ</p>
                  {selectedSeat ? (
                    <span className="text-lg font-black text-emerald-600 font-mono">{selectedSeat.label}</span>
                  ) : (
                    <span className="text-sm font-bold text-slate-300">เลือกที่นั่ง</span>
                  )}
                </div>
              </div>

              {!selectedSeat && (
                <div className="mb-4 bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                  <Armchair className="w-6 h-6 mx-auto mb-1 text-purple-300" />
                  <p className="text-[11px] text-purple-700 font-semibold">กรุณาคลิกเลือกที่นั่งว่าง (สีเขียว) ในผังรถตู้ด้านซ้าย</p>
                </div>
              )}

              {selectedSeat && (
                <form onSubmit={handleBookingSubmit} className="space-y-3">
                  <p className="text-[10px] text-slate-500 font-semibold">ข้อมูลของคุณจะถูกใช้ในการส่งคำขอ:</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">ชื่อ-สกุล</span>
                      <span className="font-bold text-slate-800">{fullName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">เบอร์โทร</span>
                      <span className="font-bold text-slate-800">{phone}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">หมายเหตุ (ถ้ามี)</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="เช่น ต้องการนั่งใกล้หน้าต่าง"
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-200 transition duration-200 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 rounded-xl transition duration-200 shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>กำลังส่ง...</span></>
                    ) : (
                      <><RefreshCw className="w-3.5 h-3.5" /><span>ส่งคำขอย้ายที่นั่ง เบาะ {userBooking.seatLabel} → {selectedSeat.label} (รอแอดมินอนุมัติ)</span></>
                    )}
                  </button>

                  <p className="text-center text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    คำขอจะได้รับการตรวจสอบและอนุมัติโดยแอดมิน
                  </p>
                </form>
              )}
            </div>
          )}

          {/* Booking Info Form Column exactly matching screenshot */}
          {(!lineUser || (!userBooking && !isRequestingTransfer && selectedSeat)) && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <User className="w-4.5 h-4.5 text-[#4c1d95]" />
                <span>ข้อมูลผู้จอง</span>
              </h2>

              {/* Selected seat indicator box */}
              <div className="mb-4">
                <span className="text-xs font-bold text-slate-500 block mb-1">เบาะที่เลือก</span>
                <div className="bg-purple-50 border border-purple-100 rounded-xl py-3 text-center text-slate-700 font-extrabold text-lg tracking-wide">
                  {selectedSeat ? (
                    <span className="text-[#4c1d95] font-extrabold font-mono text-xl">
                      เบาะ {selectedSeat.label}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold">-</span>
                  )}
                </div>
              </div>

              {/* Main Booking Form */}
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                
                <div>
                  <label htmlFor="nickname" className="block text-[11px] font-bold text-slate-500 mb-1">
                    ชื่อเล่น (Nickname) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="nickname"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="เช่น นัท, ฝน"
                    disabled={!lineUser}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-[11px] font-bold text-slate-500 mb-1">
                    ชื่อผู้จอง (Full Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="กรอกชื่อจริง-นามสกุล"
                    disabled={!lineUser}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-[11px] font-bold text-slate-500 mb-1">
                    เบอร์โทรศัพท์มือถือ (Phone) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="เช่น 081-234-5678"
                    disabled={!lineUser}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label htmlFor="note" className="block text-[11px] font-bold text-slate-500 mb-1">
                    หมายเหตุ (ถ้ามี)
                  </label>
                  <textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="เช่น อาหาร, แพ้ยา, อื่นๆ"
                    disabled={!lineUser}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200 disabled:opacity-50 resize-none"
                  />
                </div>

                {/* Confirm reservation button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedSeat || !lineUser}
                  className="w-full bg-[#4c1d95] hover:bg-[#3b1774] text-white text-xs font-bold py-2.5 rounded-xl transition duration-200 shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>ยืนยันการจอง</span>
                  )}
                </button>

                {/* Safety text lock */}
                <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-400 font-semibold pt-1">
                  <Lock className="w-3.5 h-3.5 shrink-0 text-slate-300" />
                  <span>ข้อมูลของคุณจะถูกบันทึกอย่างปลอดภัย</span>
                </div>

              </form>
            </div>
          )}

          {/* Form instructions/notice when logged in but no seat selected */}
          {lineUser && !userBooking && !selectedSeat && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-center">
              <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3 text-[#4c1d95] border border-purple-100">
                <Armchair className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-700">เลือกเบาะนั่งบนแผนผัง</h3>
              <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                คุณยังไม่ได้ทำการเลือกเบาะ กรุณาคลิกเลือกเบาะว่างสีเขียวในรถตู้ทางด้านซ้ายเพื่อเปิดกรอกฟอร์มผู้จองครับ
              </p>
            </div>
          )}

        </section>

      </main>
      )}

      {/* Simulated LINE Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#06C755]" />
            
            <div className="text-center mb-5">
              <span className="inline-flex items-center justify-center bg-[#06C755] text-white w-11 h-11 rounded-2xl shadow-md mb-3 font-extrabold text-2xl">
                L
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">LINE Login Simulator</h3>
              <p className="text-xs text-slate-500 mt-1 leading-normal font-semibold">
                จำลองความเสถียรของไลน์ล็อกอินอย่างมีประสิทธิภาพสูงสุดเพื่อทดสอบระบบ
              </p>
            </div>

            {/* Quick account selector */}
            <div className="space-y-2 mb-5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">บัญชีสำหรับทดสอบด่วน:</span>
              
              <div className="grid grid-cols-1 gap-2">
                {MOCK_LINE_USERS.map((user) => (
                  <button
                    key={user.userId}
                    onClick={() => handleLogin(user)}
                    className="flex items-center space-x-3 w-full bg-slate-50 hover:bg-purple-50/50 border border-slate-200 hover:border-purple-200 p-2 rounded-xl text-left transition duration-150"
                  >
                    <img
                      src={user.pictureUrl}
                      alt={user.displayName}
                      className="w-9 h-9 rounded-full border border-slate-100 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800">{user.displayName}</div>
                      <span className="text-[9px] text-green-600 font-semibold block -mt-0.5">LINE Member Account</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">กำหนดชื่อเอง</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            {/* Custom account form */}
            <form onSubmit={handleCustomLogin} className="space-y-4">
              <div>
                <label htmlFor="custom-name" className="block text-[10px] font-bold text-slate-500 mb-1.5">
                  ชื่อบัญชีผู้ใช้
                </label>
                <input
                  type="text"
                  id="custom-name"
                  required
                  value={customLineName}
                  onChange={(e) => setCustomLineName(e.target.value)}
                  placeholder="เช่น พี่โจ้ สายลุย"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-100 transition duration-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-2">เลือกรูปโปรไฟล์</label>
                <div className="flex items-center space-x-3 overflow-x-auto pb-1.5">
                  {[
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
                  ].map((url) => (
                    <button
                      type="button"
                      key={url}
                      onClick={() => setCustomLinePic(url)}
                      className={`relative rounded-full border-2 overflow-hidden shrink-0 ${
                        customLinePic === url ? 'border-[#4c1d95] scale-105 shadow' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <img src={url} className="w-8 h-8 object-cover" alt="avatar" />
                      {customLinePic === url && (
                        <div className="absolute inset-0 bg-[#4c1d95]/20 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold py-2.5 rounded-xl transition duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold py-2.5 rounded-xl transition duration-200 shadow-sm"
                >
                  ยืนยันล็อกอิน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Footer matching clean light style */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] sm:text-xs text-slate-400 font-bold space-y-1">
          <p>© {new Date().getFullYear()} BookingVan Inc. ย่ำไป เดินไป. All rights reserved.</p>
          <div className="flex justify-center items-center gap-1.5 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-400">ระบบซิงค์ข้อมูลเบาะรถตู้แบบเรียลไทม์ความเสถียรสูง</span>
          </div>
        </div>
      </footer>
    </div>
  );

  // Helper render for seats
  function renderVanSeat(seat: Seat) {
    const isSelected = selectedSeat?.id === seat.id;
    let containerStyle = '';
    let headrestStyle = '';
    let cushionStyle = '';

    if (seat.status === 'available') {
      if (isSelected) {
        containerStyle = 'bg-[#c084fc] border-[#581c87] border-b-[4px] text-white shadow-purple-900/40 ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900 scale-105';
        headrestStyle = 'bg-[#e9d5ff]';
        cushionStyle = 'bg-[#9333ea]';
      } else {
        containerStyle = 'bg-[#22c55e] border-[#16a34a] border-b-[4px] text-white hover:bg-[#16a34a] shadow-emerald-950/30';
        headrestStyle = 'bg-[#86efac]';
        cushionStyle = 'bg-[#15803d]';
      }
    } else if (seat.status === 'pending') {
      containerStyle = 'bg-[#fbbf24] border-[#b45309] border-b-[4px] text-amber-950 cursor-not-allowed shadow-amber-950/20';
      headrestStyle = 'bg-[#fde047]';
      cushionStyle = 'bg-[#d97706]';
    } else if (seat.status === 'booked') {
      containerStyle = 'bg-[#6b21a8] border-[#4c1d95] border-b-[4px] text-purple-100 cursor-not-allowed shadow-none';
      headrestStyle = 'bg-[#d8b4fe]/45';
      cushionStyle = 'bg-[#581c87]';
    }

    return (
      <button
        key={seat.id}
        onClick={() => handleSeatClick(seat)}
        disabled={seat.status !== 'available'}
        className={`relative w-[58px] h-[64px] rounded-[14px] flex flex-col justify-between p-1.5 transition-all duration-300 shadow-md select-none hover:scale-105 active:scale-95 border ${containerStyle}`}
      >
        {/* Headrest Cushion */}
        <div className={`w-[32px] h-[10px] rounded-[4px] mx-auto transition-all duration-300 ${headrestStyle}`} />

        {/* Backrest & Seat Cushion */}
        <div className={`flex-1 w-full rounded-[8px] mt-1 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ${cushionStyle}`}>
          <span className="text-[11px] font-black tracking-tight leading-none scale-100">{seat.label}</span>
          {seat.passengerName && (
            <span className="text-[8.5px] font-black tracking-tight leading-none mt-0.5 max-w-[50px] truncate opacity-95 block bg-black/25 px-1 py-0.5 rounded text-white">
              {seat.passengerName.split(' ')[0]}
            </span>
          )}
        </div>
      </button>
    );
  }
}
