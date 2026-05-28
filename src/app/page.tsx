'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import DigitalTicket from '@/components/DigitalTicket';
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
  X,
  ChevronDown
} from 'lucide-react';
import LandingPage from '../components/LandingPage';

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
  status: 'pending' | 'approved' | 'rejected' | 'cancel_pending';
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
  const [downloadingTicketId, setDownloadingTicketId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  
  // Landing Page vs Booking App Mode
  const [isLandingMode, setIsLandingMode] = useState(true);

  // Form States
  const [nickname, setNickname] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  // Profile Form States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Mobile Tab & Modals States
  const [mobileTab, setMobileTab] = useState<'explore' | 'tickets' | 'profile'>('explore');
  const [showBookingHistoryModal, setShowBookingHistoryModal] = useState(false);
  const [allUserBookings, setAllUserBookings] = useState<any[]>([]);
  const [showHelpCenterModal, setShowHelpCenterModal] = useState(false);
  
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
    const stepParam = params.get('step');
    if (tripIdParam || stepParam) {
      if (tripIdParam) setUrlTripId(tripIdParam);
      setIsLandingMode(false);
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

  useEffect(() => {
    if (lineUser) {
      fetchAllUserBookings();
    }
  }, [lineUser]);

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
          const stepParam = params.get('step');
          
          if (tripIdParam && stepParam === '5') {
            const trip = data.trips.find((t: Trip) => t.id === tripIdParam);
            setSelectedTrip(trip || null);
          } else {
            // We intentionally do not auto-select the trip here.
            // This ensures the user starts at Step 1 and can review the trip details before proceeding.
            setSelectedTrip(null);
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
        if (selectedVan) {
          const matchedVan = data.vans.find((v: Van) => v.id === selectedVan.id);
          if (matchedVan) {
            setSelectedVan(matchedVan);
          } else {
            setSelectedVan(null);
          }
        }
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
        const approvedBooking = data.bookings.find((b: Booking) => b.status === 'approved' || b.status === 'cancel_pending');
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
        const approvedBooking = data.bookings.find((b: Booking) => b.status === 'approved' || b.status === 'cancel_pending');
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

  const fetchAllUserBookings = async () => {
    if (!lineUser) return;
    try {
      const res = await fetch(`/api/bookings?lineUserId=${lineUser.userId}`);
      const data = await res.json();
      if (data.success) {
        // Fetch full details for each booking to get tripName, cost, etc.
        const fullBookings = await Promise.all(
          data.bookings.map(async (b: any) => {
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
        setAllUserBookings(fullBookings);
      }
    } catch (err) {
      console.error(err);
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
      const isStaffInSubsequentVan = (selectedVan?.vanNumber || 1) > 1;
      if (!isStaffInSubsequentVan) {
        setMessage({
          type: 'error',
          text: `ที่นั่งผู้จัด (ไม่สามารถจองได้): ${seat.staffName || 'ผู้จัดประจำทริป'}`
        });
        setTimeout(() => setMessage(null), 4000);
        return;
      }
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
        setMessage({ type: 'success', text: 'จองที่นั่งสำเร็จแล้ว! ดูตั๋วของคุณได้ที่ "ตั๋วของฉัน" หรือ "ประวัติการจอง"' });
        setSelectedTrip(null);
        setSelectedVan(null);
        setSelectedSeat(null);
        setUserBooking(null);
        setNote('');
        setIsRequestingTransfer(false);
        fetchAllUserBookings();
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
    if (!confirm('คุณต้องการยกเลิกการจอง/การส่งคำขอนี้ใช่หรือไม่? (รอแอดมินอนุมัติ)')) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancel_pending' }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'ส่งคำขอยกเลิกสำเร็จ รอแอดมินอนุมัติ' });
        // Refresh booking state
        fetchUserBooking();
        fetchAllUserBookings();
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

  const handleDownloadSpecificTicket = async (ticketId: string, seatLabel: string) => {
    const ele = document.getElementById(`ticket-${ticketId}`);
    if (!ele) return;
    
    setDownloadingTicketId(ticketId);
    try {
      const dataUrl = await toPng(ele, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 4
      });
      
      const filename = `BookingTicket-Seat${seatLabel || 'X'}.png`;

      if (navigator.share) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'บัตรโดยสาร Booking Van' });
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
      console.error("Error capturing ticket", err);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกรูปบัตรโดยสาร' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setDownloadingTicketId(null);
    }
  };

  // Determine current timeline step
  const getTimelineStep = () => {
    if (userBooking && !isRequestingTransfer) return 5;
    if (!selectedTrip) return 1;
    if (!selectedVan) return 2;
    if (!selectedSeat) return 3;
    if (isRequestingTransfer && selectedSeat) return 3;
    return 4;
  };

  const currentStep = getTimelineStep();

  // ─── Sync currentStep → URL ?step=N ──────────────────────────────────────
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only sync when user is logged in and has profile (otherwise no step UI shown)
    if (!lineUser || !hasProfile) return;
    const params = new URLSearchParams(window.location.search);
    const currentInUrl = params.get('step');
    if (currentInUrl !== String(currentStep)) {
      params.set('step', String(currentStep));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [currentStep, lineUser, hasProfile]);

  if (isLandingMode) {
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
        
        <LandingPage 
          onLoginClick={() => {
            if (lineUser) {
              setIsLandingMode(false);
            } else {
              handleLoginClick();
            }
          }} 
          showHelpCenter={() => setShowHelpCenterModal(true)} 
          trips={trips}
          isLoggedIn={!!lineUser}
        />
      </div>
    );
  }

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
      <header className="bg-white border-b border-slate-200 py-3 sm:py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            {/* Real Brand Logo */}
            <div className="shrink-0 flex items-center justify-center">
              <img src="/logo/logo.png" alt="DAPAIDERNPAI Logo" className="w-10 h-10 sm:w-14 sm:h-14 object-contain" />
            </div>
            <div className="flex-1 min-w-0 flex items-center">
              <h1 className="text-base sm:text-2xl font-extrabold text-slate-800 tracking-tight leading-tight truncate">
                จองรถตู้ทริป “ด่าไป เดินไป”
              </h1>
            </div>
          </div>

          {/* Quick links on the right */}
          <div className="flex items-center space-x-2 sm:space-x-3 text-xs font-semibold text-slate-600 shrink-0">
            <button
              onClick={() => setShowHelpCenterModal(true)}
              className="hidden sm:flex items-center space-x-1 hover:text-[#4c1d95] transition px-2.5 py-1.5 rounded-lg hover:bg-slate-100 mr-2"
            >
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span>ติดต่อแอดมิน</span>
            </button>
            
            {/* User Profile & Dropdown Menu */}
            {lineUser && (
              <div className="relative group flex items-center">
                <button className="flex items-center bg-white border border-slate-200 rounded-full py-1 px-1 pr-4 shadow-sm hover:border-[#4c1d95] hover:ring-2 hover:ring-purple-100 transition-all focus:outline-none">
                  <img src={lineUser.pictureUrl} alt={lineUser.displayName} className="w-7 h-7 rounded-full border border-slate-100 object-cover mr-2" />
                  <span className="font-bold text-slate-700 text-[11px] mr-2 truncate max-w-[100px]">{lineUser.displayName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#4c1d95] transition-colors" />
                </button>
                
                {/* Invisible hover bridge to prevent menu closing */}
                <div className="absolute top-full right-0 w-full h-2"></div>
                
                {/* Dropdown Menu */}
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right scale-95 group-hover:scale-100 z-50 overflow-hidden flex flex-col py-2">
                  <Link
                    href="/"
                    className="flex items-center px-4 py-2.5 text-left text-[11px] font-bold text-slate-700 hover:bg-purple-50 hover:text-[#4c1d95] transition"
                  >
                    <Compass className="w-4 h-4 mr-2 text-[#4c1d95]" />
                    สำรวจ
                  </Link>
                  <Link
                    href="/tickets"
                    className="flex items-center px-4 py-2.5 text-left text-[11px] font-bold text-slate-700 hover:bg-purple-50 hover:text-[#4c1d95] transition"
                  >
                    <Armchair className="w-4 h-4 mr-2 text-[#4c1d95]" />
                    ตั๋วของฉัน
                  </Link>
                  <button
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center px-4 py-2.5 text-left text-[11px] font-bold text-slate-700 hover:bg-purple-50 hover:text-[#4c1d95] transition w-full"
                  >
                    <User className="w-4 h-4 mr-2 text-[#4c1d95]" />
                    โปรไฟล์
                  </button>
                  <div className="h-[1px] bg-slate-100 my-1 mx-2"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-4 py-2.5 text-left text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Steps horizontal timeline matching screenshot */}
      {lineUser && hasProfile && (
      <section className="bg-white border-b border-slate-200 pt-4 pb-8 md:py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs sm:text-sm font-bold text-slate-500">

          {/* Step 1 — always clickable to go back to start */}
          <button
            onClick={() => { setSelectedTrip(null); setSelectedVan(null); setSelectedSeat(null); setUserBooking(null); }}
            disabled={currentStep === 1 && !userBooking}
            className={`relative flex items-center md:space-x-2 shrink-0 group transition ${currentStep > 1 || userBooking ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition
              ${currentStep === 1 ? 'bg-[#4c1d95] ring-4 ring-purple-100' : 'bg-[#4c1d95]'}
              ${currentStep > 1 || userBooking ? 'group-hover:brightness-110 group-hover:ring-2 group-hover:ring-purple-300' : ''}
            `}>
              {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span className={`absolute top-10 left-0 md:static md:top-auto text-[10px] md:text-sm whitespace-nowrap transition ${currentStep >= 1 ? 'text-[#4c1d95]' : ''} ${currentStep > 1 || userBooking ? 'group-hover:underline' : ''}`}>เลือกทริป</span>
          </button>
          <div className={`flex-1 h-0.5 mx-2 min-w-[10px] ${currentStep > 1 ? 'bg-[#4c1d95]' : 'bg-slate-200'}`} />

          {/* Step 2 — clickable if past step 2 */}
          <button
            onClick={() => { if (!userBooking && currentStep > 2) { setSelectedVan(null); setSelectedSeat(null); } }}
            disabled={currentStep <= 2 || !!userBooking}
            className={`relative flex items-center md:space-x-2 shrink-0 group transition ${!userBooking && currentStep > 2 ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition
              ${currentStep > 2 ? 'bg-[#4c1d95]' : currentStep === 2 ? 'bg-[#4c1d95] ring-4 ring-purple-100' : 'bg-slate-200'}
              ${!userBooking && currentStep > 2 ? 'group-hover:brightness-110 group-hover:ring-2 group-hover:ring-purple-300' : ''}
            `}>
              {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <span className={`absolute top-10 left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:top-auto text-[10px] md:text-sm whitespace-nowrap transition ${currentStep >= 2 ? 'text-[#4c1d95]' : ''} ${!userBooking && currentStep > 2 ? 'group-hover:underline' : ''}`}>เลือกรถตู้</span>
          </button>
          <div className={`flex-1 h-0.5 mx-2 min-w-[10px] ${currentStep > 2 ? 'bg-[#4c1d95]' : 'bg-slate-200'}`} />

          {/* Step 3 — clickable if past step 3 */}
          <button
            onClick={() => { if (!userBooking && currentStep > 3) { setSelectedSeat(null); } }}
            disabled={currentStep <= 3 || !!userBooking}
            className={`relative flex items-center md:space-x-2 shrink-0 group transition ${!userBooking && currentStep > 3 ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition
              ${currentStep === 3 ? 'bg-[#4c1d95] ring-4 ring-purple-100' : currentStep > 3 ? 'bg-[#4c1d95]' : 'bg-slate-200'}
              ${!userBooking && currentStep > 3 ? 'group-hover:brightness-110 group-hover:ring-2 group-hover:ring-purple-300' : ''}
            `}>
              {currentStep > 3 ? <Check className="w-4 h-4" /> : '3'}
            </div>
            <span className={`absolute top-10 left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:top-auto text-[10px] md:text-sm whitespace-nowrap transition ${currentStep >= 3 ? 'text-[#4c1d95]' : ''} ${!userBooking && currentStep > 3 ? 'group-hover:underline' : ''}`}>เลือกที่นั่ง</span>
          </button>
          <div className={`flex-1 h-0.5 mx-2 min-w-[10px] ${currentStep > 3 ? 'bg-[#4c1d95]' : 'bg-slate-200'}`} />

          {/* Step 4 — not clickable (form step) */}
          <div className="relative flex items-center md:space-x-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${currentStep === 4 ? 'bg-[#4c1d95] ring-4 ring-purple-100' : currentStep > 4 ? 'bg-[#4c1d95]' : 'bg-slate-200'}`}>
              {currentStep > 4 ? <Check className="w-4 h-4" /> : '4'}
            </div>
            <span className={`absolute top-10 left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:top-auto text-[10px] md:text-sm whitespace-nowrap transition ${currentStep >= 4 ? 'text-[#4c1d95]' : ''}`}>กรอกข้อมูล</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 min-w-[10px] ${currentStep > 4 ? 'bg-[#4c1d95]' : 'bg-slate-200'}`} />

          {/* Step 5 */}
          <div className="relative flex items-center md:space-x-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${currentStep === 5 ? 'bg-[#4c1d95] ring-4 ring-purple-100' : 'bg-slate-200'}`}>
              {currentStep > 5 ? <Check className="w-4 h-4" /> : '5'}
            </div>
            <span className={`absolute top-10 right-0 md:static md:top-auto text-[10px] md:text-sm whitespace-nowrap transition ${currentStep === 5 ? 'text-[#4c1d95]' : ''}`}>ยืนยันการจอง</span>
          </div>

        </div>
      </section>
      )}

      {lineUser && (!hasProfile || showProfileModal) ? (
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
                  <input type="text" id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="เช่น นายสมชาย ใจดี (ระบุคำนำหน้าด้วย)" className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
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
                    <input type="tel" id="phone" required maxLength={10} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="เช่น 0812345678" className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
                  </div>
                </div>

                <div>
                  <label htmlFor="nationalId" className="block text-[11px] font-bold text-slate-500 mb-1">
                    เลขบัตรประจำตัวประชาชน (National ID) <span className="text-red-500">*</span>
                  </label>
                  <input type="tel" id="nationalId" required value={nationalId} onChange={(e) => setNationalId(e.target.value.replace(/[^0-9]/g, '').slice(0, 13))} placeholder="เลข 13 หลัก" maxLength={13} className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
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
                    <input type="tel" id="emergencyPhone" required maxLength={10} value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))} placeholder="เช่น 0891234567" className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
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
                    ข้าพเจ้ายินยอมให้ผู้จัดทริป “ด่าไป เดินไป” เก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลของข้าพเจ้า ได้แก่ ชื่อ-นามสกุล เบอร์โทรศัพท์ เลขบัตรประชาชน วันเดือนปีเกิด ข้อมูลผู้ติดต่อฉุกเฉิน รวมถึงข้อมูลสุขภาพ เช่น โรคประจำตัว และอาการแพ้อาหาร เพื่อใช้ในการ
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-500 font-medium">
                      <li>ทำประกันการเดินทาง</li>
                      <li>ติดต่อกรณีฉุกเฉิน</li>
                      <li>ดูแลความปลอดภัยระหว่างเข้าร่วมทริป</li>
                    </ul>
                    <p className="mt-1 text-slate-500 font-medium">
                      โดยข้อมูลจะถูกจัดเก็บอย่างเหมาะสม และใช้เท่าที่จำเป็นตามวัตถุประสงค์ดังกล่าวเท่านั้น จะไม่มีการเผยแพร่ข้อมูลให้บุคคลอื่น
                    </p>
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
      ) : !lineUser ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 py-12 animate-in fade-in zoom-in-95 duration-500">
           <div className="bg-white max-w-sm w-full rounded-3xl shadow-xl border border-slate-200 p-8 text-center flex flex-col items-center">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <User className="w-8 h-8 text-slate-300" />
             </div>
             <h2 className="text-lg font-black text-slate-800 mb-2">เข้าสู่ระบบเพื่อดำเนินการต่อ</h2>
             <p className="text-xs text-slate-500 mb-6 leading-relaxed">
               กรุณาเข้าสู่ระบบด้วย LINE เพื่อทำการจองที่นั่งและดูข้อมูลตั๋วโดยสารของคุณ
             </p>
             <button
               onClick={handleLoginClick}
               className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white py-3.5 px-4 rounded-xl font-black text-xs transition-all duration-300 shadow-md shadow-[#06C755]/20 flex items-center justify-center gap-2 active:scale-95"
             >
               <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0">
                 <path d="M24 10.3c0-4.7-4.8-8.5-10.7-8.5S2.7 5.6 2.7 10.3c0 4.2 3.8 7.7 8.9 8.4.3.1.8.2.9.5.1.2 0 .6-.1.8l-.4 2.6c0 .3-.2 1.1 1 0l7.2-7.2h.1c2.7-1.1 3.9-3.1 3.9-5.1z" />
               </svg>
               <span>เข้าสู่ระบบด้วย LINE</span>
             </button>
           </div>
        </div>
      ) : (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-grow flex flex-col gap-6 pb-24 lg:pb-10">
        
        {/* Back Navigation — show on step 2+ */}
        {currentStep > 1 && !userBooking && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentStep === 2) { setSelectedTrip(null); setSelectedVan(null); setSelectedSeat(null); }
                if (currentStep === 3) { setSelectedVan(null); setSelectedSeat(null); }
                if (currentStep === 4) { setSelectedSeat(null); }
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#4c1d95] transition px-3 py-1.5 rounded-lg hover:bg-purple-50 border border-slate-200 bg-white shadow-sm"
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              <span>ย้อนกลับ</span>
            </button>
            <span className="text-[11px] text-slate-400 font-semibold">
              {currentStep === 2 && selectedTrip && `ทริป: ${selectedTrip.name}`}
              {currentStep === 3 && selectedVan && `รถตู้คันที่ ${selectedVan.vanNumber}`}
              {currentStep === 4 && selectedSeat && `เบาะที่ ${selectedSeat.label}`}
            </span>
          </div>
        )}

        {/* On mobile, if active tab is profile, show the profile screen */}
        {mobileTab === 'profile' && lineUser && (
          <div className="lg:hidden col-span-1 flex flex-col gap-6 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm animate-in fade-in duration-200">
            {/* Profile Header */}
            <div className="border-b border-slate-100 pb-4 text-center">
              <h2 className="text-base font-bold text-slate-800">โปรไฟล์</h2>
            </div>

            {/* Profile Card Section */}
            <div className="flex flex-col items-center py-6 bg-slate-50 rounded-2xl border border-slate-100/50">
              <div className="w-20 h-20 bg-slate-200 rounded-full overflow-hidden border-4 border-white shadow-md relative">
                <img
                  src={lineUser.pictureUrl}
                  alt={lineUser.displayName}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800 mt-3">
                {fullName || lineUser.displayName}
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-1 font-mono">
                {phone || 'ยังไม่ได้ระบุเบอร์โทรศัพท์'}
              </p>
            </div>

            {/* Menu List matching screenshot */}
            <div className="flex flex-col gap-1 mt-2">
              {/* Menu Item 1: ข้อมูลส่วนตัว */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-full flex items-center justify-between py-3.5 px-3 hover:bg-slate-50 rounded-2xl transition duration-200 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#4c1d95]/10 flex items-center justify-center text-[#4c1d95]">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">ข้อมูลส่วนตัว & ประกันภัย</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Menu Item 2: ประวัติการจอง */}
              <button
                onClick={() => {
                  fetchAllUserBookings();
                  setShowBookingHistoryModal(true);
                }}
                className="w-full flex items-center justify-between py-3.5 px-3 hover:bg-slate-50 rounded-2xl transition duration-200 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#4c1d95]/10 flex items-center justify-center text-[#4c1d95]">
                    <Clock className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">ประวัติการจองทริป</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Menu Item 3: ติดต่อแอดมิน */}
              <button
                onClick={() => setShowHelpCenterModal(true)}
                className="w-full flex items-center justify-between py-3.5 px-3 hover:bg-slate-50 rounded-2xl transition duration-200 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#4c1d95]/10 flex items-center justify-center text-[#4c1d95]">
                    <MessageSquare className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">ศูนย์ช่วยเหลือ & ติดต่อแอดมิน</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between py-3.5 px-3 hover:bg-rose-50 rounded-2xl transition duration-200 text-left mt-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                    <LogOut className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-bold text-rose-600">ออกจากระบบ (LINE Logout)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          </div>
        )}

        {/* On mobile, if active tab is tickets, show all tickets */}
        {mobileTab === 'tickets' && lineUser && (
          <div className="lg:hidden col-span-1 flex flex-col gap-4 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4 text-center">
              <h2 className="text-base font-bold text-slate-800 flex items-center justify-center gap-2">
                <Armchair className="w-5 h-5 text-[#4c1d95]" />
                <span>ตั๋วโดยสารของฉัน</span>
              </h2>
            </div>
            
            <div className="flex flex-col gap-8 pb-4">
              {allUserBookings.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <Armchair className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">ยังไม่มีตั๋วโดยสาร</p>
                  <button onClick={() => setMobileTab('explore')} className="mt-4 text-xs font-bold text-[#4c1d95] bg-purple-50 hover:bg-purple-100 px-4 py-2.5 rounded-xl transition border border-purple-100">
                    ไปสำรวจทริปกันเลย
                  </button>
                </div>
              ) : (
                allUserBookings.map((b) => (
                  <div key={b.id} className="flex flex-col items-center">
                    <DigitalTicket booking={b as any} htmlId={`ticket-${b.id}`} />
                    
                    <div className="w-full max-w-[380px] mt-4 flex flex-col gap-2 px-1">
                      <button
                        onClick={() => handleDownloadSpecificTicket(b.id, b.seatLabel)}
                        disabled={downloadingTicketId === b.id}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition duration-200 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {downloadingTicketId === b.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>กำลังเตรียมรูปภาพ...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>บันทึกรูปตั๋วใบนี้</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => { 
                          const t = trips.find(trip => trip.id === b.tripId);
                          if (t) setSelectedTrip(t);
                          setMobileTab('explore'); 
                        }}
                        className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition duration-200 shadow-sm"
                      >
                        จัดการที่นั่งทริปนี้ / ดูรายละเอียด
                      </button>
                    </div>
                    {b !== allUserBookings[allUserBookings.length - 1] && (
                      <div className="w-full h-[1px] bg-slate-200 mt-8 mb-2 border-dashed"></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* COLUMN 1: LEFT SIDE (3 columns on lg) - SELECT TRIP & VAN */}
        {/* ========================================================================= */}
        <section className={`flex-col gap-6 lg:flex lg:col-span-3 ${currentStep === 1 || currentStep === 2 || isRequestingTransfer ? (mobileTab === 'explore' ? 'flex' : 'hidden') : 'hidden'}`}>
          
          {/* 1.1 เลือกทริป — Show only on step 1 */}
          <div className={currentStep > 1 || (userBooking && isRequestingTransfer) ? 'hidden' : 'block'}>
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
                {!urlTripId && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-1 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-amber-800 text-[11px] font-bold leading-relaxed">
                      โปรดเข้าสู่ระบบผ่านลิ้งก์ที่แอดมินส่งให้เท่านั้น (คุณจะไม่สามารถเลือกทริปจองเองได้)
                    </p>
                  </div>
                )}
                {trips.map((trip) => {
                  const isSelected = selectedTrip?.id === trip.id;
                  const nights = trip.durationDays - 1;
                  const seatsLeft = trip.availableSeats ?? 0;
                  const userBookedThisTrip = allUserBookings.some(b => b.tripId === trip.id && b.status !== 'cancelled');
                  const isDisabled = urlTripId !== trip.id || userBookedThisTrip;
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
                          : userBookedThisTrip
                            ? 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50 grayscale-[50%]'
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
                            userBookedThisTrip
                              ? 'bg-purple-600/90 text-white border-purple-500'
                              : seatsLeft > 0
                                ? 'bg-emerald-500/90 text-white border-emerald-400'
                                : 'bg-rose-500/90 text-white border-rose-400'
                          }`}>
                            {userBookedThisTrip ? 'จองแล้ว' : seatsLeft > 0 ? `ว่าง ${seatsLeft} ที่` : 'เต็ม'}
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
                          {/* Cost / Price row */}
                          <div className="flex items-center gap-1 pt-0.5">
                            <span className="text-[10px] font-bold text-[#4c1d95]">ราคาทริป:</span>
                            <span className="text-xs font-black text-[#4c1d95] font-mono">
                              ฿{trip.cost?.toLocaleString('th-TH') || '0'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-semibold">/ ท่าน</span>
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
          </div> {/* end trip section wrapper */}
          {/* 1.2 เลือกรถตู้ — show only on step 2 */}
          <div className={currentStep === 1 && !(userBooking && isRequestingTransfer) ? 'hidden' : 'block'}>
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
          </div> {/* end van section wrapper */}

        </section>

        {/* ========================================================================= */}
        {/* COLUMN 2: MIDDLE (5 columns on lg) - DETAILED VAN & SEAT MAP */}
        {/* ========================================================================= */}
        <section className={`flex-col gap-6 lg:col-span-5 ${(userBooking && !isRequestingTransfer) ? 'hidden lg:hidden' : (currentStep === 3 || isRequestingTransfer ? (mobileTab === 'explore' ? 'flex lg:flex' : 'hidden lg:hidden') : 'hidden lg:hidden')}`}>
          
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
                          if (selectedVan.vanNumber > 1) {
                            return renderVanSeat(seat);
                          }
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
        <section className={`flex-col gap-6 lg:col-span-4 ${(currentStep === 4 || currentStep === 5 || !!userBooking) ? (mobileTab === 'explore' ? 'flex lg:flex' : 'hidden lg:hidden') : 'hidden lg:hidden'}`}>
          
          {/* Active Digital Ticket display if user has a booking */}
          {lineUser && userBooking && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-100 pb-3">
                <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span>บัตรโดยสารการจอง</span>
              </h2>

                            <DigitalTicket ref={ticketRef} booking={userBooking as any} htmlId="main-ticket" />
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
                  {userBooking.status === 'cancel_pending' ? (
                    <div className="flex-1 py-2 rounded-xl bg-rose-50 text-rose-600 text-[11px] font-bold border border-rose-200 flex items-center justify-center gap-1.5 cursor-not-allowed opacity-80">
                      <Clock className="w-3.5 h-3.5" />
                      <span>รอแอดมินอนุมัติการยกเลิก</span>
                    </div>
                  ) : (
                    <>
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
                            if (vans.length > 0) {
                              const currentVan = vans.find(v => v.vanNumber === userBooking.vanNumber);
                              if (currentVan) setSelectedVan(currentVan);
                            }
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
                    </>
                  )}
                </div>
                
                {/* Finish / Loop back to Step 1 button */}
                <button
                  onClick={() => {
                    setSelectedTrip(null);
                    setSelectedVan(null);
                    setSelectedSeat(null);
                    setUserBooking(null);
                    if (mobileTab !== 'explore') setMobileTab('explore');
                  }}
                  className="w-full mt-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold transition duration-200 shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>การจองเสร็จสิ้น / จองทริปอื่นต่อ</span>
                </button>
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

              {/* Selected seat & Trip cost indicators */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">เบาะที่เลือก</span>
                  <div className="bg-purple-50 border border-purple-100 rounded-xl py-3 text-center text-slate-700 font-extrabold text-lg tracking-wide h-[54px] flex items-center justify-center">
                    {selectedSeat ? (
                      <span className="text-[#4c1d95] font-extrabold font-mono text-base">
                        เบาะ {selectedSeat.label}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold text-base">-</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">ราคาทริป</span>
                  <div className="bg-purple-50/50 border border-[#4c1d95]/10 rounded-xl py-3 text-center text-[#4c1d95] font-extrabold tracking-wide h-[54px] flex items-center justify-center">
                    {selectedTrip ? (
                      <span className="font-extrabold text-base font-mono">
                        ฿{selectedTrip.cost?.toLocaleString('th-TH') || '0'}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold text-base">-</span>
                    )}
                  </div>
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
                    placeholder="กรอกชื่อจริง-นามสกุล (ระบุคำนำหน้าด้วย)"
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
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    placeholder="เช่น 0812345678"
                    disabled={!lineUser}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#4c1d95] rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200 disabled:opacity-50"
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

      {/* Booking History Modal */}
      {showBookingHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#4c1d95]" />
            
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-[#4c1d95]" />
                <span>ประวัติการจองทริปทั้งหมด</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBookingHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Bookings list container */}
            <div className="max-h-[360px] overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
              {allUserBookings.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">ยังไม่เคยมีประวัติการจองทริป</p>
              ) : (
                allUserBookings.map((b) => (
                  <div key={b.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 leading-tight">
                        ทริปที่จอง: {b.tripName || 'ไม่ระบุชื่อทริป'}
                      </span>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                        b.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : b.status === 'pending'
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : b.status === 'cancel_pending'
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {b.status === 'approved' ? 'อนุมัติแล้ว' : b.status === 'cancel_pending' ? 'รออนุมัติยกเลิก' : b.status === 'pending' ? 'รออนุมัติ' : 'ยกเลิก'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 font-semibold">
                      <span>เบาะ: {b.seatLabel || b.seatId}</span>
                      <span>ออก: {b.departureDate || ''} เวลา {b.departureTime || ''} น.</span>
                    </div>
                    <div className="border-t border-slate-200/50 pt-2 flex items-center justify-between text-[10px] font-black text-[#4c1d95]">
                      <span>ราคาทริป</span>
                      <span>฿{b.cost?.toLocaleString('th-TH') || '0'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowBookingHistoryModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl transition duration-200"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Center & Contact Modal */}
      {showHelpCenterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#4c1d95]" />
            
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-[#4c1d95]" />
                <span>ศูนย์ช่วยเหลือ & ติดต่อแอดมิน</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpCenterModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-slate-600">
              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3">
                <h4 className="font-bold text-[#4c1d95] mb-1">ต้องการยกเลิกหรือขอเปลี่ยนเบาะที่นั่ง?</h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  ลูกทริปสามารถส่งคำขอย้ายเบาะที่นั่งได้โดยตรงบนแผนผังรถตู้ โดยการคลิกเบาะเดิมของตนเองแล้วเลือกเบาะใหม่ จากนั้นระบบจะส่งเรื่องให้แอดมินทำการอนุมัติทันที
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-700">ช่องทางการติดต่อแอดมิน</h4>
                <p className="text-[11px]">
                  หากมีข้อสงสัยเกี่ยวกับรายละเอียดของทริป การทำประกันเดินทาง หรือต้องการความช่วยเหลือเพิ่มเติม สามารถติดต่อผ่านช่องทาง Line Official Account หรือเบอร์โทรติดต่อได้ตลอดเวลาครับ
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <a
                    href="https://line.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#06C755] hover:bg-[#05b34c] text-white py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                  >
                    <MessageSquare className="w-4.5 h-4.5" />
                    <span>ติดต่อแอดมินผ่าน LINE Official</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpCenterModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl transition duration-200"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar matching screenshot style */}
      {lineUser && hasProfile && !showProfileModal && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-2 px-6 flex justify-around items-center shadow-lg">
          {/* Tab 1: สำรวจ */}
          <button
            onClick={() => setMobileTab('explore')}
            className={`flex flex-col items-center gap-0.5 transition-colors duration-200 ${
              mobileTab === 'explore' ? 'text-[#4c1d95]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[9.5px] font-bold">สำรวจ</span>
            {mobileTab === 'explore' && <span className="w-1 h-1 bg-[#4c1d95] rounded-full mt-0.5" />}
          </button>

          {/* Tab 2: ตั๋วของฉัน */}
          <Link
            href="/tickets"
            className={`flex flex-col items-center gap-0.5 transition-colors duration-200 text-slate-400 hover:text-slate-600`}
          >
            <div className="relative">
              <Armchair className="w-5 h-5" />
              {userBooking && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
              )}
            </div>
            <span className="text-[9.5px] font-bold">ตั๋วของฉัน</span>
          </Link>

          {/* Tab 3: โปรไฟล์ */}
          <button
            onClick={() => setMobileTab('profile')}
            className={`flex flex-col items-center gap-0.5 transition-colors duration-200 ${
              mobileTab === 'profile' ? 'text-[#4c1d95]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[9.5px] font-bold">โปรไฟล์</span>
            {mobileTab === 'profile' && <span className="w-1 h-1 bg-[#4c1d95] rounded-full mt-0.5" />}
          </button>
        </div>
      )}

      {/* Modern Footer matching clean light style */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] sm:text-xs text-slate-400 font-bold space-y-1">
          <p>© {new Date().getFullYear()} ด่าไป เดินไป. All rights reserved.</p>
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
