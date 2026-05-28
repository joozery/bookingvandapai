
import React, { forwardRef } from 'react';
import { Calendar, ArrowRight, User, Phone, RefreshCw, Compass, Armchair, MapPin, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

import { coverBase64 } from '@/lib/coverBase64';

export interface BookingData {
  id: string;
  tripName?: string;
  durationDays?: number;
  pickupPoint?: string;
  departureDate?: string;
  departureTime?: string;
  vanNumber?: number;
  seatLabel?: string;
  seatId?: string;
  cost?: number;
  nickname?: string;
  fullName?: string;
  phone?: string;
  driverName?: string;
  driverPhone?: string;
  plateNumber?: string;
  note?: string;
  status?: string;
  pendingTransfer?: any;
}

interface Props {
  booking: BookingData;
  ticketRef?: React.RefObject<HTMLDivElement>;
  htmlId?: string;
}

const parsePlate = (plate?: string) => {
  if (!plate) return { number: '-', province: '-' };
  const parts = plate.trim().split(/\s+/);
  const number = parts[0] || '-';
  const province = parts.slice(1).join(' ') || 'กรุงเทพ';
  return { number, province };
};

const getReturnDate = (depDate: string, days: number) => {
  if (!depDate) return '';
  return depDate;
};

export const DigitalTicket = forwardRef<HTMLDivElement, Props>(({ booking, htmlId }, ref) => {

  return (
    <div id={htmlId} ref={ref} className="relative w-full max-w-[380px] mx-auto bg-white overflow-hidden shadow-xl border border-slate-100 flex flex-col font-sans select-none">
                
                {/* 1. Header Section (Gradient purple with climber silhouette moon & birds) */}
                <div className="relative w-full aspect-[800/296] overflow-hidden shrink-0 bg-[#250A4E]">
                  <img src={coverBase64} alt="Cover Background" className="absolute inset-0 w-full h-full object-cover" />
                </div>

                {/* Perforation 1 (Header to Body) */}
                <div className="relative flex items-center justify-center w-full bg-[#f3effa] select-none h-4">
                  <div className="absolute -left-2 w-4 h-4 rounded-full bg-[#f5f6fa] border-r border-[#EAD6FF]/30 z-10 shadow-inner"></div>
                  <div className="flex items-center justify-between w-full px-4 gap-1 opacity-50 overflow-hidden">
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
                      <span className="text-[#2E1A47] font-black text-[18px] leading-tight block mt-0.5 tracking-tight truncate-two-lines break-words whitespace-normal" style={{ wordBreak: 'break-word' }}>
                        {booking.tripName}
                      </span>
                      <div className="mt-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-[#2E1A47] text-white">
                          {booking.durationDays && booking.durationDays > 1 
                            ? `${booking.durationDays} วัน ${booking.durationDays - 1} คืน` 
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
                          <QRCodeSVG value={booking.id} size={66} level="M" includeMargin={false} />
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
                          <span className="text-[15px] font-black text-[#2E1A47] block mt-0.5 leading-none">{booking.vanNumber}</span>
                        </div>
                      </div>
                      <div className="p-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                          <Armchair className="w-4.5 h-4.5 text-[#2E1A47]" />
                        </div>
                        <div>
                          <span className="text-[8.5px] font-black text-[#5A3882]/80 block leading-none">หมายเลขที่นั่ง</span>
                          <span className="text-[15px] font-black text-[#2E1A47] block mt-0.5 leading-none font-mono">{booking.seatLabel}</span>
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
                          <span className="text-[11.5px] font-black text-[#2E1A47] block mt-0.5 leading-none">{booking.departureDate}</span>
                        </div>
                      </div>
                      <div className="p-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                          <Clock className="w-4.5 h-4.5 text-[#2E1A47]" />
                        </div>
                        <div>
                          <span className="text-[8.5px] font-black text-[#5A3882]/80 block leading-none">เวลาเดินทาง</span>
                          <span className="text-[11.5px] font-black text-[#2E1A47] block mt-0.5 leading-none">{booking.departureTime} น.</span>
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
                        <span className="text-[11.5px] font-black text-[#2E1A47] block mt-0.5 leading-tight truncate">{booking.pickupPoint}</span>
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
                          <span className="text-[11.5px] font-black text-[#2E1A47] block mt-0.5 leading-tight truncate">{booking.fullName}</span>
                        </div>
                      </div>
                      <div className="p-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                          <Phone className="w-4.5 h-4.5 text-[#2E1A47]" />
                        </div>
                        <div>
                          <span className="text-[8.5px] font-black text-[#5A3882]/80 block leading-none">เบอร์โทรศัพท์ลูกทริป</span>
                          <span className="text-[11.5px] font-black text-[#2E1A47] block mt-0.5 leading-none">{booking.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {booking.note && (
                    <div className="mt-2 px-2.5 py-1.5 bg-purple-50/70 border border-purple-100/60 rounded-lg leading-relaxed">
                      <span className="text-[#5A3882] font-black text-[8px] block leading-none mb-0.5">รายละเอียดเพิ่มเติม (Note):</span>
                      <span className="text-[#2E1A47] font-bold text-[9.5px] block italic leading-tight">"{booking.note}"</span>
                    </div>
                  )}
                </div>

                {/* Perforation 2 (Body to Bottom Section) */}
                <div className="relative flex items-center justify-center w-full bg-[#f3effa] select-none h-4">
                  <div className="absolute -left-2 w-4 h-4 rounded-full bg-[#f5f6fa] border-r border-[#EAD6FF]/30 z-10 shadow-inner"></div>
                  <div className="flex items-center justify-between w-full px-4 gap-1 opacity-50 overflow-hidden">
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
                        <span className="text-[10.5px] font-black text-[#2E1A47] block mt-0.5 truncate leading-none">{booking.driverName || 'ยังไม่ระบุ'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded bg-[#2E1A47]/10 flex items-center justify-center shrink-0">
                        <Phone className="w-3.5 h-3.5 text-[#2E1A47]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[7.5px] font-bold text-[#5A3882]/85 block leading-none">เบอร์โทรศัพท์คนขับ</span>
                        <span className="text-[10.5px] font-black text-[#2E1A47] block mt-0.5 truncate leading-none">{booking.driverPhone || 'ยังไม่ระบุ'}</span>
                      </div>
                    </div>
                  </div>

                  {/* License Plate Text Only */}
                  <div className="mt-2.5 relative z-10">
                    <span className="text-[7.5px] font-bold text-[#5A3882]/85 block leading-none">ป้ายทะเบียนรถ</span>
                    <span className="text-[10.5px] font-black text-[#2E1A47] block mt-0.5 leading-none">{booking.plateNumber || 'ยังไม่ระบุ'}</span>
                  </div>

                  {/* Bottom slogan centered exactly matching screenshot */}
                  <div className="absolute bottom-1.5 left-0 right-0 text-center text-[#2E1A47] text-[9.5px] font-black italic tracking-wide select-none">
                    “แล้วเจอกันวันเดินทางนะจ๊ะ อีพวกปากดี”
                  </div>
                </div>
              </div>
  );
});

export default DigitalTicket;
