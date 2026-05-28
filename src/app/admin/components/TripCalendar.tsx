import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
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

// Color palette for trips
const COLORS = [
  { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-900', border: 'border-violet-300' },
  { bg: 'bg-sky-500',    light: 'bg-sky-100',    text: 'text-sky-900',    border: 'border-sky-300'    },
  { bg: 'bg-emerald-500',light: 'bg-emerald-100',text: 'text-emerald-900',border: 'border-emerald-300'},
  { bg: 'bg-rose-500',   light: 'bg-rose-100',   text: 'text-rose-900',   border: 'border-rose-300'   },
  { bg: 'bg-amber-500',  light: 'bg-amber-100',  text: 'text-amber-900',  border: 'border-amber-300'  },
  { bg: 'bg-cyan-500',   light: 'bg-cyan-100',   text: 'text-cyan-900',   border: 'border-cyan-300'   },
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

  // Pre-process all trips
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

  // Build weeks: each week is an array of 7 Date objects (Sunday-Saturday)
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    // start from the Sunday of the first week
    const start = new Date(firstDay);
    start.setDate(firstDay.getDate() - firstDay.getDay());
    // end on the Saturday of the last week
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

  // For each week, compute which trips appear and their span within that week
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
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 leading-tight">แพลนการเดินทาง</h3>
            <p className="text-[11px] text-slate-400">ตารางทริปทั้งหมดของระบบ</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition"
          >
            วันนี้
          </button>
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-slate-800 min-w-[130px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-600">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Day-of-week headers ── */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAY_HEADERS.map((d, i) => (
          <div key={d} className={`py-2 text-center text-[11px] font-black tracking-wide ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-slate-400'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* ── Weeks ── */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: 700 }}>
          {weeks.map((week, wi) => {
            const wt = weekTrips[wi];
            // Height: base row height + extra per trip row
            const eventRows = wt.length;
            const rowMinH = 90 + eventRows * 22;

            return (
              <div key={wi} className="relative border-b border-slate-100 last:border-b-0">
                {/* Date numbers row */}
                <div className="grid grid-cols-7">
                  {week.map((day, di) => {
                    const isCurrentMonth = day.getMonth() === month;
                    const isToday = day.getTime() === today.getTime();
                    return (
                      <div
                        key={di}
                        style={{ minHeight: rowMinH }}
                        className={`relative border-r border-slate-100 last:border-r-0 px-2 pt-2 pb-1
                          ${!isCurrentMonth ? 'bg-slate-50/60' : 'bg-white'}
                          ${di === 0 ? 'border-l border-slate-100' : ''}
                        `}
                      >
                        <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold
                          ${isToday ? 'bg-violet-600 text-white' : isCurrentMonth ? (di === 0 ? 'text-rose-400' : di === 6 ? 'text-sky-400' : 'text-slate-700') : 'text-slate-300'}
                        `}>
                          {day.getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Event bars (absolutely positioned over the row) */}
                <div className="absolute left-0 right-0 pointer-events-none" style={{ top: 30 }}>
                  {wt.map(({ trip: pt, startCol, endCol }, ei) => {
                    const col = COLORS[pt.colorIdx];
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
                          left: `calc(${leftPct}% + ${isStart ? 4 : 0}px)`,
                          width: `calc(${widthPct}% - ${(isStart ? 4 : 0) + (isEnd ? 4 : 0)}px)`,
                          top: ei * 24,
                          height: 20,
                        }}
                        title={`${pt.trip.name} • ${pt.trip.departureTime} น. • ว่าง ${pt.vacant} ที่`}
                      >
                        <div className={`h-full flex items-center text-[10px] font-bold text-white overflow-hidden
                          ${col.bg}
                          ${isStart ? 'rounded-l-full pl-2' : 'pl-1'}
                          ${isEnd   ? 'rounded-r-full pr-2' : 'pr-0'}
                        `}>
                          {isStart && (
                            <span className="truncate">
                              {pt.trip.name}
                              <span className="ml-1 opacity-70 font-normal">· ว่าง {pt.vacant}</span>
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
  );
}
