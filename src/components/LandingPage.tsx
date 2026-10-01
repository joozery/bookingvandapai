'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import TripRatingSummary from '@/components/TripRatingSummary';
import TripCalendar from '@/components/TripCalendar';
import BookingLeaderboard from '@/components/BookingLeaderboard';
import { defaultHomepageSettings } from '@/lib/homepageSettings';
import { validShareImage } from '@/lib/shareSettings';
import { formatThaiDate } from '@/lib/dateFormat';
import { parseCalendarDay } from '@/lib/tripCalendar';
import { MESSENGER_URL, tripMessengerUrl } from '@/lib/contact';
import { 
  User,
  Compass, 
  ArrowRight, 
  Star, 
  CheckCircle2, 
  MapPin, 
  Calendar,
  Bus,
  Clock,
  ChevronLeft,
  ChevronRight,
  Phone, 
  Mail, 
  Sparkles, 
  MessageSquare,
  Flame,
  Mountain,
  Leaf
} from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  trips?: any[];
  isLoggedIn?: boolean;
}

export default function LandingPage({ onLoginClick, trips = [], isLoggedIn = false }: LandingPageProps) {
  const [settings, setSettings] = useState({
    ...defaultHomepageSettings,
    footer_description: 'กลุ่มเดินป่าและเดินทางสายผจญภัย มุ่งสร้างสรรค์ทริปท่องเที่ยวธรรมชาติที่คุ้มค่า สนุกสนาน มิตรภาพที่ยั่งยืน และปลอดภัยทุกก้าวเดิน',
    contact_phone: '+66 89 123 4567',
    contact_email: 'support@dapaidernpai.com',
    contact_location: 'เชียงใหม่ / กรุงเทพฯ, ประเทศไทย',
    copyright_year: new Date().getFullYear().toString(),
    line_url: 'https://line.me'
  });
  const tripsScrollRef = useRef<HTMLDivElement>(null);
  const completedTripsScrollRef = useRef<HTMLDivElement>(null);
  const [imageExtraHeights, setImageExtraHeights] = useState<Record<string, number>>({});

  useEffect(() => {
    const contents = [tripsScrollRef.current, completedTripsScrollRef.current]
      .flatMap(row => Array.from(row?.querySelectorAll<HTMLElement>('[data-trip-card-content]') || []));
    const measure = () => {
      const maxHeight = Math.max(0, ...contents.map(content => content.offsetHeight));
      setImageExtraHeights(Object.fromEntries(contents.map(content => [
        content.dataset.tripCardContent!, maxHeight - content.offsetHeight,
      ])));
    };
    const observer = new ResizeObserver(measure);
    contents.forEach(content => observer.observe(content));
    measure();
    return () => observer.disconnect();
  }, [trips]);

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => {
      if (data.success && data.settings) {
        setSettings(prev => ({...prev, ...data.settings}));
      }
    }).catch(console.error);
  }, []);

  const destinations = trips && trips.length > 0
    ? trips.map(t => {
        const parts = (t.tripPeriod || '').split('||');
        const nights = t.durationDays - 1;
        const durationText = parts.length > 1 ? parts[0] : (nights > 0 ? `${t.durationDays} วัน ${nights} คืน` : 'ไปเช้าเย็นกลับ (1 วัน)');
        const period = parts.length > 1 ? parts[1] : parts[0];
        return {
          id: t.id,
          completed: t.status === 'completed',
          title: t.name,
          guideName: t.guideName?.trim() || 'ยังไม่ระบุ',
          durationText,
          period,
          departureDate: formatThaiDate(t.departureDate),
          departureDay: parseCalendarDay(t.departureDate || '') ?? Number.MAX_SAFE_INTEGER,
          pickupPoint: t.pickupPoint || 'ยังไม่ระบุ',
          departureTime: t.departureTime || '',
          price: Number(t.cost || 0).toLocaleString('th-TH'),
          availableSeats: Number(t.availableSeats ?? 0),
          seatsText: Number(t.availableSeats ?? 0) > 0 ? `ว่าง ${t.availableSeats} ที่` : 'เต็ม',
          img: t.image || "/logo/scenic_van_trip.png",

        };
      })
    : [];

  return (
    <div className="flex-1 w-full bg-canvas text-slate-800 flex flex-col font-sans" style={{
      '--homepage-banner': settings.banner_image && validShareImage(settings.banner_image) ? `url(${JSON.stringify(settings.banner_image)})` : undefined,
      '--homepage-background': settings.background_image && validShareImage(settings.background_image) ? `url(${JSON.stringify(settings.background_image)})` : undefined,
    } as React.CSSProperties}>
      
      {/* Sticky Premium Navbar */}
      <header className="theme-chrome sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center">
              <img src="/logo/logov2.png" alt="DAPAIDERNPAI Logo" className="w-12 h-12 object-contain" />
            </div>
            <div>
              <span className="text-brand-700 font-black text-base sm:text-xl tracking-tight leading-none block">ด่าไป เดินไป</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">DAPAI DERNPAI VAN BOOKING</span>
            </div>
          </div>

          {/* Center Links (Hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-500">
            <a href="#" className="text-brand-700 font-black hover:text-purple-800 transition">หน้าแรก</a>
            <a href="#destinations" className="hover:text-purple-800 transition">ทริปที่เปิดอยู่</a>
            <a href="#trip-calendar" className="hover:text-purple-800 transition">ปฏิทินทริป</a>
            <a href="#completed-trips" className="hover:text-purple-800 transition">ทริปที่ปิดไปแล้ว</a>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={MESSENGER_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-brand-700 text-slate-600 transition px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-100/80"
            >
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">ติดต่อแอดมิน</span>
            </a>
            <button
              onClick={onLoginClick}
              className="bg-line hover:bg-line-hover text-white py-2 px-4 rounded-xl font-black text-xs transition-all duration-300 shadow-md shadow-line/10 flex items-center gap-1.5 active:scale-97 group relative overflow-hidden"
            >
              {/* shine overlay */}
              <span className="absolute inset-0 w-full h-full bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
                <path d="M24 10.3c0-4.7-4.8-8.5-10.7-8.5S2.7 5.6 2.7 10.3c0 4.2 3.8 7.7 8.9 8.4.3.1.8.2.9.5.1.2 0 .6-.1.8l-.4 2.6c0 .3-.2 1.1 1 0l7.2-7.2h.1c2.7-1.1 3.9-3.1 3.9-5.1z" />
              </svg>
              <span>{isLoggedIn ? 'หน้าหลัก / ตั๋วของฉัน' : 'เข้าสู่ระบบด้วย LINE'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Action / Invite Floating Card CTA at the bottom - Compact, ultra-professional and centered */}
      <section className="theme-hero relative overflow-hidden border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="relative min-h-[440px] sm:min-h-[420px] flex flex-col justify-center py-10 sm:py-14 text-slate-900 space-y-6">
            
            {/* Interactive Glow Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-blue-400),transparent_45%)] opacity-20 pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-xl space-y-4">
              <h2 className="theme-hero-title text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight whitespace-pre-wrap break-words">
                {settings.cta_title}
              </h2>
              
              <p className="text-sm sm:text-base text-slate-700 max-w-md leading-relaxed whitespace-pre-wrap break-words">
                {settings.cta_description}
              </p>
            </div>

            <div className="relative z-10 pt-1 flex justify-start">
              <a
                href={MESSENGER_URL}
                target="_blank"
                rel="noreferrer"
                className="relative overflow-hidden py-3.5 px-7 rounded-2xl font-black text-xs sm:text-sm text-white shadow-xl shadow-blue-600/30 flex items-center gap-2.5 active:scale-95 transition-transform group select-none border border-white/25"
              >
                {/* Flowing Color Fill Inside Button (สีวิ่งภายในปุ่ม) */}
                <div 
                  className="absolute -inset-[150%] animate-[spin_5s_linear_infinite] group-hover:animate-[spin_2.5s_linear_infinite] opacity-100 pointer-events-none"
                  style={{
                    background: 'conic-gradient(from 0deg, #2563eb, #7c3aed, #f59e0b, #06b6d4, #2563eb)',
                  }}
                />
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />

                <MessageSquare className="w-4.5 h-4.5 text-white relative z-10 drop-shadow" />
                <span className="relative z-10 drop-shadow">ติดต่อแอดมินเพื่อขอลิ้งก์จองเลย</span>
                <ArrowRight className="w-4 h-4 text-white relative z-10 group-hover:translate-x-1 transition-transform drop-shadow" />
              </a>
            </div>












          </div>

        </div>
      </section>

      <div className="theme-page">
      {/* Trip showcase Section - Redesigned to Premium Card Slider */}
      {[false, true].map(completed => {
        const groupTrips = destinations.filter(dest => dest.completed === completed);
        if (!completed) {
          groupTrips.sort((a, b) => a.departureDay - b.departureDay || a.departureTime.localeCompare(b.departureTime));
        }
        const scrollRef = completed ? completedTripsScrollRef : tripsScrollRef;
        return (
      <React.Fragment key={String(completed)}>
      <section id={completed ? 'completed-trips' : 'destinations'} className="py-3 sm:py-2 bg-white/40 border-b border-slate-100 overflow-hidden scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          <div className="flex flex-row-reverse items-center justify-end gap-2 mb-2">
            <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{groupTrips.length} ทริป</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {completed ? 'ทริปที่ปิดไปแล้ว' : 'ทริปที่เปิดอยู่'}
            </h2>
          </div>

          {/* Cards Carousel Container with group hover states */}
          <div className="relative group/carousel">
            
            {/* Scrollable card deck with snap alignment & hidden scrollbar */}
            <div 
              ref={scrollRef}
              className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {groupTrips.length === 0 ? (
                <div className="w-full shrink-0 flex flex-col items-center justify-center text-center py-6 sm:py-16 px-4 bg-slate-50/50 border border-slate-100 rounded-3xl mx-auto max-w-xl">
                  <Compass className="w-7 h-7 sm:w-12 sm:h-12 text-slate-300 mb-2 sm:mb-4" />
                  <h3 className="text-sm sm:text-lg font-black text-slate-700">{completed ? 'ยังไม่มีทริปที่ปิดไปแล้ว' : 'ยังไม่มีทริปเปิดให้จองในขณะนี้'}</h3>
                  {!completed && <p className="text-sm text-slate-400 mt-2">โปรดติดตามอัปเดตทริปใหม่ๆ หรือติดต่อแอดมินเพื่อสอบถามข้อมูลเพิ่มเติม</p>}
                </div>
              ) : (
                groupTrips.map((dest) => (
                  <div 
                  key={dest.id}
                  className="w-[82vw] max-w-[340px] sm:w-[360px] md:w-[380px] shrink-0 snap-center sm:snap-start relative p-[5px] rounded-2xl sm:rounded-3xl overflow-hidden group transition-all duration-300 hover:-translate-y-1.5 shadow-[0_12px_40px_rgba(236,72,153,0.25)] hover:shadow-[0_20px_50px_rgba(236,72,153,0.45)] flex flex-col"
                >
                  {/* Animated Thick Running Light Gradient Border (กรอบไฟวิ่งวนขนาดใหญ่) */}
                  <div 
                    className="absolute -inset-[150%] animate-[spin_4s_linear_infinite] group-hover:animate-[spin_2s_linear_infinite] opacity-100 transition-opacity pointer-events-none"
                    style={{
                      background: 'conic-gradient(from 0deg, #ff007f, #a855f7, #00f3ff, #ff007f)',
                    }}
                  />

                  {/* Outer Neon Glow Aura around card frame */}
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-cyan-400/40 rounded-2xl sm:rounded-3xl blur-lg opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  {/* Inner Card Content */}
                  <div className="relative w-full h-full bg-white rounded-[11px] sm:rounded-[19px] overflow-hidden flex flex-col theme-card">

                  {/* Image with floating trip status */}
                  <div className="relative overflow-hidden bg-slate-50 shrink-0">
                    <div aria-hidden="true" className="h-28 sm:h-[clamp(112px,14vh,160px)]" />
                    <div aria-hidden="true" style={{ height: imageExtraHeights[dest.id] || 0 }} />
                    <img 
                      src={dest.img} 
                      alt={dest.title} 
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    
                    {/* Floating Status Pill on top-left of the image */}
                    <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10">
                      {completed ? (
                        <span className="inline-flex items-center bg-slate-700/90 text-white text-[10px] font-black py-1 px-2.5 rounded-full">จบแล้ว</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 ${dest.availableSeats > 0 ? 'bg-emerald-600' : 'bg-red-600'} text-white text-[10px] font-black py-1 px-2.5 rounded-full shadow-md border border-white/10`}>
                          <span className="w-1.5 h-1.5 bg-white rounded-full shrink-0" />
                          <span>{dest.seatsText}</span>
                        </span>
                      )}
                    </div>
                    {completed && <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10"><TripRatingSummary key={dest.id} tripId={dest.id} /></div>}
                  </div>

                  {/* Body details */}
                  <div>
                  <div data-trip-card-content={dest.id} className="p-3 flex flex-col justify-between space-y-2">
                    <div className="space-y-1.5">
                      {/* Trip Title */}
                      <h3 className="text-sm sm:text-base font-black text-slate-800 leading-snug group-hover:text-brand-700 transition duration-200 line-clamp-1">
                        {dest.title}
                      </h3>
                      
                      <div className="space-y-1 text-[11px] sm:text-xs font-semibold text-slate-500">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-3.5 h-3.5 text-purple-600/70 shrink-0 mt-0.5" />
                          <span>{dest.durationText}{!completed && dest.period && <span className="font-normal ml-1">({dest.period})</span>}</span>
                        </div>
                        {completed ? (
                          <p>{dest.period || dest.departureDate}</p>
                        ) : (
                          <div className="space-y-1">
                            <p className="flex items-start gap-2"><User aria-hidden="true" className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-600/70" /><span className="min-w-0 break-words">สตาฟประจำทริป: {dest.guideName}</span></p>
                            <p className="flex items-start gap-2"><Bus aria-hidden="true" className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-600/70" /><span>วันที่ออกเดินทาง {dest.departureDate}</span></p>
                            <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-600/70" /><span>สถานที่ขึ้นรถ: {dest.pickupPoint}</span></p>
                            <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 shrink-0 text-purple-600/70" /><span>เวลาออกเดินทาง {dest.departureTime ? `${dest.departureTime} น.` : 'ยังไม่ระบุ'}</span></p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer: Price on the left, interactive book button on the right */}
                    {completed && (
                      <Link 
                        href={`/trips/${encodeURIComponent(dest.id)}/reviews`} 
                        className="relative overflow-hidden flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs sm:text-sm font-black text-white shadow-md active:scale-95 transition-transform group border border-white/20"
                      >
                        {/* Flowing Color Fill Inside Button (สีวิ่งภายในปุ่ม) */}
                        <div 
                          className="absolute -inset-[150%] animate-[spin_5s_linear_infinite] group-hover:animate-[spin_2.5s_linear_infinite] opacity-100 pointer-events-none"
                          style={{
                            background: 'conic-gradient(from 0deg, #6366f1, #d946ef, #f59e0b, #14b8a6, #6366f1)',
                          }}
                        />
                        <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px]" />

                        <Star className="h-4 w-4 text-yellow-300 fill-yellow-300 relative z-10 drop-shadow" />
                        <span className="relative z-10 drop-shadow">ดูรีวิวและคะแนนเฉลี่ย</span>
                        <ArrowRight className="h-4 w-4 text-white relative z-10 group-hover:translate-x-1 transition-transform drop-shadow" />
                      </Link>
                    )}
                    {!completed && <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs font-bold">
                      <div>
                        <p className="text-base sm:text-lg font-black text-brand-700 mt-1">
                          ฿{dest.price} <span className="text-[10px] text-slate-400 font-semibold">/ ท่าน</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <a
                          href={tripMessengerUrl(dest.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative p-[2px] rounded-xl overflow-hidden group/btn inline-flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md hover:shadow-purple-500/40 shrink-0"
                        >
                          {/* Animated Running Light Border for Button (ไฟวิ่งวนรอบปุ่ม) */}
                          <div 
                            className="absolute -inset-[150%] animate-[spin_3s_linear_infinite] group-hover/btn:animate-[spin_1.5s_linear_infinite] opacity-100 pointer-events-none"
                            style={{
                              background: 'conic-gradient(from 0deg, #ff007f, #a855f7, #00f3ff, #ff007f)',
                            }}
                          />

                          {/* Outer Neon Glow Aura */}
                          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/50 via-purple-500/50 to-cyan-400/50 rounded-xl blur-xs opacity-80 group-hover/btn:opacity-100 transition-opacity pointer-events-none" />

                          {/* Button Content */}
                          <div className="relative z-10 bg-gradient-to-r from-brand-700 via-purple-700 to-indigo-700 text-white py-2 px-2.5 sm:px-4 rounded-[10px] font-black text-[11px] sm:text-xxs flex items-center gap-1 min-h-10 sm:min-h-0">

                          <span>ติดต่อแอดมินเพื่อจอง</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </a>
                      </div>
                    </div>}
                  </div>
                  </div>
                </div>
                  </div>
              )))}
            </div>

            {/* Left Floating Arrow Button (Reveals on Hover, Hidden on Mobile Touch) */}
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: -390, behavior: 'smooth' })}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-brand-700 border border-slate-200/80 shadow-lg hidden md:flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none opacity-0 group-hover/carousel:opacity-100"
              aria-label="เลื่อนซ้าย"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* Right Floating Arrow Button (Reveals on Hover, Hidden on Mobile Touch) */}
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: 390, behavior: 'smooth' })}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-brand-700 border border-slate-200/80 shadow-lg hidden md:flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none opacity-0 group-hover/carousel:opacity-100"
              aria-label="เลื่อนขวา"
            >
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>

          </div>


        </div>
      </section>
      {completed && <TripCalendar trips={trips} />}
      </React.Fragment>
        );
      })}







      <BookingLeaderboard title={!settings.leaderboard_title || settings.leaderboard_title === 'สถิติเวทคนปากดี' ? 'สถิติคนมีปาก' : settings.leaderboard_title} />

      </div>
      {/* Footer Section */}
      <footer className="theme-deep bg-slate-900 text-purple-200 py-12 border-t border-slate-800 text-xs sm:text-sm font-bold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1 Brand Info */}
          <div className="space-y-4 col-span-1 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="shrink-0 flex items-center justify-center">
                <img src="/logo/logov2.png" alt="DAPAIDERNPAI Logo" className="w-12 h-12 object-contain" />
              </div>
              <div>
                <span className="text-white font-extrabold text-base sm:text-lg block">ด่าไป เดินไป</span>
                <span className="text-[10px] text-purple-300 font-bold block mt-0.5">DAPAI DERNPAI VAN BOOKING</span>
              </div>
            </div>
            <p className="text-xxs sm:text-xs text-purple-200 max-w-sm leading-relaxed font-bold whitespace-pre-wrap break-words">
              {settings.footer_description}
            </p>
          </div>

          {/* Col 2 Links */}
          <div className="space-y-3">
            <h5 className="text-white font-extrabold text-xs tracking-wider uppercase">การช่วยเหลือ</h5>
            <ul className="space-y-2 text-xxs sm:text-xs font-bold text-purple-200">
              <li>
                <a href={MESSENGER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                  ติดต่อแอดมิน / Messenger
                </a>
              </li>
              <li>
                <button onClick={onLoginClick} className="hover:text-white transition">
                  เข้าสู่ระบบ / สมัครสมาชิก
                </button>
              </li>
              <li>
                <a href="/admin" className="hover:text-white transition">
                  ระบบหลังบ้านสำหรับแอดมิน
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3 Contact */}
          <div className="space-y-3">
            <h5 className="text-white font-extrabold text-xs tracking-wider uppercase">ช่องทางติดต่อ</h5>
            <ul className="space-y-2 text-xxs sm:text-xs font-bold text-purple-200">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-purple-400" />
                <span>{settings.contact_phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                <span>{settings.contact_email}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-purple-400" />
                <span>{settings.contact_location}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-800/80 text-center text-xxs text-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4 font-bold">
          <p>© {settings.copyright_year} ด่าไป เดินไป (DAPAI DERNPAI) All Rights Reserved.</p>
          <div className="flex gap-4">
            <a href="/privacy-policy" className="hover:underline">นโยบายความเป็นส่วนตัว</a>
            <a href="/terms-of-service" className="hover:underline">เงื่อนไขการให้บริการ</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
