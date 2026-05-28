'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  ArrowRight, 
  Star, 
  CheckCircle2, 
  MapPin, 
  Calendar,
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
  showHelpCenter: () => void;
  trips?: any[];
  isLoggedIn?: boolean;
}

export default function LandingPage({ onLoginClick, showHelpCenter, trips = [], isLoggedIn = false }: LandingPageProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const tripsScrollRef = useRef<HTMLDivElement>(null);

  const scrollTripsLeft = () => {
    if (tripsScrollRef.current) {
      tripsScrollRef.current.scrollBy({ left: -390, behavior: 'smooth' });
    }
  };

  const scrollTripsRight = () => {
    if (tripsScrollRef.current) {
      tripsScrollRef.current.scrollBy({ left: 390, behavior: 'smooth' });
    }
  };

  const slides = [
    {
      img: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=1600&auto=format&fit=crop&q=80",
      tag: "THE NEXT GEN TRAVEL EXPERIENCE",
      title: "ก้าวสู่การเดินทางที่ง่ายดาย",
      subtitle: "ท่องเที่ยวธรรมชาติและเดินป่าระดับพรีเมียมไปกับรถตู้ “ด่าไป เดินไป”"
    },
    {
      img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&auto=format&fit=crop&q=80",
      tag: "100% REAL-TIME SEATING",
      title: "เลือกที่นั่งโปรดแบบเรียลไทม์",
      subtitle: "จองตำแหน่งที่นั่งที่คุณถูกใจ เช็คเบาะว่างบนแผนผังรถตู้ได้สดๆ ทันที"
    },
    {
      img: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1600&auto=format&fit=crop&q=80",
      tag: "AUTOMATIC INSURANCE",
      title: "ดูแลความปลอดภัยทุกทริป",
      subtitle: "ลงทะเบียนประกันภัยอุบัติเหตุส่วนบุคคลให้ผู้เดินทางโดยอัตโนมัติ"
    },
    {
      img: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1600&auto=format&fit=crop&q=80",
      tag: "ADVENTURE & COMMUNITY",
      title: "มิตรภาพและการผจญภัย",
      subtitle: "ร่วมเดินทางไปกับเพื่อนๆ คอเดินป่าที่มีใจรักธรรมชาติในบรรยากาศอบอุ่น"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const destinations = trips && trips.length > 0
    ? trips.map((t, idx) => {
        let rating = 4.9;
        let reviews = "64 รีวิว";

        if (idx === 0) {
          rating = 4.9;
          reviews = "128 รีวิว";
        } else if (idx === 1) {
          rating = 4.8;
          reviews = "94 รีวิว";
        } else if (idx === 2) {
          rating = 4.9;
          reviews = "112 รีวิว";
        }

        return {
          title: t.name,
          pickupPoint: t.pickupPoint || "ปั๊ม ปตท. วิภาวดี",
          departureDate: t.departureDate || "15 ธ.ค. 67",
          departureTime: t.departureTime || "06:00",
          price: String(t.cost),
          availableSeats: t.availableSeats !== undefined ? Number(t.availableSeats) : undefined,
          seatsText: t.availableSeats !== undefined ? `เหลือ ${t.availableSeats} ที่นั่ง` : "มีที่นั่งว่าง",
          img: t.image || "/logo/scenic_van_trip.png",
          rating: rating,
          reviews: reviews
        };
      })
    : [
        {
          title: "ทริปแม่ฮ่องสอน - ปาย 3 วัน 2 คืน",
          pickupPoint: "ปั๊ม ปตท. วิภาวดี",
          departureDate: "15 ธ.ค. 67",
          departureTime: "06:00",
          price: "2,500",
          availableSeats: 4,
          seatsText: "เหลือ 4 ที่นั่ง",
          img: "/logo/scenic_van_trip.png",
          rating: 4.9,
          reviews: "128 รีวิว"
        },
        {
          title: "ทริปเชียงดาว - อ่างขาง 2 วัน 1 คืน",
          pickupPoint: "ปั๊ม ปตท. วิภาวดี",
          departureDate: "22 ธ.ค. 67",
          departureTime: "06:00",
          price: "1,800",
          availableSeats: 2,
          seatsText: "เหลือ 2 ที่นั่ง",
          img: "/logo/scenic_van_trip.png",
          rating: 4.8,
          reviews: "94 รีวิว"
        },
        {
          title: "ทริปสะปัน - บ่อเกลือ - น่าน",
          pickupPoint: "ปั๊ม ปตท. วิภาวดี",
          departureDate: "29 ธ.ค. 67",
          departureTime: "06:00",
          price: "2,200",
          availableSeats: 5,
          seatsText: "เหลือ 5 ที่นั่ง",
          img: "/logo/scenic_van_trip.png",
          rating: 4.9,
          reviews: "112 รีวิว"
        }
      ];

  return (
    <div className="flex-1 w-full bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      
      {/* Sticky Premium Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
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
            <a href="#destinations" className="hover:text-purple-800 transition">ทริปยอดฮิต</a>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={showHelpCenter}
              className="flex items-center gap-1.5 hover:text-[#4c1d95] text-slate-600 transition px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-100/80"
            >
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">ติดต่อแอดมิน</span>
            </button>
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

      {/* Dynamic / Glowing Banner Badge */}
      <div className="w-full bg-gradient-to-r from-[#4c1d95] via-purple-700 to-indigo-800 text-white text-center py-2.5 px-4 text-[10px] sm:text-xs font-bold tracking-wider flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 shadow-inner">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300 animate-pulse shrink-0" />
          <span>ระบบจองที่นั่งรถตู้เวอร์ชันใหม่: ซิงค์แผนผังที่นั่งเรียลไทม์ 100% พร้อมประกันเดินทางอัตโนมัติ!</span>
        </div>
        <button 
          onClick={showHelpCenter} 
          className="underline hover:text-yellow-200 transition font-black sm:ml-2 inline-block mt-1 sm:mt-0 text-[11px] sm:text-xs"
        >
          ติดต่อแอดมินเพื่อขอลิ้งก์จอง →
        </button>
      </div>

      {/* Hero Section - Immersive Full-Screen Background Slider */}
      <section className="relative h-[85vh] sm:h-[75vh] min-h-[500px] sm:min-h-[580px] max-h-[750px] w-full overflow-hidden flex items-center justify-center bg-slate-950">
        
        {/* Background Image Slider with Crossfade */}
        <div className="absolute inset-0 z-0">
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-all duration-[1200ms] ease-in-out ${
                currentSlide === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              }`}
            >
              <img
                src={slide.img}
                alt={slide.tag}
                className="w-full h-full object-cover select-none"
              />
            </div>
          ))}
        </div>

        {/* Cinematic Vignette Overlay - Extremely soft and transparent to ensure maximum background image vibrancy */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none" 
          style={{
            backgroundImage: 'linear-gradient(to bottom, rgba(3, 7, 18, 0.6) 0%, rgba(3, 7, 18, 0.3) 40%, rgba(3, 7, 18, 0) 90%)'
          }}
        />
        
        {/* Removed Bottom Fade overlay per user request */}        {/* Foreground Content Card - Glassmorphism & Minimal Text */}
        <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 duration-1000 mt-[-40px] sm:mt-0">
          
          {/* Active slide's floating tag / badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-full py-1.5 px-4 text-[10px] sm:text-xs font-black text-white shadow-xl backdrop-blur-md transition-all duration-500">
            <Compass className="w-3.5 h-3.5 text-purple-400 animate-spin-slow shrink-0" />
            <span className="tracking-widest uppercase">{slides[currentSlide].tag}</span>
          </div>

          {/* Headline - Big & Elegant yet minimal */}
          <div className="space-y-3 sm:space-y-4 max-w-3xl">
            <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.25] sm:leading-[1.15] drop-shadow-md px-2 sm:px-0">
              ก่อนกรอกข้อมูล อ่านให้มันดีก่อนนะอีห่าจิก <br />
              <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-violet-300 bg-clip-text text-transparent drop-shadow-sm inline-block mt-1 sm:mt-0">กูขี้เกียจแก้</span>
            </h1>
            <p className="text-xs sm:text-base md:text-lg text-slate-200/90 leading-relaxed max-w-2xl mx-auto font-medium tracking-wide drop-shadow-sm px-4 sm:px-0 mt-2 sm:mt-4">
              {slides[currentSlide].subtitle}
            </p>
          </div>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto pt-4 sm:pt-2 pb-8 px-4 sm:px-0">
            <button
              onClick={onLoginClick}
              className="w-full sm:w-auto bg-[#06C755] hover:bg-[#05b34c] text-white py-3.5 sm:py-4 px-8 rounded-2xl font-black text-[13px] sm:text-base transition-all duration-300 shadow-lg shadow-[#06C755]/25 flex items-center justify-center gap-2.5 sm:gap-3 active:scale-97 group overflow-hidden relative border border-emerald-600/20"
            >
              {/* shine overlay */}
              <span className="absolute inset-0 w-full h-full bg-white/15 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
              <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-current shrink-0">
                <path d="M24 10.3c0-4.7-4.8-8.5-10.7-8.5S2.7 5.6 2.7 10.3c0 4.2 3.8 7.7 8.9 8.4.3.1.8.2.9.5.1.2 0 .6-.1.8l-.4 2.6c0 .3-.2 1.1 1 0l7.2-7.2h.1c2.7-1.1 3.9-3.1 3.9-5.1z" />
              </svg>
              <span>{isLoggedIn ? 'เริ่มจองที่นั่ง' : 'เข้าสู่ระบบด้วย LINE เพื่อจองที่นั่ง'}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={showHelpCenter}
              className="w-full sm:w-auto bg-white/10 hover:bg-white/15 border border-white/20 text-white py-3.5 sm:py-4 px-8 rounded-2xl font-extrabold text-[13px] sm:text-base backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-2 active:scale-97 shadow-lg"
            >
              <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-300 shrink-0" />
              <span>พูดคุยสอบถามแอดมิน</span>
            </button>
          </div>

        </div>

        {/* Slider Indicators (Dots) - Ultra-slim Glassmorphic Pill floating cleanly above the fade transition zone */}
        <div className="absolute bottom-6 sm:bottom-20 left-1/2 transform -translate-x-1/2 flex items-center gap-2 z-30 bg-slate-950/20 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full shadow-lg">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentSlide === idx ? 'w-6 bg-purple-400 shadow-sm shadow-purple-500/25' : 'w-1.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Trip showcase Section - Redesigned to Premium Card Slider */}
      <section id="destinations" className="py-12 lg:py-28 bg-white border-b border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          
          <div className="text-center max-w-xl mx-auto space-y-3 sm:space-y-4 mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>อัปเดตทริปใหม่ทุกสัปดาห์</span>
            </div>
            <h2 className="text-xl sm:text-4xl font-black text-slate-900 leading-tight">
              ทริปยอดฮิตยอดนิยม “ด่าไป เดินไป”
            </h2>
            <p className="text-[11px] sm:text-sm text-slate-500 font-medium leading-relaxed px-4 sm:px-0">
              สัมผัสความงามของขุนเขาและธรรมชาติชั้นแนวหน้าของเมืองไทย จองที่นั่งรถตู้เดินทางไปกับครอบครัวหรือกลุ่มเพื่อนร่วมอุดมการณ์
            </p>
          </div>

          {/* Cards Carousel Container with group hover states */}
          <div className="relative group/carousel">
            
            {/* Scrollable card deck with snap alignment & hidden scrollbar */}
            <div 
              ref={tripsScrollRef}
              className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory pb-6 sm:pb-8 pt-2 sm:pt-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {destinations.map((dest, idx) => (
                <div 
                  key={idx} 
                  className="w-[85vw] max-w-[340px] sm:w-[360px] md:w-[380px] shrink-0 snap-center sm:snap-start bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgb(76,29,149,0.07)] transition-all duration-350 hover:-translate-y-1.5 flex flex-col group"
                >
                  {/* Image top with floating seats status pill (No rating star! - aspect ratio reduced to modern 16:10 landscape) */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-50 shrink-0">
                    <img 
                      src={dest.img} 
                      alt={dest.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    
                    {/* Floating Status Pill on top-left of the image */}
                    <div className="absolute top-4 left-4 z-10">
                      {dest.availableSeats !== undefined ? (
                        dest.availableSeats <= 3 ? (
                          <span className="inline-flex items-center gap-1.5 bg-rose-600/90 backdrop-blur-sm text-white text-[10px] font-black py-1 px-2.5 rounded-full shadow-md border border-white/10">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping shrink-0" />
                            <span>{dest.seatsText}</span>
                          </span>
                        ) : dest.availableSeats <= 8 ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-black py-1 px-2.5 rounded-full shadow-md border border-white/10">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shrink-0" />
                            <span>{dest.seatsText}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-[#4c1d95]/85 backdrop-blur-sm text-white text-[10px] font-black py-1 px-2.5 rounded-full shadow-md border border-white/10">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
                            <span>{dest.seatsText}</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-[#4c1d95]/85 backdrop-blur-sm text-white text-[10px] font-black py-1 px-2.5 rounded-full shadow-md border border-white/10">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0" />
                          <span>มีที่นั่งว่าง</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                    <div className="space-y-4">
                      {/* Trip Title */}
                      <h3 className="text-base sm:text-lg font-black text-slate-800 leading-snug group-hover:text-[#4c1d95] transition duration-200 line-clamp-1">
                        {dest.title}
                      </h3>
                      
                      {/* Structured Details with Icons - Cleaner inline schedule */}
                      <div className="space-y-2.5 text-xxs sm:text-xs font-bold text-slate-400">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-purple-600/70 shrink-0" />
                          <span className="truncate text-slate-500">{dest.pickupPoint}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-purple-600/70 shrink-0" />
                          <span className="text-slate-500">{dest.departureDate} &bull; เวลา {dest.departureTime} น.</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Price on the left, interactive book button on the right */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                      <div>
                        <p className="text-[10px] text-slate-400 leading-none">เริ่มต้นเพียง</p>
                        <p className="text-base sm:text-lg font-black text-[#4c1d95] mt-1">
                          ฿{dest.price} <span className="text-[10px] text-slate-400 font-semibold">/ ที่นั่ง</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <button 
                          onClick={showHelpCenter}
                          className="bg-purple-50 text-[#4c1d95] group-hover:bg-[#4c1d95] group-hover:text-white transition-all duration-300 py-2 px-4 rounded-xl font-black text-xxs flex items-center gap-1 border border-purple-100 group-hover:border-transparent shadow-sm active:scale-95"
                        >
                          <span>ติดต่อแอดมินเพื่อจอง</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Left Floating Arrow Button (Reveals on Hover, Hidden on Mobile Touch) */}
            <button
              onClick={scrollTripsLeft}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-[#4c1d95] border border-slate-200/80 shadow-lg hidden md:flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none opacity-0 group-hover/carousel:opacity-100"
              aria-label="เลื่อนซ้าย"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* Right Floating Arrow Button (Reveals on Hover, Hidden on Mobile Touch) */}
            <button
              onClick={scrollTripsRight}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-[#4c1d95] border border-slate-200/80 shadow-lg hidden md:flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group focus:outline-none opacity-0 group-hover/carousel:opacity-100"
              aria-label="เลื่อนขวา"
            >
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>

          </div>

          <div className="text-center mt-12">
            <button 
              onClick={showHelpCenter}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-[#4c1d95] hover:text-purple-800 underline transition"
            >
              <span>สอบถามข้อมูลตารางทริปทั้งหมดกับแอดมินที่นี่</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>







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
              <button
                onClick={showHelpCenter}
                className="bg-[#06C755] hover:bg-[#05b34c] text-white py-3 px-8 rounded-xl font-black text-xxs sm:text-xs transition-all duration-300 shadow-md shadow-[#06C755]/10 flex items-center gap-2 active:scale-97 group relative overflow-hidden"
              >
                <MessageSquare className="w-4 h-4 text-white" />
                <span>ติดต่อแอดมินเพื่อขอลิ้งก์จองเลย</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
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
              กลุ่มเดินป่าและเดินทางสายผจญภัย มุ่งสร้างสรรค์ทริปท่องเที่ยวธรรมชาติที่คุ้มค่า สนุกสนาน มิตรภาพที่ยั่งยืน และปลอดภัยทุกก้าวเดิน
            </p>
          </div>

          {/* Col 2 Links */}
          <div className="space-y-3">
            <h5 className="text-white font-extrabold text-xs tracking-wider uppercase">การช่วยเหลือ</h5>
            <ul className="space-y-2 text-xxs sm:text-xs font-bold text-slate-500">
              <li>
                <button onClick={showHelpCenter} className="hover:text-white transition">
                  ติดต่อแอดมิน / คุยผ่านไลน์
                </button>
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
                <span>+66 89 123 4567</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                <span>support@dapaidernpai.com</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-purple-400" />
                <span>เชียงใหม่ / กรุงเทพฯ, ประเทศไทย</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-slate-800/80 text-center text-xxs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4 font-bold">
          <p>© 2026 ด่าไป เดินไป (DAPAI DERNPAI) All Rights Reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">นโยบายความเป็นส่วนตัว</a>
            <a href="#" className="hover:underline">เงื่อนไขการให้บริการ</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
