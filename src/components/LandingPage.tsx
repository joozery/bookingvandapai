'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatThaiDate } from '@/lib/dateFormat';
import { MESSENGER_URL, tripMessengerUrl } from '@/lib/contact';
import { 
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
          durationText,
          period,
          departureDate: formatThaiDate(t.departureDate),
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
    <div className="flex-1 w-full bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      
      {/* Sticky Premium Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center">
              <img src="/logo/logov2.png" alt="DAPAIDERNPAI Logo" className="w-12 h-12 object-contain" />
            </div>
            <div>
              <span className="text-[#4c1d95] font-black text-base sm:text-xl tracking-tight leading-none block">ด่าไป เดินไป</span>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">DAPAI DERNPAI VAN BOOKING</span>
            </div>
          </div>

          {/* Center Links (Hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-500">
            <a href="#" className="text-[#4c1d95] font-black hover:text-purple-800 transition">หน้าแรก</a>
            <a href="#destinations" className="hover:text-purple-800 transition">ทริปที่เปิดอยู่</a>
            <a href="#completed-trips" className="hover:text-purple-800 transition">ทริปที่ปิดไปแล้ว</a>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={MESSENGER_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[#4c1d95] text-slate-600 transition px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-100/80"
            >
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">ติดต่อแอดมิน</span>
            </a>
            <button
              onClick={onLoginClick}
              className="bg-[#06C755] hover:bg-[#05b34c] text-white py-2 px-4 rounded-xl font-black text-xs transition-all duration-300 shadow-md shadow-[#06C755]/10 flex items-center gap-1.5 active:scale-97 group relative overflow-hidden"
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

      {/* Trip showcase Section - Redesigned to Premium Card Slider */}
      {[false, true].map(completed => {
        const groupTrips = destinations.filter(dest => dest.completed === completed);
        const scrollRef = completed ? completedTripsScrollRef : tripsScrollRef;
        return (
      <section key={String(completed)} id={completed ? 'completed-trips' : 'destinations'} className="py-3 sm:py-2 bg-white border-b border-slate-100 overflow-hidden scroll-mt-20">
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
                  className="w-[82vw] max-w-[340px] sm:w-[360px] md:w-[380px] shrink-0 snap-center sm:snap-start bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgb(76,29,149,0.07)] transition-all duration-350 hover:-translate-y-1.5 flex flex-col group"
                >
                  {/* Image top with floating seats status pill (No rating star! - aspect ratio reduced to modern 16:10 landscape) */}
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
                  </div>

                  {/* Body details */}
                  <div>
                  <div data-trip-card-content={dest.id} className="p-3 flex flex-col justify-between space-y-2">
                    <div className="space-y-1.5">
                      {/* Trip Title */}
                      <h3 className="text-sm sm:text-base font-black text-slate-800 leading-snug group-hover:text-[#4c1d95] transition duration-200 line-clamp-1">
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
                            <p className="flex items-start gap-2"><Bus aria-hidden="true" className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-600/70" /><span>วันที่ออกเดินทาง {dest.departureDate}</span></p>
                            <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-600/70" /><span>สถานที่ขึ้นรถ: {dest.pickupPoint}</span></p>
                            <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 shrink-0 text-purple-600/70" /><span>เวลาออกเดินทาง {dest.departureTime ? `${dest.departureTime} น.` : 'ยังไม่ระบุ'}</span></p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer: Price on the left, interactive book button on the right */}
                    {!completed && <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs font-bold">
                      <div>
                        <p className="text-base sm:text-lg font-black text-[#4c1d95] mt-1">
                          ฿{dest.price} <span className="text-[10px] text-slate-400 font-semibold">/ ท่าน</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <a
                          href={tripMessengerUrl(dest.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-purple-50 text-[#4c1d95] group-hover:bg-[#4c1d95] group-hover:text-white transition-all duration-300 min-h-10 sm:min-h-0 py-2 px-2 sm:px-4 rounded-xl font-black text-[11px] sm:text-xxs flex items-center gap-1 border border-purple-100 group-hover:border-transparent shadow-sm active:scale-95"
                        >
                          <span>ติดต่อแอดมินเพื่อจอง</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                      </div>
                    </div>}
                  </div>
                  </div>
                </div>
              )))}
            </div>

            {/* Left Floating Arrow Button (Reveals on Hover, Hidden on Mobile Touch) */}
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: -390, behavior: 'smooth' })}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-[#4c1d95] border border-slate-200/80 shadow-lg hidden md:flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none opacity-0 group-hover/carousel:opacity-100"
              aria-label="เลื่อนซ้าย"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* Right Floating Arrow Button (Reveals on Hover, Hidden on Mobile Touch) */}
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: 390, behavior: 'smooth' })}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-[#4c1d95] border border-slate-200/80 shadow-lg hidden md:flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none opacity-0 group-hover/carousel:opacity-100"
              aria-label="เลื่อนขวา"
            >
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>

          </div>


        </div>
      </section>
        );
      })}







      {/* Action / Invite Floating Card CTA at the bottom - Compact, ultra-professional and centered */}
      <section className="py-12 sm:py-16 bg-slate-50 border-t border-slate-100 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#4c1d95] via-[#3b137a] to-indigo-950 text-white py-10 px-6 sm:p-12 overflow-hidden shadow-2xl border border-purple-800/10 text-center space-y-6">
            
            {/* Interactive Glow Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,199,85,0.1),transparent_45%)] pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
                พร้อมร่วมเดินทางเก็บความทรงจำดีๆ กับเราหรือยัง?
              </h2>
              
              <p className="text-xxs sm:text-xs text-purple-200/80 max-w-md mx-auto leading-relaxed">
                ติดต่อแอดมินของเราเพื่อขอลิ้งก์เข้าสู่ระบบจองที่นั่งรถตู้คันโปรดของคุณง่ายๆ ผ่านระบบออนไลน์ เพื่อไม่พลาดทริปเดินป่าสุดพิเศษนี้
              </p>
            </div>

            <div className="relative z-10 pt-1 flex justify-center">
              <a
                href={MESSENGER_URL}
                target="_blank"
                rel="noreferrer"
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-8 rounded-xl font-black text-xxs sm:text-xs transition-all duration-300 shadow-md flex items-center gap-2 active:scale-97 group relative overflow-hidden"
              >
                <MessageSquare className="w-4 h-4 text-white" />
                <span>ติดต่อแอดมินเพื่อขอลิ้งก์จองเลย</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>

            <div className="relative z-10 flex justify-center items-center gap-5 text-purple-300/80 font-bold text-[9px] sm:text-[10px]">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ไม่มีค่าธรรมเนียมแอบแฝง
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ยกเลิกออนไลน์ได้ง่ายดาย
              </span>
            </div>

          </div>

        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs sm:text-sm font-bold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1 Brand Info */}
          <div className="space-y-4 col-span-1 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white p-1 border border-slate-700 flex items-center justify-center shrink-0">
                <img src="/logo/logov2.png" alt="DAPAIDERNPAI Logo" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-white font-extrabold text-base sm:text-lg">ด่าไป เดินไป</span>
            </div>
            <p className="text-xxs sm:text-xs text-slate-500 max-w-sm leading-relaxed font-bold">
              {settings.footer_description}
            </p>
          </div>

          {/* Col 2 Links */}
          <div className="space-y-3">
            <h5 className="text-white font-extrabold text-xs tracking-wider uppercase">การช่วยเหลือ</h5>
            <ul className="space-y-2 text-xxs sm:text-xs font-bold text-slate-500">
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
            <ul className="space-y-2 text-xxs sm:text-xs font-bold text-slate-500">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-800/80 text-center text-xxs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4 font-bold">
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
