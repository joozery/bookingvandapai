'use client';
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { Trip, Van } from './types';

// ── helpers ──────────────────────────────────────────────
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
const fmtShort = (d: Date) =>
  d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

const COLORS = [
  { dot: '#7c3aed', hatch: 'rgba(124,58,237,0.10)' },
  { dot: '#0284c7', hatch: 'rgba(2,132,199,0.10)'  },
  { dot: '#059669', hatch: 'rgba(5,150,105,0.10)'  },
  { dot: '#e11d48', hatch: 'rgba(225,29,72,0.10)'  },
  { dot: '#d97706', hatch: 'rgba(217,119,6,0.10)'  },
  { dot: '#0891b2', hatch: 'rgba(8,145,178,0.10)'  },
];

interface ProcessedTrip {
  trip: Trip; startDate: Date; endDate: Date; colorIdx: number; vacant: number;
}

// ── Component ─────────────────────────────────────────────
export default function TripCalendar({ trips, vans }: { trips: Trip[]; vans: Van[] }) {
  const today = toMidnight(new Date());

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

  // Build weeks
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const start = new Date(firstDay); start.setDate(firstDay.getDate() - firstDay.getDay());
    const end   = new Date(lastDay);  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    const result: Date[][] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
      result.push(week);
    }
    return result;
  }, [year, month]);

  // For each week, compute events that appear
  const weekEvents = useMemo(() => {
    return weeks.map(week => {
      const ws = week[0], we = week[6];
      return processedTrips
        .filter(pt => pt.endDate >= ws && pt.startDate <= we)
        .map(pt => {
          const startCol = pt.startDate < ws ? 0 : pt.startDate.getDay();
          const endCol   = pt.endDate   > we ? 6 : pt.endDate.getDay();
          const isStart  = pt.startDate >= ws;
          const isEnd    = pt.endDate   <= we;
          return { pt, startCol, endCol, isStart, isEnd };
        });
    });
  }, [weeks, processedTrips]);

  const DAY_HEADERS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div className="bg-[#fafaf8] border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <CalendarIcon className="w-4.5 h-4.5 text-amber-500" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">แพลนการเดินทาง</h3>
            <p className="text-[10px] text-slate-400 hidden sm:block">ตารางทริปทั้งหมดของระบบ</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={goToday} className="hidden sm:block px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition">
            วันนี้
          </button>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-slate-800 min-w-[110px] sm:min-w-[130px] text-center">{monthName}</span>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable calendar body */}
      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: 380 }}>
          {/* Day headers */}
          <div className="grid grid-cols-7 px-2 sm:px-3 pt-3 pb-1 gap-1 sm:gap-2">
            {DAY_HEADERS.map((d, i) => (
              <div key={d} className={`text-center text-[10px] sm:text-xs font-black tracking-wide py-1
                ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-slate-400'}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => {
            const events = weekEvents[wi];
            return (
              <div key={wi} className="px-2 sm:px-3 pb-2 sm:pb-3">
                {/* Day cells row */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
                  {week.map((day, di) => {
                    const isCurrentMonth = day.getMonth() === month;
                    const isToday = day.getTime() === today.getTime();
                    const isSat = di === 6;
                    const isSun = di === 0;

                    // Hatching for out-of-month
                    const cellStyle: React.CSSProperties = !isCurrentMonth ? {
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 7px)',
                    } : {};

                    return (
                      <div
                        key={di}
                        style={{ ...cellStyle, ...(isToday ? { backgroundColor: '#FDE047' } : {}) }}
                        className={`aspect-square sm:aspect-auto sm:min-h-[56px] rounded-xl flex flex-col items-start justify-start p-1.5 sm:p-2 transition
                          ${isCurrentMonth && !isToday ? 'bg-white hover:bg-slate-50' : ''}
                          ${!isCurrentMonth ? 'bg-slate-100/60' : ''}
                          ${isToday ? 'shadow-sm' : 'border border-slate-100'}
                        `}
                      >
                        <span className={`text-[11px] sm:text-xs font-bold leading-none
                          ${isToday ? 'text-slate-800' : isCurrentMonth ? isSun ? 'text-rose-400' : isSat ? 'text-sky-500' : 'text-slate-700' : 'text-slate-300'}
                        `}>
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Event rows */}
                {events.map(({ pt, startCol, endCol, isStart, isEnd }, ei) => {
                  const c = COLORS[pt.colorIdx];
                  const spanCols = endCol - startCol + 1;
                  // The event row is laid out using CSS grid trick
                  return (
                    <div
                      key={`${pt.trip.id}-${wi}-${ei}`}
                      className="grid grid-cols-7 gap-1 sm:gap-2 mb-1"
                      title={`${pt.trip.name} • ว่าง ${pt.vacant} ที่`}
                    >
                      {/* Empty cols before event */}
                      {Array.from({ length: startCol }).map((_, i) => (
                        <div key={i} />
                      ))}

                      {/* Event pill spanning multiple cols */}
                      <div
                        className="rounded-xl overflow-hidden flex items-center px-2 cursor-pointer"
                        style={{
                          gridColumn: `span ${spanCols}`,
                          height: 26,
                          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, ${c.hatch} 4px, ${c.hatch} 8px)`,
                          backgroundColor: c.hatch,
                          borderRadius: isStart && isEnd ? 8 : isStart ? '8px 0 0 8px' : isEnd ? '0 8px 8px 0' : 0,
                        }}
                      >
                        {isStart && (
                          <>
                            <span
                              className="w-2 h-2 rounded-full shrink-0 mr-1.5"
                              style={{ backgroundColor: c.dot, minWidth: 8 }}
                            />
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 truncate flex-1">
                              {pt.trip.name}
                            </span>
                          </>
                        )}
                        {isEnd && isStart && (
                          <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 shrink-0 ml-1 hidden sm:block">
                            {fmtShort(pt.startDate)} – {fmtShort(pt.endDate)}
                          </span>
                        )}
                      </div>

                      {/* Empty cols after event */}
                      {Array.from({ length: 6 - endCol }).map((_, i) => (
                        <div key={i} />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
