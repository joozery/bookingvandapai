'use client';

import React from 'react';
import { Bus, Users, Check, TrendingUp, ChevronRight, QrCode } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Trip, Van, Booking } from './types';

interface Props {
  trips: Trip[];
  vans: Van[];
  bookings: Booking[];
}

import TripCalendar from './TripCalendar';

export default function DashboardOverview({ trips, vans, bookings }: Props) {
  const approved = bookings.filter(b => b.status === 'approved').length;
  const pending  = bookings.filter(b => b.status === 'pending').length;
  const rejected = bookings.filter(b => b.status === 'rejected').length;
  const total    = bookings.length;

  // Seat vacancy
  const allCustomerSeats = vans.flatMap(v => v.seats.filter(s => s.type === 'customer'));
  const vacantSeats = allCustomerSeats.filter(s => s.status === 'available').length;

  // Top trips by bookings
  const tripBookingCounts = trips.map(t => ({
    trip: t,
    count: bookings.filter(b => b.tripId === t.id).length,
  })).sort((a, b) => b.count - a.count).slice(0, 3);

  // Donut percentages
  const pctApproved = total > 0 ? Math.round((approved / total) * 100) : 0;
  const pctPending  = total > 0 ? Math.round((pending / total) * 100) : 0;

  // Today check-ins
  const todayStr = new Date().toDateString();
  const todayCheckIns = bookings.filter(b => b.checkedIn && b.checkedInAt && new Date(b.checkedInAt).toDateString() === todayStr);



  // Donut SVG
  const DonutChart = () => {
    const r = 40, cx = 50, cy = 50, circumference = 2 * Math.PI * r;
    const gapDeg = 3;
    const segments = [
      { pct: approved / Math.max(total, 1), color: '#10b981' }, // emerald
      { pct: pending  / Math.max(total, 1), color: '#f59e0b' }, // amber
      { pct: rejected / Math.max(total, 1), color: '#f43f5e' }, // rose
    ];
    let offset = 0;
    const paths = segments.map((s, i) => {
      const dash = Math.max(0, s.pct * circumference - (gapDeg / 360) * circumference);
      const gap  = circumference - dash;
      const path = (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="12"
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={-offset * circumference}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dasharray 0.5s' }}
        />
      );
      offset += s.pct;
      return path;
    });
    return (
      <svg viewBox="0 0 100 100" className="w-28 h-28">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        <g style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }}>
          {paths}
        </g>
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1e293b">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="5" fill="#94a3b8">ทั้งหมด</text>
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Donut: Booking by status ─────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">การจองตามสถานะ</h3>
          <div className="flex items-center gap-6">
            <DonutChart />
            <div className="space-y-2.5 flex-1">
              {[
                { label: 'ยืนยันแล้ว', count: approved, pct: pctApproved, color: 'bg-emerald-500' },
                { label: 'รออนุมัติ',  count: pending,  pct: pctPending,  color: 'bg-amber-400'  },
                { label: 'ยกเลิก',     count: rejected, pct: 0,           color: 'bg-rose-500'   },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', s.color)} />
                    <span className="text-[11px] text-slate-600 font-semibold">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-slate-800">{s.count}</span>
                    <span className="text-[9px] text-slate-400">({s.pct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Top trips by booking count ────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">ทริปที่มีผู้จองมากที่สุด</h3>
            <Link href="/admin/trips" className="text-[10px] text-violet-600 font-bold hover:underline flex items-center gap-0.5">ดูทั้งหมด <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {tripBookingCounts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">ยังไม่มีข้อมูลทริป</p>
          ) : (
            <div className="space-y-3">
              {tripBookingCounts.map((item, i) => {
                const tripVans = vans.filter(v => v.tripId === item.trip.id);
                const seats = tripVans.flatMap(v => v.seats.filter(s => s.type === 'customer'));
                const vacant = seats.filter(s => s.status === 'available').length;
                return (
                  <div key={item.trip.id} className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5',
                        i === 0 ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500')}>
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-700 truncate">{item.trip.name}</div>
                        <div className="text-[10px] text-slate-400">{item.trip.departureDate}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full shrink-0">
                      {item.count} ที่
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Today check-in ────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">การเช็คอินวันนี้</h3>
            <Link href="/admin/checkin" className="text-[10px] text-violet-600 font-bold hover:underline flex items-center gap-0.5">ดูทั้งหมด <ChevronRight className="w-3 h-3" /></Link>
          </div>
          {todayCheckIns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-300">
              <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                <QrCode className="w-7 h-7 text-slate-300" />
              </div>
              <p className="text-xs font-semibold text-slate-400 text-center">ยังไม่มีการเช็คอินวันนี้</p>
              <p className="text-[10px] text-slate-300 mt-0.5">เริ่มเช็คอินได้ตั้งแต่ 06:00 น.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayCheckIns.slice(0, 4).map(b => (
                <div key={b.id} className="flex items-center gap-2.5 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <img src={b.lineUserProfilePic} alt="" className="w-7 h-7 rounded-full object-cover border border-emerald-200 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-slate-700 truncate">{b.fullName} ({b.nickname})</div>
                    <div className="text-[9px] text-emerald-600 font-semibold">เบาะ {b.seatLabel} · เช็คอินแล้ว</div>
                  </div>
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </div>
              ))}
              {todayCheckIns.length > 4 && (
                <p className="text-[10px] text-slate-400 text-center">+{todayCheckIns.length - 4} รายการอื่น</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Trip Calendar View ────────────────────────────────────────── */}
      <TripCalendar trips={trips} vans={vans} />
    </div>
  );
}
