'use client';
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Grid, MapPin, Clock, Users } from 'lucide-react';
import type { Trip, Van } from './types';

// ---- helpers ----
const parseTripDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = dateStr.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const parts = dateStr.split(' ');
  if (parts.length >= 3) {
    const d = parseInt(parts[0], 10);
    const m = months.findIndex(mo => parts[1].includes(mo));
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2500;
    if (y > 2400) y -= 543;
    if (!isNaN(d) && m !== -1 && !isNaN(y)) return new Date(y, m, d);
  }
  return null;
};

const toMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const COLORS = [
  { bg: '#7c3aed', hex: '#7c3aed', light: '#ede9fe' },
  { bg: '#0284c7', hex: '#0284c7', light: '#e0f2fe' },
  { bg: '#059669', hex: '#059669', light: '#d1fae5' },
  { bg: '#e11d48', hex: '#e11d48', light: '#ffe4e6' },
  { bg: '#d97706', hex: '#d97706', light: '#fef3c7' },
  { bg: '#0891b2', hex: '#0891b2', light: '#cffafe' },
];

interface ProcessedTrip {
  trip: Trip;
  startDate: Date;
  endDate: Date;
  colorIdx: number;
  vacant: number;
}

export default function TripCalendar({ trips, vans }: { trips: Trip[]; vans: Van[] }) {
  const today = toMidnight(new Date());
  const [view, setView] = useState<'month' | 'list'>('month');

  const initialDate = useMemo(() => {
    if (!trips.length) return new Date(today.getFullYear(), today.getMonth(), 1);
    const parsed = trips.map(t => parseTripDate(t.departureDate)).filter(Boolean) as Date[];
    parsed.sort((a, b) => a.getTime() - b.getTime());
    const upcoming = parsed.find(d => d >= new Date(today.getFullYear(), today.getMonth(), 1));
    const target = upcoming ?? parsed[parsed.length - 1];
    return new Date(target.getFullYear(), target.getMonth(), 1);
  }, [trips]);

  const [currentDate, setCurrentDate] = useState(initialDate);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToday   = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const monthName = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  const processedTrips = useMemo<ProcessedTrip[]>(() => {
    return trips.map((trip, idx) => {
      const start = parseTripDate(trip.departureDate);
      if (!start) return null;
      const end = new Date(start);
      end.setDate(start.getDate() + Math.max((trip.durationDays ?? 1) - 1, 0));
      const tripVans = vans.filter(v => v.tripId === trip.id);
      const seats = tripVans.flatMap(v => v.seats.filter(s => s.type === 'customer'));
      const vacant = seats.filter(s => s.status === 'available').length;
      return { trip, startDate: toMidnight(start), endDate: toMidnight(end), colorIdx: idx % COLORS.length, vacant };
    }).filter(Boolean) as ProcessedTrip[];
  }, [trips, vans]);

  // Sort for list view by start date ascending
  const sortedUpcoming = useMemo(() => {
    return [...processedTrips]
      .filter(pt => pt.endDate >= today)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [processedTrips]);

  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());
    const end = new Date(lastDay);
    end.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    const result: Date[][] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      result.push(week);
    }
    return result;
  }, [year, month]);

  const weekTrips = useMemo(() => {
    return weeks.map(week => {
      const weekStart = week[0];
      const weekEnd   = week[6];
      const rows: Array<{ trip: ProcessedTrip; startCol: number; endCol: number }> = [];
      processedTrips.forEach(pt => {
        if (pt.endDate < weekStart || pt.startDate > weekEnd) return;
        const startCol = pt.startDate < weekStart ? 0 : pt.startDate.getDay();
        const endCol   = pt.endDate   > weekEnd   ? 6 : pt.endDate.getDay();
        rows.push({ trip: pt, startCol, endCol });
      });
      return rows;
    });
  }, [weeks, processedTrips]);

  const DAY_HEADERS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 leading-tight">แพลนการเดินทาง</h3>
            <p className="text-[10px] text-slate-400 hidden sm:block">ตารางทริปทั้งหมดของระบบ</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* View toggle (mobile) */}
          <div className="flex sm:hidden bg-slate-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setView('month')}
              className={`p-1.5 rounded-md transition ${view === 'month' ? 'bg-white shadow-sm text-violet-600' : 'text-slate-400'}`}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition ${view === 'list' ? 'bg-white shadow-sm text-violet-600' : 'text-slate-400'}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={goToday}
            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition hidden sm:block"
          >
            วันนี้
          </button>
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-800 min-w-[100px] sm:min-w-[130px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-500">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── MOBILE: List View ── */}
      {view === 'list' && (
        <div className="sm:hidden divide-y divide-slate-100">
          {sortedUpcoming.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">ไม่มีทริปที่กำลังจะมาถึง</div>
          ) : (
            sortedUpcoming.map((pt, i) => {
              const c = COLORS[pt.colorIdx];
              const nights = (pt.trip.durationDays ?? 1) - 1;
              const durationLabel = nights > 0 ? `${pt.trip.durationDays} วัน ${nights} คืน` : 'ไปเช้าเย็นกลับ';
              return (
                <div key={pt.trip.id} className="flex items-stretch gap-0">
                  {/* Color stripe */}
                  <div className="w-1 shrink-0 rounded-l" style={{ backgroundColor: c.hex }} />
                  <div className="flex-1 px-4 py-3 flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-black"
                      style={{ backgroundColor: c.hex }}
                    >
                      {pt.startDate.getDate()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm leading-tight truncate">{pt.trip.name}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <CalendarIcon className="w-3 h-3" />
                          <span>{durationLabel}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{pt.trip.departureTime} น.</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <MapPin className="w-3 h-3" />
                          <span>{pt.trip.pickupPoint}</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-black text-violet-700">
                        ว่าง {pt.vacant}
                      </div>
                      <div className="text-[10px] text-slate-400">ที่นั่ง</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── MONTH Grid (desktop always, mobile when view=month) ── */}
      <div className={`${view === 'list' ? 'hidden sm:block' : 'block'}`}>
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAY_HEADERS.map((d, i) => (
            <div key={d} className={`py-2 text-center text-[11px] font-black tracking-wide
              ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-slate-400'}`}>
              {d}
            </div>
          ))}
        </div>

        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: 480 }}>
            {weeks.map((week, wi) => {
              const wt = weekTrips[wi];
              const rowMinH = 80 + wt.length * 22;
              return (
                <div key={wi} className="relative border-b border-slate-100 last:border-b-0">
                  <div className="grid grid-cols-7">
                    {week.map((day, di) => {
                      const isCurrentMonth = day.getMonth() === month;
                      const isToday = day.getTime() === today.getTime();
                      return (
                        <div
                          key={di}
                          style={{ minHeight: rowMinH }}
                          className={`relative border-r border-slate-100 last:border-r-0 px-1 sm:px-2 pt-2 pb-1
                            ${!isCurrentMonth ? 'bg-slate-50/60' : 'bg-white'}`}
                        >
                          <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold
                            ${isToday
                              ? 'bg-violet-600 text-white'
                              : isCurrentMonth
                                ? di === 0 ? 'text-rose-400' : di === 6 ? 'text-sky-400' : 'text-slate-700'
                                : 'text-slate-300'
                            }`}>
                            {day.getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Event bars */}
                  <div className="absolute left-0 right-0 pointer-events-none" style={{ top: 30 }}>
                    {wt.map(({ trip: pt, startCol, endCol }, ei) => {
                      const c = COLORS[pt.colorIdx];
                      const isStart = pt.startDate >= week[0];
                      const isEnd   = pt.endDate <= week[6];
                      const spanCols = endCol - startCol + 1;
                      const leftPct  = (startCol / 7) * 100;
                      const widthPct = (spanCols / 7) * 100;
                      return (
                        <div
                          key={`${pt.trip.id}-${wi}-${ei}`}
                          className="absolute pointer-events-auto cursor-pointer"
                          style={{
                            left: `calc(${leftPct}% + ${isStart ? 3 : 0}px)`,
                            width: `calc(${widthPct}% - ${(isStart ? 3 : 0) + (isEnd ? 3 : 0)}px)`,
                            top: ei * 23,
                            height: 20,
                          }}
                          title={`${pt.trip.name} • ${pt.trip.departureTime} น. • ว่าง ${pt.vacant} ที่`}
                        >
                          <div
                            className={`h-full flex items-center text-[10px] font-bold text-white overflow-hidden
                              ${isStart ? 'rounded-l-full pl-2' : 'pl-1'}
                              ${isEnd   ? 'rounded-r-full pr-1' : 'pr-0'}`}
                            style={{ backgroundColor: c.hex }}
                          >
                            {isStart && (
                              <span className="truncate leading-none">
                                {pt.trip.name}
                                <span className="ml-1 opacity-70 font-normal hidden sm:inline">· ว่าง {pt.vacant}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
