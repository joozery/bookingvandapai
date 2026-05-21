'use client';

import React, { useState } from 'react';
import { 
  Compass, 
  Armchair, 
  Shield, 
  Lock, 
  ArrowRight, 
  Star, 
  Users, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Mail, 
  Info, 
  Sparkles, 
  Clock, 
  Heart,
  HelpCircle,
  MessageSquare
} from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  showHelpCenter: () => void;
}

export default function LandingPage({ onLoginClick, showHelpCenter }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  const faqs = [
    {
      q: "จองที่นั่งรถตู้แล้วสามารถยกเลิกได้ไหม?",
      a: "สามารถแจ้งยกเลิกการจองได้ผ่านระบบโดยตรง โดยคำขอจะถูกส่งให้แอดมินอนุมัติ หากแอดมินทำการอนุมัติแล้ว ระบบจะทำการคืนสิทธิ์ที่นั่งหรือดำเนินการตามนโยบายของทริปนั้นๆ ทันที"
    },
    {
      q: "การกรอกข้อมูลประกันเดินทางมีความสำคัญอย่างไร?",
      a: "เนื่องจากทริปของ “ด่าไป เดินไป” เน้นการเดินทางท่องเที่ยวธรรมชาติและเดินป่า ความปลอดภัยจึงเป็นสิ่งสำคัญที่สุด ข้อมูลประกันอุบัติเหตุและผู้ติดต่อฉุกเฉินจะถูกนำไปลงทะเบียนประกันภัยการเดินทางให้คุณโดยอัตโนมัติก่อนออกเดินทาง"
    },
    {
      q: "สามารถเลือกที่นั่งด้วยตนเองได้จริงใช่ไหม?",
      a: "ใช่ครับ ระบบของเราแสดงแผนผังที่นั่งของรถตู้แต่ละคันแบบเรียลไทม์ 100% เบาะที่ว่างและเบาะที่มีคนจองแล้วจะอัปเดตทันที ป้องกันการจองซ้อนอย่างเด็ดขาด ให้คุณจองที่นั่งคู่หูหรือมุมโปรดได้ตามใจชอบ"
    },
    {
      q: "หากพบปัญหาในการจองหรือการชำระเงิน ต้องติดต่อช่องทางใด?",
      a: "คุณสามารถกดปุ่ม \"ติดต่อแอดมิน\" ได้ที่มุมขวาบน หรือแอดไลน์ของทริปเพื่อพูดคุยสอบถามและแจ้งปัญหาการใช้งานได้ตลอด 24 ชั่วโมง ทีมงานยินดีช่วยเหลืออย่างเต็มที่ครับ"
    }
  ];

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const destinations = [
    {
      title: "ทริปแม่ฮ่องสอน - ปาย 3 วัน 2 คืน",
      desc: "ตะลุย 1,864 โค้ง สัมผัสไอหมอกยามเช้า เดินเล่นถนนคนเดินปาย ชิมอาหารพื้นเมืองเลิศรส",
      price: "2,500",
      seats: "เหลือ 4 ที่นั่ง",
      img: "/logo/scenic_van_trip.png",
      rating: 4.9,
      reviews: "128 รีวิว",
      badge: "ยอดนิยมที่สุด 🔥"
    },
    {
      title: "ทริปเชียงดาว - อ่างขาง 2 วัน 1 คืน",
      desc: "ชมดาวเต็มฟ้า ณ ดอยหลวงเชียงดาว สัมผัสอากาศหนาวจับใจบนยอดดอยอ่างขาง ชมสวนบ๊วยประวัติศาสตร์",
      price: "1,800",
      seats: "เหลือ 2 ที่นั่ง",
      img: "/logo/scenic_van_trip.png",
      rating: 4.8,
      reviews: "94 รีวิว",
      badge: "วิวหลักล้าน ⛰️"
    },
    {
      title: "ทริปสะปัน - บ่อเกลือ - น่าน",
      desc: "หมู่บ้านกลางสายหมอกโอบล้อมด้วยขุนเขาเขียวขจี ลิ้มรสกาแฟวิวสวย สัมผัสวิถีสโลว์ไลฟ์อย่างแท้จริง",
      price: "2,200",
      seats: "เหลือ 5 ที่นั่ง",
      img: "/logo/scenic_van_trip.png",
      rating: 4.9,
      reviews: "112 รีวิว",
      badge: "ธรรมชาติบำบัด 🍃"
    }
  ];

  return (
    <div className="flex-1 w-full bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      
      {/* Sticky Premium Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="shrink-0 shadow-md rounded-2xl overflow-hidden bg-white p-1 border-2 border-[#4c1d95] flex items-center justify-center">
              <img src="/logo/logo.png" alt="DAPAIDERNPAI Logo" className="w-10 h-10 object-contain" />
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
            <a href="#how-it-works" className="hover:text-purple-800 transition">วิธีการจอง</a>
            <a href="#faqs" className="hover:text-purple-800 transition">คำถามที่พบบ่อย</a>
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
            
            <a 
              href="/admin" 
              className="flex items-center gap-1.5 text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 transition px-3 py-2 rounded-xl border border-purple-200 text-xs font-bold"
            >
              <span>แอดมิน</span>
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
              <span>เข้าสู่ระบบด้วย LINE</span>
            </button>
          </div>
        </div>
      </header>

      {/* Dynamic / Glowing Banner Badge */}
      <div className="w-full bg-gradient-to-r from-[#4c1d95] via-purple-700 to-indigo-800 text-white text-center py-2.5 px-4 text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-inner">
        <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse shrink-0" />
        <span>ระบบจองที่นั่งรถตู้เวอร์ชันใหม่: ซิงค์แผนผังที่นั่งเรียลไทม์ 100% พร้อมประกันเดินทางอัตโนมัติ!</span>
        <button 
          onClick={onLoginClick} 
          className="underline hover:text-yellow-200 transition font-black ml-2 hidden sm:inline-block"
        >
          จองเลยวันนี้ →
        </button>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 bg-white border-b border-slate-100">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-[#4c1d95]/10 rounded-full filter blur-[100px] -z-10 animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-10 right-1/10 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-[120px] -z-10 animate-pulse duration-[10000ms]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 text-left space-y-8 animate-in fade-in slide-in-from-left-6 duration-700">
              
              {/* Premium micro badge */}
              <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-full py-1.5 px-4 text-xs font-extrabold text-[#4c1d95] shadow-sm">
                <Compass className="w-4 h-4 text-[#4c1d95] animate-spin-slow" />
                <span>การเดินทางที่แสนสบายและปลอดภัย</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-4">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
                  ก้าวสู่การเดินทางที่ง่ายดาย <br />
                  กับทริป <span className="bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">“ด่าไป เดินไป”</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-xl font-medium">
                  มิติใหม่ของการจองที่นั่งรถตู้ท่องเที่ยว ค้นหาทริปป่าสุดฮิต เช็คผังเบาะนั่งจริงแบบเรียลไทม์ และเตรียมข้อมูลทำประกันเดินทางได้อย่างรวดเร็ว ครบครันในที่เดียว ปลอดภัยทุกการเดินทาง
                </p>
              </div>

              {/* Benefits checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                {[
                  "เลือกที่นั่งและเบาะว่างเรียลไทม์ 100%",
                  "ข้อมูลประกันเดินทางบันทึกใช้ซ้ำง่าย",
                  "แจ้งยกเลิกออนไลน์ ส่งตรงแอดมินทันที",
                  "รับดิจิทัลตั๋วสำหรับสแกนขึ้นรถผ่านมือถือ"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs sm:text-sm font-extrabold text-slate-700">{item}</span>
                  </div>
                ))}
              </div>

              {/* Primary Call to Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  onClick={onLoginClick}
                  className="bg-[#06C755] hover:bg-[#05b34c] text-white py-4 px-8 rounded-2xl font-black text-base transition-all duration-300 shadow-xl shadow-[#06C755]/20 flex items-center justify-center gap-3 active:scale-98 group overflow-hidden relative"
                >
                  {/* shine overlay */}
                  <span className="absolute inset-0 w-full h-full bg-white/15 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current shrink-0">
                    <path d="M24 10.3c0-4.7-4.8-8.5-10.7-8.5S2.7 5.6 2.7 10.3c0 4.2 3.8 7.7 8.9 8.4.3.1.8.2.9.5.1.2 0 .6-.1.8l-.4 2.6c0 .3-.2 1.1 1 0l7.2-7.2h.1c2.7-1.1 3.9-3.1 3.9-5.1z" />
                  </svg>
                  <span>เข้าสู่ระบบด้วย LINE เพื่อจองที่นั่ง</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={showHelpCenter}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-4 px-8 rounded-2xl font-extrabold text-base transition-all duration-300 flex items-center justify-center gap-2 hover:border-slate-300 active:scale-98"
                >
                  <MessageSquare className="w-5 h-5 text-slate-400" />
                  <span>พูดคุยสอบถามแอดมิน</span>
                </button>
              </div>

              {/* Security info */}
              <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                <Lock className="w-4 h-4 text-slate-300 shrink-0" />
                <span>รับประกันความปลอดภัยของข้อมูลส่วนบุคคลและข้อมูลทำประกัน</span>
              </div>
            </div>

            {/* Right Image/Mockup Column */}
            <div className="lg:col-span-5 relative w-full flex items-center justify-center animate-in fade-in slide-in-from-right-6 duration-700 delay-100">
              
              {/* Premium Glow ring under image */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#4c1d95]/30 to-emerald-500/10 rounded-[40px] blur-3xl -z-10 transform scale-95" />

              {/* Real Gorgeous Generated Image wrapped in custom mockups */}
              <div className="relative w-full max-w-[460px] aspect-square rounded-[40px] overflow-hidden border-4 border-white shadow-2xl p-2 bg-gradient-to-tr from-purple-100 to-indigo-50">
                <img 
                  src="/logo/scenic_van_trip.png" 
                  alt="Beautiful Scenic Van Trip" 
                  className="w-full h-full object-cover rounded-[32px] shadow-inner transition-transform duration-700 hover:scale-105"
                />

                {/* Floating Glass Badges */}
                <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md border border-white/50 rounded-2xl py-2.5 px-4 shadow-xl flex items-center gap-2.5 animate-bounce-slow">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                    100%
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold leading-none">สถานะที่นั่ง</p>
                    <p className="text-xs text-slate-800 font-black mt-0.5">เรียลไทม์ ซิงค์ตรง</p>
                  </div>
                </div>

                <div className="absolute bottom-6 right-6 bg-purple-900/90 backdrop-blur-md border border-purple-500/30 rounded-2xl py-2.5 px-4 shadow-xl flex items-center gap-2.5 text-white">
                  <Heart className="w-4 h-4 text-rose-400 fill-rose-400 animate-pulse" />
                  <div>
                    <p className="text-[9px] text-purple-200 font-bold leading-none">ทริปเดินป่าแม่ฮ่องสอน</p>
                    <p className="text-xs font-black mt-0.5">ยอดจองเต็มเร็วที่สุด! ⭐ 4.9</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="bg-slate-50 py-10 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { val: "10,000+", label: "ผู้ใช้งานชาวเดินป่า" },
              { val: "99.8%", label: "ความพึงพอใจการจอง" },
              { val: "1,500+", label: "ทริปเสร็จสิ้นปลอดภัย" },
              { val: "24 ชม.", label: "ซัพพอร์ตโดยทีมงานแอดมิน" }
            ].map((stat, idx) => (
              <div key={idx} className="space-y-1 bg-white py-4 px-6 rounded-2xl border border-slate-100 shadow-sm transition hover:shadow-md">
                <p className="text-xl sm:text-2xl font-black bg-gradient-to-r from-[#4c1d95] to-indigo-600 bg-clip-text text-transparent">{stat.val}</p>
                <p className="text-xxs sm:text-xs text-slate-400 font-bold">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trip showcase Section */}
      <section id="destinations" className="py-20 lg:py-28 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>อัปเดตทริปใหม่ทุกสัปดาห์</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight">
              ทริปยอดฮิตยอดนิยม “ด่าไป เดินไป”
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              สัมผัสความงามของขุนเขาและธรรมชาติชั้นแนวหน้าของเมืองไทย จองที่นั่งรถตู้เดินทางไปกับครอบครัวหรือกลุ่มเพื่อนร่วมอุดมการณ์
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {destinations.map((dest, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-3xl overflow-hidden border border-slate-150 shadow-lg hover:shadow-xl transition-all duration-350 hover:-translate-y-1.5 flex flex-col group"
              >
                {/* Image top with badge */}
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 shrink-0">
                  <img 
                    src={dest.img} 
                    alt={dest.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute top-4 left-4 bg-purple-900/90 backdrop-blur-sm text-white font-extrabold text-[11px] py-1 px-3 rounded-full shadow-md">
                    {dest.badge}
                  </div>
                  <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-sm text-white font-extrabold text-[11px] py-1 px-2.5 rounded-lg flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                    <span>{dest.rating}</span>
                  </div>
                </div>

                {/* Body details */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-800 leading-snug group-hover:text-[#4c1d95] transition">
                      {dest.title}
                    </h3>
                    <p className="text-xxs sm:text-xs text-slate-400 font-bold leading-relaxed">
                      {dest.desc}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                    <div>
                      <p className="text-[10px] text-slate-400 leading-none">เริ่มต้นเพียง</p>
                      <p className="text-base font-black text-slate-800 mt-1">
                        ฿{dest.price} <span className="text-[10px] text-slate-400 font-semibold">/ ที่นั่ง</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="inline-block bg-rose-50 text-rose-600 text-[10px] py-1 px-2.5 rounded-full font-black border border-rose-100">
                        {dest.seats}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button 
              onClick={onLoginClick}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-[#4c1d95] hover:text-purple-800 underline transition"
            >
              <span>ดูข้อมูลตารางทริปทั้งหมดและกดจองที่นี่</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              จองที่นั่งง่ายๆ เพียง 3 ขั้นตอน
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-bold">
              ไม่ต้องวุ่นวายกับการต่อคิวหรือโทรจอง ทุกขั้นตอนทำได้เองบนมือถือใน 2 นาที
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative group hover:shadow-md transition">
              <div className="w-12 h-12 bg-purple-50 text-[#4c1d95] rounded-2xl flex items-center justify-center font-black text-lg mb-6 shadow-sm shadow-purple-100 group-hover:scale-105 transition-transform">
                1
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-800 mb-2">เข้าสู่ระบบด้วย LINE</h4>
              <p className="text-xxs sm:text-xs text-slate-400 font-bold leading-relaxed">
                ปลอดภัย รวดเร็ว ไม่ต้องพิมพ์รหัสผ่านใหม่ บันทึกข้อมูลตั๋วโดยสารและสถานะการจองเข้าบัญชีของคุณทันที
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative group hover:shadow-md transition">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-lg mb-6 shadow-sm shadow-emerald-100 group-hover:scale-105 transition-transform">
                2
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-800 mb-2">เลือกทริปและที่นั่งมุมโปรด</h4>
              <p className="text-xxs sm:text-xs text-slate-400 font-bold leading-relaxed">
                ดูแผนผังเบาะนั่งจริง เลือกที่นั่งว่างที่โดนใจ พร้อมกรอกข้อมูลประกันอุบัติเหตุเพื่อความอุ่นใจของคุณ
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative group hover:shadow-md transition">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg mb-6 shadow-sm shadow-indigo-100 group-hover:scale-105 transition-transform">
                3
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-800 mb-2">ชำระเงินและรับตั๋วดิจิทัล</h4>
              <p className="text-xxs sm:text-xs text-slate-400 font-bold leading-relaxed">
                ชำระเงินสะดวกรวดเร็ว ตรวจสอบประวัติการจองได้ตลอดเวลา และดาวน์โหลดตั๋วดิจิทัลเก็บในคลังภาพได้ทันที
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Deep Dive / Benefits Grid */}
      <section className="py-20 lg:py-28 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left detail Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-block bg-purple-50 text-[#4c1d95] font-black text-xxs py-1.5 px-3 rounded-full border border-purple-100">
                ฟังก์ชันเด่นระดับพรีเมียม
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                ให้ความสำคัญกับทุกรายละเอียดการเดินทางของคุณ
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-bold leading-relaxed">
                เพราะทริป “ด่าไป เดินไป” ไม่ได้เป็นเพียงแค่การส่งคุณถึงจุดหมาย แต่เราดูแลตั้งแต่ความสะดวกสบายในขั้นตอนการจอง ตลอดจนการทำประกันภัยเพื่อความอุ่นใจอย่างเป็นระบบ
              </p>

              <button 
                onClick={onLoginClick}
                className="bg-[#4c1d95] hover:bg-purple-950 text-white font-extrabold text-xs sm:text-sm py-3 px-6 rounded-xl shadow-md transition-all active:scale-98"
              >
                เริ่มต้นจองที่นั่งรถตู้ทันที
              </button>
            </div>

            {/* Right feature cards Column */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#4c1d95] flex items-center justify-center shadow-sm">
                  <Armchair className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">เลือกรถและเบาะแบบอิสระ</h4>
                <p className="text-xxs sm:text-xs text-slate-400 font-bold leading-relaxed">
                  เลือกคันรถตู้และตำแหน่งที่นั่งได้เอง ดูรายละเอียดจุดจอดรถและจุดลงรถได้ทันทีจากข้อมูลทริป
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">ลงทะเบียนข้อมูลประกันภัย</h4>
                <p className="text-xxs sm:text-xs text-slate-400 font-bold leading-relaxed">
                  กรอกชื่อ-นามสกุล เบอร์โทรศัพท์ และข้อมูลผู้ติดต่อฉุกเฉิน ระบบจะจัดเตรียมส่งประกันให้อย่างถูกต้องปลอดภัย
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                  <Clock className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">การคืนสิทธิ์และยกเลิกการจอง</h4>
                <p className="text-xxs sm:text-xs text-slate-400 font-bold leading-relaxed">
                  มีเหตุฉุกเฉินเดินทางไม่ได้? ส่งเรื่องคำขอยกเลิกผ่านหน้าตั๋วออนไลน์ แอดมินอนุมัติง่าย สะดวกรวดเร็ว
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">ทีมงานแอดมินดูแลอบอุ่น</h4>
                <p className="text-xxs sm:text-xs text-slate-400 font-bold leading-relaxed">
                  ให้คำแนะนำ แนะนำจุดขึ้นรถตู้ ประสานงานการจ่ายเงินและช่วยเหลือดูแลปัญหาต่างๆ อย่างเป็นมิตรและเป็นกันเอง
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Testimonials section */}
      <section className="py-20 lg:py-28 bg-[#f8fafc] border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              ความประทับใจจากผู้ร่วมทริปจริง
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-bold">
              ความคิดเห็นและคำชื่นชมจากเพื่อนๆ นักเดินทางผู้รักผืนป่าและขุนเขา
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                text: "“ชอบระบบการเลือกที่นั่งมากๆ ค่ะ สด เรียลไทม์จริง ไม่ต้องคอยเช็กไลน์ว่าตรงไหนว่าง เลือกได้ตามใจชอบ แถมระบบทำประกันเดินทางก็สะดวกรวดเร็ว กรอกรอบเดียวใช้ได้ตลอดไปเลยค่ะ”",
                author: "คุณชิดชนก น.",
                trip: "ทริปแม่ฮ่องสอน - ปาย",
                rating: 5
              },
              {
                text: "“ประทับใจแอดมินและระบบนี้มากครับ ล่าสุดมีงานด่วนเข้ามาจึงจำต้องยกเลิกทริป สามารถกดส่งคำขอไปให้แอดมินอนุมัติผ่านเว็บได้เลย แอดมินตอบรับไวและช่วยเหลือดีมาก คราวหน้าจองกับทริปนี้อีกแน่นอน”",
                author: "คุณธนภัทร ส.",
                trip: "ทริปเชียงดาว",
                rating: 5
              },
              {
                text: "“ตัวเลือกทริปมีแต่ทริปโดนๆ รถตู้นั่งสบายมากครับ เบาะปรับเอนได้ แอร์เย็นเจี๊ยบ ที่สำคัญคือระบบตั๋วดิจิทัลเซฟลงเครื่องเก็บรูปไว้สแกนขึ้นรถได้สะดวก ไม่ต้องห่วงเรื่องหาตั๋วไม่เจอ”",
                author: "คุณวรินทร์ พ.",
                trip: "ทริปสะปัน - น่าน",
                rating: 5
              }
            ].map((review, idx) => (
              <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition">
                <div className="space-y-4">
                  <div className="flex gap-1">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 font-bold leading-relaxed italic">
                    {review.text}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-[#4c1d95]/15 flex items-center justify-center text-[#4c1d95] font-black text-sm">
                    {review.author[3]}
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-800">{review.author}</h5>
                    <p className="text-[10px] text-slate-400 font-bold">ผู้ร่วมทริป: {review.trip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faqs" className="py-20 lg:py-28 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              คำถามที่พบบ่อย (FAQs)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-bold">
              ตอบทุกข้อสงสัยเกี่ยวกับการจองที่นั่งรถตู้กับ “ด่าไป เดินไป”
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div 
                  key={idx} 
                  className={`border border-slate-200/80 rounded-2xl overflow-hidden transition-all duration-300 ${
                    isOpen ? 'bg-purple-50/20 border-[#4c1d95]/40 shadow-sm' : 'bg-white hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-extrabold text-xs sm:text-sm text-slate-800"
                  >
                    <span>{faq.q}</span>
                    <span className={`w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 transition-transform ${
                      isOpen ? 'transform rotate-180 bg-[#4c1d95]/10 text-[#4c1d95]' : ''
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>

                  <div className={`overflow-hidden transition-all duration-300 max-h-0 ${
                    isOpen ? 'max-h-[300px] border-t border-slate-100' : ''
                  }`}>
                    <div className="p-5 sm:p-6 text-xxs sm:text-xs text-slate-400 font-bold leading-relaxed bg-white/50">
                      {faq.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Action / Invite Banner CTA at the bottom */}
      <section className="py-16 lg:py-24 bg-gradient-to-tr from-[#4c1d95] via-[#56368C] to-indigo-900 text-white relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,199,85,0.15),transparent_40%)]" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10 animate-in fade-in duration-500">
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            พร้อมออกเดินทางไปเก็บความทรงจำที่สวยงามหรือยัง?
          </h2>
          
          <p className="text-xs sm:text-base text-purple-200 max-w-xl mx-auto font-medium">
            จองที่นั่งรถตู้คันโปรดของคุณง่ายๆ ผ่านระบบออนไลน์ เพื่อไม่พลาดทริปเดินป่าสุดพิเศษนี้
          </p>

          <div className="pt-2">
            <button
              onClick={onLoginClick}
              className="inline-flex items-center gap-3 bg-[#06C755] hover:bg-[#05b34c] text-white py-4 px-10 rounded-2xl font-black text-sm sm:text-base transition-all duration-300 shadow-xl shadow-[#06C755]/20 hover:shadow-[#06C755]/40 active:scale-98 group"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current shrink-0">
                <path d="M24 10.3c0-4.7-4.8-8.5-10.7-8.5S2.7 5.6 2.7 10.3c0 4.2 3.8 7.7 8.9 8.4.3.1.8.2.9.5.1.2 0 .6-.1.8l-.4 2.6c0 .3-.2 1.1 1 0l7.2-7.2h.1c2.7-1.1 3.9-3.1 3.9-5.1z" />
              </svg>
              <span>ล็อกอิน LINE และเริ่มต้นจองเลย</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="flex justify-center items-center gap-6 pt-4 text-purple-300 font-bold text-[11px]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ไม่มีค่าธรรมเนียมแอบแฝง
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ยกเลิกออนไลน์ได้รวดเร็ว
            </span>
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
                <img src="/logo/logo.png" alt="DAPAIDERNPAI Logo" className="w-8 h-8 object-contain" />
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
