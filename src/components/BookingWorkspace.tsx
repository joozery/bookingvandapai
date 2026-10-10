import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { AlertTriangle, Armchair, Calendar, Check, CheckCircle2, ChevronRight, Clock, Compass, Download, Info, Lock, LogOut, MapPin, MessageSquare, Phone, RefreshCw, User, X } from 'lucide-react';
import { formatThaiDate } from '@/lib/dateFormat';
import { MESSENGER_URL } from '@/lib/contact';
import BookingBackNavigation from '@/components/BookingBackNavigation';
import BookingSeat from '@/components/BookingSeat';

const DigitalTicket = dynamic(() => import('@/components/DigitalTicket'));

export default function BookingWorkspace(props: Record<string, any>) {
  const {
    lineUser, hasProfile, showProfileModal, currentStep, userBooking, isRequestingTransfer, mobileTab,
    allUserBookings, trips, selectedTrip, selectedVan, selectedSeat, vans, loading, tripSearch,
    urlTripId, completedTripSearch, downloadingTicketId, ticketRef, nickname, setNickname,
    titleName, setTitleName, fullName, setFullName, phone, setPhone, note, setNote,
    nationalId, setNationalId, birthDate, setBirthDate, emergencyName, setEmergencyName,
    emergencyPhone, setEmergencyPhone, allergies, setAllergies, medicalConditions, setMedicalConditions,
    consentInsurance, setConsentInsurance, isSubmitting, message, setMessage, hasFormDraft,
    setSelectedTrip, setSelectedVan, setSelectedSeat, setUserBooking, setMobileTab,
    setTripSearch, setCompletedTripSearch, setShowProfileModal, setShowBookingHistoryModal,
    setShowHelpCenterModal, fetchAllUserBookings, handleLogout, handleSeatClick,
    handleBookingSubmit, handleCancelBooking, handleDownloadSpecificTicket, isDownloading,
    handleDownloadTicket, handleRequestTransfer, handleLoginClick, setShowLoginModal, showLoginModal,
    setLineUser, setIsRequestingTransfer, DEFAULT_PROFILE_IMAGE,
    setSelectedTrip: _setSelectedTrip,
  } = props;

  return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 2xl:px-8 py-6 w-full flex-grow flex flex-col gap-6 pb-24 2xl:pb-10">
        
        {/* Back Navigation — show on step 2+ */}
        {currentStep > 1 && !userBooking && (
          <BookingBackNavigation
            currentStep={currentStep}
            tripName={selectedTrip?.name}
            vanNumber={selectedVan?.vanNumber}
            seatLabel={selectedSeat?.label}
            onBack={() => {
              if (currentStep === 2) { setSelectedTrip(null); setSelectedVan(null); setSelectedSeat(null); }
              if (currentStep === 3) { setSelectedVan(null); setSelectedSeat(null); }
              if (currentStep === 4) { setSelectedSeat(null); }
            }}
          />
        )}
        {selectedTrip !== null && selectedVan !== null && selectedSeat !== null && false && currentStep > 1 && !userBooking && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentStep === 2) { setSelectedTrip(null); setSelectedVan(null); setSelectedSeat(null); }
                if (currentStep === 3) { setSelectedVan(null); setSelectedSeat(null); }
                if (currentStep === 4) { setSelectedSeat(null); }
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-700 transition px-3 py-1.5 rounded-lg hover:bg-purple-50 border border-slate-200 bg-white shadow-sm"
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
          <div className="2xl:hidden col-span-1 flex flex-col gap-6 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm animate-in fade-in duration-200">
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
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                    setLineUser(previous => previous ? { ...previous, pictureUrl: DEFAULT_PROFILE_IMAGE } : previous);
                  }}
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
                  <div className="w-9 h-9 rounded-xl bg-brand-700/10 flex items-center justify-center text-brand-700">
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
                  <div className="w-9 h-9 rounded-xl bg-brand-700/10 flex items-center justify-center text-brand-700">
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
                  <div className="w-9 h-9 rounded-xl bg-brand-700/10 flex items-center justify-center text-brand-700">
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
          <div className="2xl:hidden col-span-1 flex flex-col gap-4 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4 text-center">
              <h2 className="text-base font-bold text-slate-800 flex items-center justify-center gap-2">
                <Armchair className="w-5 h-5 text-brand-700" />
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
                  <button onClick={() => setMobileTab('explore')} className="mt-4 text-xs font-bold text-brand-700 bg-purple-50 hover:bg-purple-100 px-4 py-2.5 rounded-xl transition border border-purple-100">
                    ดูทริปที่เปิดอยู่
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
        <section className={`flex-col gap-6 2xl:col-span-3 ${mobileTab === 'completed' || ((currentStep === 1 || currentStep === 2 || isRequestingTransfer) && mobileTab === 'explore') ? 'flex' : 'hidden'}`}>
          
          {/* 1.1 เลือกทริป — Show only on step 1 */}
          <div className={mobileTab === 'completed' || (currentStep === 1 && !(userBooking && isRequestingTransfer)) ? 'block' : 'hidden'}>
          <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ${mobileTab === 'completed' ? 'hidden' : ''}`}>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 mb-4 flex items-center gap-1.5 uppercase tracking-wide">
              <Compass className="w-4 h-4 text-brand-700" />
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
              <div className="flex flex-col gap-3 h-full">
                {/* Search Bar */}
                <div className="relative mb-1 shrink-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="ค้นหาทริป..."
                    value={tripSearch}
                    onChange={(e) => setTripSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-purple-200 transition-colors placeholder-slate-400"
                  />
                </div>

                <div
                  className="flex flex-col gap-3 overflow-y-auto scrollbar-thin flex-1"
                  style={{ maxHeight: '500px', WebkitOverflowScrolling: 'touch' }}
                >
                  {!urlTripId && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-1 flex items-start gap-2 shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-amber-800 text-[11px] font-bold leading-relaxed">
                        โปรดเข้าสู่ระบบผ่านลิ้งก์ที่แอดมินส่งให้เท่านั้น (คุณจะไม่สามารถเลือกทริปจองเองได้)
                      </p>
                    </div>
                  )}
                  {!trips.some(t => t.status !== 'completed' && t.name.toLowerCase().includes(tripSearch.toLowerCase())) && (
                    <p className="py-4 text-center text-xs text-slate-400">ไม่พบทริปที่เปิดรับจอง</p>
                  )}
                  {trips.filter(t => t.status !== 'completed' && t.name.toLowerCase().includes(tripSearch.toLowerCase())).map((trip) => {
                  const isSelected = selectedTrip?.id === trip.id;
                  const nights = trip.durationDays - 1;
                  const seatsLeft = trip.availableSeats ?? 0;
                  const userBookedThisTrip = allUserBookings.some(b => b.tripId === trip.id && b.status !== 'cancelled');
                  const isDisabled = urlTripId !== trip.id || userBookedThisTrip;
                  const parts = (trip.tripPeriod || '').split('||');
                  const hasCustomDuration = parts.length > 1;
                  const period = hasCustomDuration ? parts[1] : parts[0];
                  const durationText = hasCustomDuration ? parts[0] : (nights > 0 ? `${trip.durationDays} วัน ${nights} คืน` : `ไปเช้าเย็นกลับ (1 วัน)`);

                  return (
                    <div
                      key={trip.id}
                      role="button"
                      tabIndex={isDisabled ? -1 : 0}
                      onClick={() => {
                        if (isDisabled) return;
                        setSelectedTrip(trip);
                        setSelectedSeat(null);
                      }}
                      className={`w-full text-left relative rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                        isSelected
                          ? 'border-brand-700 shadow-lg shadow-purple-200'
                          : userBookedThisTrip
                            ? 'border-slate-300 opacity-60 cursor-not-allowed grayscale-[40%]'
                            : isDisabled
                              ? 'border-slate-200 opacity-50 cursor-not-allowed'
                              : 'border-transparent hover:border-purple-300 cursor-pointer'
                      }`}
                      style={{ minHeight: '130px', height: '130px', flexShrink: 0 }}
                    >
                      {/* Full bleed background image */}
                      <img
                        src={trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&auto=format&fit=crop&q=80'}
                        alt={trip.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />

                      {/* Content on top of gradient */}
                      <div className="relative h-full flex items-center justify-between px-4 py-4 pb-5 gap-2">
                        {/* Left: trip info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="text-white font-black text-sm leading-tight drop-shadow line-clamp-1">{trip.name}</h3>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-purple-300 shrink-0" />
                            <span className="text-white/90 text-[10px] font-bold">
                              {durationText}
                              {period && <span className="text-white/60 font-normal ml-1">({period})</span>}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-white/50 shrink-0" />
                              <span className="text-white/70 text-[10px] font-semibold">วันที่ออกเดินทาง {formatThaiDate(trip.departureDate)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-white/50 shrink-0" />
                              <span className="text-white/70 text-[10px] font-semibold">{trip.departureTime} น.</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-300 text-xs font-black">฿{trip.cost?.toLocaleString('th-TH') || '0'}</span>
                            <span className="text-white/50 text-[9px]">/ ท่าน</span>
                          </div>
                        </div>

                        {/* Right: seat badge + check circle */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            userBookedThisTrip
                              ? 'bg-purple-600/90 text-white border-purple-500'
                              : seatsLeft > 0
                                ? 'bg-emerald-500/90 text-white border-emerald-400'
                                : 'bg-rose-500/90 text-white border-rose-400'
                          }`}>
                            {userBookedThisTrip ? 'จองแล้ว' : seatsLeft > 0 ? `ว่าง ${seatsLeft} ที่` : 'เต็ม'}
                          </div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                            isSelected ? 'bg-brand-700 border-brand-700 text-white' : 'border-white/60 bg-white/20'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
          {!loading && (
            <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${mobileTab === 'completed' ? 'block' : 'hidden'}`}>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800 sm:text-base">
                <Check className="h-4 w-4 text-slate-500" /> ทริปที่จบไปแล้ว
              </h2>
              <input
                type="search"
                aria-label="ค้นหาทริปที่จบไปแล้ว"
                placeholder="ค้นหาทริปที่จบไปแล้ว..."
                value={completedTripSearch}
                onChange={e => setCompletedTripSearch(e.target.value)}
                className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:border-brand-700"
              />
              <div className="flex max-h-[500px] flex-col gap-3 overflow-y-auto">
                {trips.filter(t => t.status === 'completed' && t.name.toLowerCase().includes(completedTripSearch.toLowerCase())).map(trip => {
                  const nights = trip.durationDays - 1;
                  const parts = (trip.tripPeriod || '').split('||');
                  const hasCustomDuration = parts.length > 1;
                  const durationText = hasCustomDuration ? parts[0] : (nights > 0 ? `${trip.durationDays} วัน ${nights} คืน` : `ไปเช้าเย็นกลับ (1 วัน)`);
                  return (
                  <article key={trip.id} className="relative min-h-[130px] shrink-0 overflow-hidden rounded-xl bg-slate-700">
                    <img
                      src={trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&auto=format&fit=crop&q=80'}
                      alt={trip.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />
                    <div className="relative flex min-h-[130px] items-center justify-between gap-3 p-4">
                      <div className="min-w-0 space-y-2">
                        <h3 className="text-sm font-black text-white">{trip.name}</h3>
                        <p className="text-xs text-white/80">{trip.tripPeriod?.split('||').pop() || trip.departureDate}</p>
                        <p className="text-xs text-white/70">{durationText}</p>
                        <Link href={`/trips/${encodeURIComponent(trip.id)}/reviews`} className="inline-flex rounded-lg bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25">ดูรีวิวและคะแนนเฉลี่ย →</Link>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/30 bg-slate-800/80 px-3 py-1 text-[10px] font-bold text-white">จบแล้ว</span>
                    </div>
                  </article>
                  );
                })}
                {!trips.some(t => t.status === 'completed' && t.name.toLowerCase().includes(completedTripSearch.toLowerCase())) && (
                  <p className="py-4 text-center text-xs text-slate-400">{completedTripSearch ? 'ไม่พบทริปที่จบไปแล้วตรงกับคำค้นหา' : 'ยังไม่มีทริปที่จบไปแล้ว'}</p>
                )}
              </div>
            </div>
          )}
          </div> {/* end trip section wrapper */}
          {/* 1.2 เลือกรถตู้ — show only on step 2 */}
          <div className={mobileTab === 'completed' || (currentStep === 1 && !(userBooking && isRequestingTransfer)) ? 'hidden' : 'block'}>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-in fade-in duration-200">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 mb-4 flex items-center gap-1.5 uppercase tracking-wide">
                <Armchair className="w-4 h-4 text-brand-700" />
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
                            ? 'border-brand-700 bg-purple-50/40 ring-1 ring-brand-700'
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
                          <span className="text-[9px] text-brand-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                            11 ที่นั่ง
                          </span>
                        </div>

                        {/* Selected Radio circle */}
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                          isVanSelected 
                            ? 'bg-brand-700 border-brand-700 text-white'
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
        <section className={`flex-col gap-6 2xl:col-span-5 ${(userBooking && !isRequestingTransfer) ? 'hidden 2xl:hidden' : (currentStep === 3 || isRequestingTransfer ? (mobileTab === 'explore' ? 'flex 2xl:flex' : 'hidden 2xl:hidden') : 'hidden 2xl:hidden')}`}>
          
          {selectedVan ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-1 flex flex-col justify-between">
              
              {/* Van Title Header */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center space-x-2">
                    {/* Small van icon */}
                    <div className="bg-purple-100 text-brand-700 p-2 rounded-xl">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                        <path d="M19 15h1V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6h1a2 2 0 0 0 4 0h10a2 2 0 0 0 4 0zM5 15a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm14 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                        รถตู้คันที่ {selectedVan.vanNumber} ({selectedVan.seats.filter(s => s.type === 'customer').length} ที่นั่งลูกค้า)
                      </h2>
                      <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>กรุณาเลือกที่นั่ง (เบาะ 1 - 10 เท่านั้น)</span>
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
                          return <BookingSeat key={seat.id} seat={seat} fitCell={seat.row === 4 && !!selectedVan?.seats.some(s => s.row === 4 && s.col === 1.5)} selected={selectedSeat?.id === seat.id} onClick={() => handleSeatClick(seat)} />;
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
                          return <BookingSeat key={seat.id} seat={seat} fitCell={seat.row === 4 && !!selectedVan?.seats.some(s => s.row === 4 && s.col === 1.5)} selected={selectedSeat?.id === seat.id} onClick={() => handleSeatClick(seat)} />;
                        })}
                      </div>

                      {/* ROW 3: Seats 7 (left), 6 (middle), 5 (right) */}
                      <div className="grid grid-cols-3 items-center justify-items-center">
                        {[1, 2, 3].map((colVal) => {
                          const seat = selectedVan.seats.find((s) => s.row === 3 && s.col === colVal);
                          if (!seat) return <div key={colVal} className="w-[58px] h-[64px]" />;
                          return <BookingSeat key={seat.id} seat={seat} fitCell={seat.row === 4 && !!selectedVan?.seats.some(s => s.row === 4 && s.col === 1.5)} selected={selectedSeat?.id === seat.id} onClick={() => handleSeatClick(seat)} />;
                        })}
                      </div>

                      {/* ROW 4: 10, optional extra seat, 9, 8 */}
                      <div className={`grid ${selectedVan.seats.some(s => s.row === 4 && s.col === 1.5) ? 'grid-cols-4 gap-x-2' : 'grid-cols-3'} items-center justify-items-center`}>
                        {(selectedVan.seats.some(s => s.row === 4 && s.col === 1.5) ? [1, 1.5, 2, 3] : [1, 2, 3]).map((colVal) => {
                          const seat = selectedVan.seats.find((s) => s.row === 4 && s.col === colVal);
                          if (!seat) return <div key={colVal} className="w-[58px] h-[64px]" />;
                          return <BookingSeat key={seat.id} seat={seat} fitCell={seat.row === 4 && !!selectedVan?.seats.some(s => s.row === 4 && s.col === 1.5)} selected={selectedSeat?.id === seat.id} onClick={() => handleSeatClick(seat)} />;
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
                <Info className="w-4.5 h-4.5 text-brand-700 shrink-0 mt-0.5" />
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
        <section className={`flex-col gap-6 2xl:col-span-4 ${(currentStep === 4 || currentStep === 5 || !!userBooking) ? (mobileTab === 'explore' ? 'flex 2xl:flex' : 'hidden 2xl:hidden') : 'hidden 2xl:hidden'}`}>
          
          {/* Active Digital Ticket display if user has a booking */}
          {lineUser && userBooking && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide border-b border-slate-100 pb-3">
                <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span>บัตรโดยสารการจอง</span>
              </h2>

                            <DigitalTicket ticketRef={ticketRef as React.RefObject<HTMLDivElement>} booking={userBooking as any} htmlId="main-ticket" />
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
                          className="flex-1 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-brand-700 text-[11px] font-bold border border-purple-200 transition duration-200 flex items-center justify-center gap-1"
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
                  <span className="text-lg font-black text-brand-700 font-mono">{userBooking.seatLabel}</span>
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
                <User className="w-4.5 h-4.5 text-brand-700" />
                <span>ข้อมูลผู้จอง</span>
              </h2>

              {/* Selected seat & Trip cost indicators */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">เบาะที่เลือก</span>
                  <div className="bg-purple-50 border border-purple-100 rounded-xl py-3 text-center text-slate-700 font-extrabold text-lg tracking-wide h-[54px] flex items-center justify-center">
                    {selectedSeat ? (
                      <span className="text-brand-700 font-extrabold font-mono text-base">
                        เบาะ {selectedSeat.label}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-bold text-base">-</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 block mb-1">ราคาทริป</span>
                  <div className="bg-purple-50/50 border border-brand-700/10 rounded-xl py-3 text-center text-brand-700 font-extrabold tracking-wide h-[54px] flex items-center justify-center">
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-700 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200 disabled:opacity-50"
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-700 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200 disabled:opacity-50"
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-brand-700 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200 disabled:opacity-50"
                  />
                </div>



                {/* Confirm reservation button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedSeat || !lineUser}
                  className="w-full bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold py-2.5 rounded-xl transition duration-200 shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed theme-action"
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
              <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-700 border border-purple-100">
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
  );
}


