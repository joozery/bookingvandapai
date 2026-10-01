'use client';

import React from 'react';
import { extraSeatId } from '@/lib/extraSeat';

interface VanSeatCardProps {
  seat: any | null;
  van?: any;
  isUser?: boolean;
  isBooked?: boolean;
  isAvailable?: boolean;
  isStaff?: boolean;
  isDriver?: boolean;
  isBlocked?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function VanSeatCard({
  seat,
  van,
  isUser = false,
  isBooked = false,
  isAvailable = false,
  isStaff = false,
  isDriver = false,
  isBlocked = false,
  isSelected = false,
  onClick,
  disabled = false,
  compact = false,
}: VanSeatCardProps) {
  if (!seat) {
    return <div className="h-16 sm:h-20 w-full" />;
  }

  const label = seat.label || '';
  const passengerName = seat.passengerName || '';
  const isExtraSeat = seat.id === (van ? extraSeatId(van.id) : '') || label === 'เสริม';

  // Specific theme styles and illustrations per seat (Rich 3D vector artwork)
  const renderThemeIllustration = () => {
    if (isDriver || label === 'D') {
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 flex items-center justify-center">
          <svg viewBox="0 0 120 120" className="w-24 h-24 text-blue-300 fill-current">
            <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" />
            <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <polygon points="60,12 70,50 108,60 70,70 60,108 50,70 12,60 50,50" fill="#93c5fd" opacity="0.6" />
            <text x="60" y="24" fontSize="9" textAnchor="middle" fill="#ffffff" fontWeight="bold">N</text>
            <text x="100" y="63" fontSize="9" textAnchor="middle" fill="#ffffff" fontWeight="bold">E</text>
            <text x="60" y="102" fontSize="9" textAnchor="middle" fill="#ffffff" fontWeight="bold">S</text>
            <text x="20" y="63" fontSize="9" textAnchor="middle" fill="#ffffff" fontWeight="bold">W</text>
          </svg>
        </div>
      );
    }

    switch (label) {
      case '1': // Mountain Sunrise
        return (
          <div className="absolute inset-0 pointer-events-none opacity-80 overflow-hidden">
            <svg viewBox="0 0 100 80" className="absolute bottom-0 left-0 w-full h-14">
              <path d="M-10 80 L25 30 L50 65 L80 15 L110 80 Z" fill="#c084fc" opacity="0.5" />
              <path d="M10 80 L45 25 L75 60 L105 35 L120 80 Z" fill="#60a5fa" opacity="0.4" />
              <circle cx="28" cy="22" r="9" fill="#fde047" opacity="0.95" />
              <path d="M 0 50 Q 20 40 40 52 T 80 48 T 100 55 L 100 80 L 0 80 Z" fill="#a78bfa" opacity="0.3" />
              <path d="M60 20 Q65 15 70 20 Q75 15 80 20" stroke="#4c1d95" strokeWidth="1.2" fill="none" opacity="0.6" />
            </svg>
          </div>
        );

      case '2': // Travel Luggage Suitcase
        return (
          <div className="absolute right-1 bottom-0.5 w-8 h-10 pointer-events-none opacity-90">
            <svg viewBox="0 0 40 50" className="w-full h-full">
              <rect x="7" y="13" width="26" height="34" rx="5" fill="#818cf8" stroke="#3730a3" strokeWidth="2" />
              <rect x="11" y="17" width="18" height="26" rx="3" fill="#a5b4fc" opacity="0.7" />
              <path d="M16 13 V7 A4 4 0 0 1 24 7 V13" fill="none" stroke="#3730a3" strokeWidth="2.5" />
              <line x1="7" y1="30" x2="33" y2="30" stroke="#312e81" strokeWidth="1.5" />
              <circle cx="11" cy="47" r="3" fill="#1e1b4b" />
              <circle cx="29" cy="47" r="3" fill="#1e1b4b" />
              <rect x="13" y="21" width="7" height="5" rx="1" fill="#f43f5e" />
            </svg>
          </div>
        );

      case '3': // Camera & Lens Flare
        return (
          <div className="absolute left-1 bottom-1 w-8 h-8 pointer-events-none opacity-90">
            <svg viewBox="0 0 45 40" className="w-full h-full">
              <rect x="4" y="10" width="37" height="25" rx="5" fill="#c084fc" stroke="#581c87" strokeWidth="2" />
              <path d="M16 10 L19 5 H26 L29 10" fill="#e9d5ff" stroke="#581c87" strokeWidth="1.5" />
              <circle cx="22.5" cy="22.5" r="9.5" fill="#ec4899" stroke="#4c1d95" strokeWidth="2" />
              <circle cx="22.5" cy="22.5" r="5" fill="#ffffff" />
              <circle cx="34" cy="15" r="2" fill="#fde047" />
            </svg>
          </div>
        );

      case '4': // Map Pin & Dotted Path
        return (
          <div className="absolute left-1 bottom-0.5 w-8 h-10 pointer-events-none opacity-90">
            <svg viewBox="0 0 35 45" className="w-full h-full">
              <path d="M2 38 Q15 25 32 35" stroke="#60a5fa" strokeWidth="2" strokeDasharray="3 3" fill="none" />
              <path d="M17.5 4 A13 13 0 0 0 4.5 17 C4.5 27 17.5 42 17.5 42 C17.5 42 30.5 27 30.5 17 A13 13 0 0 0 17.5 4 Z" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="2" />
              <circle cx="17.5" cy="17" r="5" fill="#ffffff" />
            </svg>
          </div>
        );

      case '5': // Tropical Beach & Palm Tree
        return (
          <div className="absolute right-0 bottom-0 w-10 h-11 pointer-events-none opacity-90">
            <svg viewBox="0 0 50 50" className="w-full h-full">
              <path d="M0 40 Q25 33 50 42 L50 50 L0 50 Z" fill="#fef08a" opacity="0.9" />
              <path d="M35 48 C35 30 38 18 42 8" stroke="#78350f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M42 8 C30 3 18 10 18 10" stroke="#15803d" strokeWidth="3" fill="none" />
              <path d="M42 8 C50 2 54 12 54 12" stroke="#16a34a" strokeWidth="3" fill="none" />
              <circle cx="14" cy="12" r="7" fill="#f97316" opacity="0.9" />
              <path d="M0 45 Q12 40 25 45 Q37 40 50 45" stroke="#38bdf8" strokeWidth="2" fill="none" />
            </svg>
          </div>
        );

      case '6': // Camping Tent & Stars
        return (
          <div className="absolute left-1 bottom-0 w-9 h-9 pointer-events-none opacity-90">
            <svg viewBox="0 0 45 45" className="w-full h-full">
              <path d="M0 40 Q22 35 45 40" stroke="#10b981" strokeWidth="3" fill="none" />
              <polygon points="5,38 22,10 39,38" fill="#f59e0b" stroke="#92400e" strokeWidth="2" />
              <polygon points="15,38 22,22 29,38" fill="#78350f" />
              <circle cx="35" cy="10" r="1.5" fill="#fef08a" />
              <circle cx="10" cy="8" r="1.5" fill="#fef08a" />
            </svg>
          </div>
        );

      case '7': // Pine Forest Trees
        return (
          <div className="absolute left-0.5 bottom-0 w-9 h-10 pointer-events-none opacity-90">
            <svg viewBox="0 0 45 50" className="w-full h-full">
              <rect x="20" y="34" width="5" height="12" fill="#78350f" />
              <polygon points="22.5,4 6,24 15,24 4,36 41,36 30,24 39,24" fill="#10b981" stroke="#047857" strokeWidth="1.8" />
              <rect x="7" y="36" width="3" height="8" fill="#78350f" />
              <polygon points="8.5,18 0,34 17,34" fill="#34d399" opacity="0.8" />
            </svg>
          </div>
        );

      case '8': // Backpack
        return (
          <div className="absolute right-1 bottom-0.5 w-8 h-9 pointer-events-none opacity-90">
            <svg viewBox="0 0 40 45" className="w-full h-full">
              <rect x="6" y="10" width="28" height="30" rx="6" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" />
              <rect x="11" y="20" width="18" height="15" rx="3" fill="#60a5fa" stroke="#1e40af" strokeWidth="1.5" />
              <path d="M14 10 V5 A3 3 0 0 1 26 5 V10" fill="none" stroke="#1e3a8a" strokeWidth="2.5" />
            </svg>
          </div>
        );

      case '9': // Campfire
        return (
          <div className="absolute left-1.5 bottom-0.5 w-8 h-8 pointer-events-none opacity-90">
            <svg viewBox="0 0 40 40" className="w-full h-full">
              <line x1="5" y1="34" x2="35" y2="22" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
              <line x1="5" y1="22" x2="35" y2="34" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
              <path d="M20 30 C13 24 13 14 20 6 C27 14 27 24 20 30 Z" fill="#ef4444" />
              <path d="M20 28 C16 23 16 17 20 10 C24 17 24 23 20 28 Z" fill="#f59e0b" />
              <circle cx="28" cy="10" r="1.5" fill="#fbbf24" />
              <circle cx="12" cy="14" r="1.5" fill="#f97316" />
            </svg>
          </div>
        );

      case '10': // Trail Signpost
        return (
          <div className="absolute left-1 bottom-0 w-8 h-10 pointer-events-none opacity-90">
            <svg viewBox="0 0 40 50" className="w-full h-full">
              <rect x="18" y="10" width="4" height="36" fill="#78350f" />
              <polygon points="5,14 28,14 34,18 28,22 5,22" fill="#6366f1" stroke="#312e81" strokeWidth="1.8" />
              <polygon points="35,26 12,26 6,30 12,34 35,34" fill="#818cf8" stroke="#312e81" strokeWidth="1.8" />
            </svg>
          </div>
        );

      default:
        if (isExtraSeat) {
          return (
            <div className="absolute right-1 bottom-0.5 w-8 h-8 pointer-events-none opacity-90">
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <rect x="6" y="18" width="28" height="16" rx="4" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
                <line x1="10" y1="34" x2="5" y2="39" stroke="#78350f" strokeWidth="2.5" />
                <line x1="30" y1="34" x2="35" y2="39" stroke="#78350f" strokeWidth="2.5" />
                <path d="M10 18 V10 A5 5 0 0 1 30 10 V18" fill="none" stroke="#92400e" strokeWidth="2.5" />
              </svg>
            </div>
          );
        }
        return null;
    }
  };

  // Outer container styling based on status & tailored theme gradients
  const getContainerStyle = () => {
    if (isDriver || label === 'D') {
      return 'bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-900 text-white border-2 border-indigo-400/60 shadow-lg shadow-indigo-950/40';
    }

    if (isUser) {
      return 'bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 text-white border-2 border-amber-300 shadow-xl shadow-purple-600/40 ring-4 ring-amber-400/50 scale-[1.03] z-10';
    }

    if (isSelected) {
      return 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-2 border-purple-300 shadow-lg scale-[1.02] ring-2 ring-purple-400';
    }

    if (isStaff) {
      return 'bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-200 text-amber-950 border-2 border-amber-300 shadow-sm';
    }

    if (isBooked) {
      return 'bg-gradient-to-br from-purple-200/90 via-indigo-200/95 to-purple-300/90 text-purple-950 border-2 border-purple-400 shadow-sm';
    }

    if (isAvailable) {
      return 'bg-white/95 text-slate-800 border-2 border-purple-300/90 hover:border-purple-400 hover:shadow-md transition';
    }

    // Blocked
    return 'bg-slate-200/80 text-slate-400 border border-slate-300 opacity-60';
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isDriver || isBlocked}
      className={`relative w-full h-16 sm:h-20 rounded-2xl p-1 sm:p-1.5 flex flex-col items-center justify-center overflow-hidden select-none transition-all duration-300 group ${getContainerStyle()}`}
    >
      {/* Background Graphic Illustration — only for your own seat */}
      {isUser && renderThemeIllustration()}

      {/* Centered Stacked Seat Number & Passenger Name with Contrast Backdrop */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-0.5 text-center my-auto">
        {isUser && (
          <span className="bg-amber-400 text-amber-950 font-black text-[8px] sm:text-[9px] px-2 py-0.2 rounded-full uppercase tracking-tighter shadow-md mb-0.5 animate-pulse border border-amber-300">
            ของคุณ
          </span>
        )}
        {isStaff && !isUser && (
          <span className="bg-amber-500 text-white font-black text-[8px] px-1.5 py-0.2 rounded-full uppercase tracking-tighter shadow-sm mb-0.5">
            สตาฟ
          </span>
        )}

        {/* Large Seat Number (e.g. 1, 4, D) with crisp drop-shadow */}
        <span
          className={`font-black text-base sm:text-xl leading-none tracking-tight ${
            isDriver || label === 'D' || isUser || isSelected
              ? 'text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.8)]'
              : 'text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]'
          }`}
        >
          {label}
        </span>

        {/* Passenger Nickname / Status with High-Contrast Pill Tag */}
        {isDriver || label === 'D' ? (
          <span className="text-[10px] sm:text-xs font-black text-indigo-200 tracking-wider mt-0.5 drop-shadow">
            คนขับ
          </span>
        ) : passengerName ? (
          <span
            className={`mt-0.5 block truncate w-full text-center font-black text-xs sm:text-sm leading-tight ${
              isUser || isSelected ? 'text-white/90' : 'text-purple-950'
            }`}
          >
            {passengerName}
          </span>
        ) : isAvailable ? (
          <span className="inline-block text-[9.5px] sm:text-xs font-black text-purple-700 bg-purple-50/95 border border-purple-300 px-2 py-0.5 rounded-md mt-0.5 shadow-xs">
            ว่าง
          </span>
        ) : isBooked ? (
          <span className="inline-block text-[10px] font-bold text-slate-700 bg-white/90 px-2 py-0.5 rounded-md mt-0.5 border border-slate-200 shadow-xs">
            จองแล้ว
          </span>
        ) : (
          <span className="text-[9.5px] font-bold text-slate-400 line-through mt-0.5">ปิดรับ</span>
        )}
      </div>
    </button>
  );
}
