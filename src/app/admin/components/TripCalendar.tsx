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

export default function TripCalendar({ trips, vans }: { trips: Trip[]; vans: Van[] }) {
  const today = new Date();
  
  // Find the most relevant month to show initially (closest upcoming trip)
  const initialDate = useMemo(() => {
    if (!trips.length) return new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Parse all trip dates
    const parsedTrips = trips.map(t => ({ ...t, dateObj: parseTripDate(t.departureDate) })).filter(t => t.dateObj);
    if (!parsedTrips.length) return new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Sort by date
    parsedTrips.sort((a, b) => a.dateObj!.getTime() - b.dateObj!.getTime());
    
    // Find first upcoming trip, or fallback to the latest trip if all are in the past
    const upcoming = parsedTrips.find(t => t.dateObj! >= new Date(today.getFullYear(), today.getMonth(), 1));
    const targetTrip = upcoming || parsedTrips[parsedTrips.length - 1];
    
    return new Date(targetTrip.dateObj!.getFullYear(), targetTrip.dateObj!.getMonth(), 1);
  }, [trips]);

  const [currentDate, setCurrentDate] = useState(initialDate);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const monthName = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  // Map trips to dates
  const tripsByDate = useMemo(() => {
    const map = new Map<string, Trip[]>();
    trips.forEach(trip => {
      const d = parseTripDate(trip.departureDate);
      if (d) {
        // Normalize to YYYY-MM-DD local string
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const existing = map.get(dateKey) || [];
        existing.push(trip);
        map.set(dateKey, existing);
      }
    });
    return map;
  }, [trips]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  // Fill blanks for calendar
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
      <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-200 rounded-xl overflow-hidden">
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
          const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayTrips = tripsByDate.get(dateKey) || [];
          
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
              <div className="flex items-start justify-between mb-2">
                <span className={cn(
                  "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                  isToday ? "bg-violet-600 text-white shadow-sm" : "text-slate-700 group-hover:bg-slate-100"
                )}>
                  {day}
                </span>
                {dayTrips.length > 0 && (
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {dayTrips.length} ทริป
                  </span>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-1.5">
                {dayTrips.map((trip, i) => {
                  const tripVans = vans.filter(v => v.tripId === trip.id);
                  const seats = tripVans.flatMap(v => v.seats.filter(s => s.type === 'customer'));
                  const vacant = seats.filter(s => s.status === 'available').length;
                  
                  return (
                    <div 
                      key={trip.id} 
                      className="p-1.5 rounded-md border text-left bg-white border-slate-200 shadow-sm hover:border-violet-300 hover:shadow-md transition cursor-pointer"
                      title={`${trip.name} (${trip.departureTime} น.)`}
                    >
                      <div className="text-[10px] font-bold text-slate-800 truncate mb-0.5">
                        {trip.name}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-[9px] font-semibold text-slate-500 flex items-center gap-0.5">
                          <MapIcon className="w-2.5 h-2.5" />
                          {trip.departureTime}
                        </div>
                        <div className="text-[9px] font-bold text-violet-600 flex items-center gap-0.5 bg-violet-50 px-1 rounded">
                          <Users className="w-2.5 h-2.5" />
                          ว่าง {vacant}
                        </div>
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
  );
}
