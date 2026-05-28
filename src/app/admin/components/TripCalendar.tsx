import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Map as MapIcon, Users, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Trip, Van } from './types';

// Parse Thai dates or YYYY-MM-DD
const parseTripDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = dateStr.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }
  
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const parts = dateStr.split(' ');
  if (parts.length >= 3) {
    const d = parseInt(parts[0], 10);
    const m = months.findIndex(mo => parts[1].includes(mo));
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2500;
    if (y > 2400) y -= 543;
    if (!isNaN(d) && m !== -1 && !isNaN(y)) {
      return new Date(y, m, d);
    }
  }
  return null;
};

// Format YYYY-MM-DD key from a Date object
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Get end date from departure date + durationDays
const getTripEndDate = (trip: Trip): Date | null => {
  const start = parseTripDate(trip.departureDate);
  if (!start || !trip.durationDays) return start;
  const end = new Date(start);
  end.setDate(start.getDate() + (trip.durationDays - 1));
  return end;
};

export default function TripCalendar({ trips, vans }: { trips: Trip[]; vans: Van[] }) {
  const today = new Date();
  
  const initialDate = useMemo(() => {
    if (!trips.length) return new Date(today.getFullYear(), today.getMonth(), 1);
    const parsedTrips = trips.map(t => ({ ...t, dateObj: parseTripDate(t.departureDate) })).filter(t => t.dateObj);
    if (!parsedTrips.length) return new Date(today.getFullYear(), today.getMonth(), 1);
    parsedTrips.sort((a, b) => a.dateObj!.getTime() - b.dateObj!.getTime());
    const upcoming = parsedTrips.find(t => t.dateObj! >= new Date(today.getFullYear(), today.getMonth(), 1));
    const targetTrip = upcoming || parsedTrips[parsedTrips.length - 1];
    return new Date(targetTrip.dateObj!.getFullYear(), targetTrip.dateObj!.getMonth(), 1);
  }, [trips]);

  const [currentDate, setCurrentDate] = useState(initialDate);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const monthName = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  // Build a map: dateKey -> {trip, span info}
  // For each day a trip is active, we record it
  // For multi-day rendering: we mark "start", "middle", "end"
  const tripsByDate = useMemo(() => {
    // map: dateKey -> array of { trip, position: 'start' | 'middle' | 'end' | 'single', spanDays }
    const map = new Map<string, Array<{ trip: Trip; position: string; spanDays: number }>>();
    
    trips.forEach(trip => {
      const start = parseTripDate(trip.departureDate);
      if (!start) return;
      const end = getTripEndDate(trip);
      if (!end) return;

      const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
      const isSingle = totalDays <= 1;

      // Iterate each day of the trip
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = dateKey(d);
        const position = isSingle ? 'single' : i === 0 ? 'start' : i === totalDays - 1 ? 'end' : 'middle';
        const existing = map.get(key) || [];
        existing.push({ trip, position, spanDays: totalDays });
        map.set(key, existing);
      }
    });

    return map;
  }, [trips]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">แพลนการเดินทาง</h3>
            <p className="text-xs text-slate-500">ตารางทริปทั้งหมดของระบบ</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
            เดือนนี้
          </button>
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 text-slate-600 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-4 py-1.5 text-sm font-bold text-slate-800 min-w-[140px] text-center">
              {monthName}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 text-slate-600 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-slate-100">
        <div className="grid grid-cols-7 gap-px min-w-[700px]">
        {/* Day headers */}
        {['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'].map(day => (
          <div key={day} className="bg-slate-50 py-2.5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wide">
            {day}
          </div>
        ))}

        {/* Blank cells */}
        {blanks.map(b => (
          <div key={`blank-${b}`} className="bg-white/50 min-h-[100px] p-2" />
        ))}

        {/* Days */}
        {days.map(day => {
          const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEntries = tripsByDate.get(key) || [];
          // Count unique trips that START on this day (for the badge count)
          const startingTrips = dayEntries.filter(e => e.position === 'start' || e.position === 'single');
          
          const isToday = 
            day === today.getDate() && 
            currentDate.getMonth() === today.getMonth() && 
            currentDate.getFullYear() === today.getFullYear();

          return (
            <div 
              key={day} 
              className={cn(
                "bg-white min-h-[110px] p-2 border-t border-l border-slate-100 transition hover:bg-slate-50 group flex flex-col",
                isToday && "bg-violet-50/30"
              )}
            >
              <div className="flex items-start justify-between mb-1.5">
                <span className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                  isToday ? "bg-violet-600 text-white shadow-sm" : "text-slate-700 group-hover:bg-slate-100"
                )}>
                  {day}
                </span>
                {startingTrips.length > 0 && (
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {startingTrips.length} ทริป
                  </span>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-1">
                {dayEntries.map(({ trip, position }, i) => {
                  const tripVans = vans.filter(v => v.tripId === trip.id);
                  const seats = tripVans.flatMap(v => v.seats.filter(s => s.type === 'customer'));
                  const vacant = seats.filter(s => s.status === 'available').length;
                  
                  const isStart = position === 'start' || position === 'single';
                  const isEnd = position === 'end' || position === 'single';
                  const isMiddle = position === 'middle';

                  return (
                    <div
                      key={`${trip.id}-${i}`}
                      title={`${trip.name} (${trip.departureTime} น.)`}
                      className={cn(
                        "text-left overflow-hidden cursor-pointer transition",
                        // Color coding by position
                        isStart || position === 'single'
                          ? "bg-violet-100 border border-violet-300 text-violet-800 hover:bg-violet-200"
                          : "bg-violet-50 border-t border-b border-violet-200 text-violet-700",
                        // Rounding based on position
                        isStart && !isEnd && "rounded-l-md pl-1.5 pr-0",
                        isEnd && !isStart && "rounded-r-md pr-1.5 pl-0",
                        isMiddle && "rounded-none px-0",
                        (position === 'single') && "rounded-md px-1.5",
                      )}
                      style={{
                        marginLeft: isStart || position === 'single' ? undefined : '-2px',
                        marginRight: isEnd || position === 'single' ? undefined : '-2px',
                      }}
                    >
                      {/* Only show content on start day */}
                      {isStart ? (
                        <div className="p-1">
                          <div className="text-[10px] font-bold truncate mb-0.5">{trip.name}</div>
                          <div className="flex items-center justify-between">
                            <div className="text-[9px] font-semibold flex items-center gap-0.5 opacity-70">
                              <MapIcon className="w-2.5 h-2.5" />
                              {trip.departureTime}
                            </div>
                            <div className="text-[9px] font-bold flex items-center gap-0.5 bg-violet-200/60 px-1 rounded">
                              <Users className="w-2.5 h-2.5" />
                              ว่าง {vacant}
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Middle/end: just a thin colored bar
                        <div className="h-6 w-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-violet-100 border border-violet-300" />
          <span>วันออกเดินทาง</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-violet-50 border-t border-b border-violet-200" />
          <span>ระหว่างทริป</span>
        </div>
      </div>
    </div>
  );
}
