'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, UserCheck, Bus, MapPin, Clock, Users, Link2, Check, Info } from 'lucide-react';
import { bangkokToday, calendarTrips, calendarWeeks, dayKey, monthDays, shiftMonth, type CalendarTrip } from '@/lib/tripCalendar';
import { formatThaiDate } from '@/lib/dateFormat';
import { thaiHolidays, holidayLabel, holidayYears, type ThaiHoliday } from '@/lib/thaiHolidays';
import { getTripTheme } from '@/lib/tripThemes';
import { cn } from '@/lib/utils';
import type { Trip, Van } from './types';

const rangeLabel = (trip: { start: number; end: number }) =>
  trip.start === trip.end
    ? formatThaiDate(dayKey(trip.start))
    : `${formatThaiDate(dayKey(trip.start))} – ${formatThaiDate(dayKey(trip.end))}`;

export default function TripCalendar({ trips, vans }: { trips: Trip[]; vans: Van[] }) {
  const [today, setToday] = useState('');
  const [month, setMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [holidayData, setHolidayData] = useState<{ holidays: ThaiHoliday[]; years: number[]; updatedAt: string | null; stale: boolean }>({
    holidays: thaiHolidays,
    years: holidayYears,
    updatedAt: null,
    stale: true,
  });
  const [holidaysLoading, setHolidaysLoading] = useState(true);

  const holidaysOn = (date: string) => holidayData.holidays.filter(holiday => holiday.date === date);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    async function refresh() {
      if (busy || controller.signal.aborted) return;
      busy = true;
      try {
        const response = await fetch('/api/holidays', { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.success || !Array.isArray(data.holidays) || !Array.isArray(data.years)) throw new Error('Holiday update failed');
        if (!controller.signal.aborted) setHolidayData(data);
      } catch {
        if (!controller.signal.aborted) setHolidayData(current => ({ ...current, stale: true }));
      } finally {
        busy = false;
        if (!controller.signal.aborted) setHolidaysLoading(false);
      }
    }
    void refresh();
    const timer = setInterval(refresh, 60 * 60 * 1000);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    const date = bangkokToday();
    setToday(date);
    setMonth(date.slice(0, 7));
  }, []);

  // Map trips to CalendarTrip format with guaranteed active status for admin calendar rendering
  const mappedTrips = useMemo<CalendarTrip[]>(() => {
    return trips.map(t => ({
      ...t,
      status: 'active', // treat as active so calendarTrips utility calculates date span correctly
    }));
  }, [trips]);

  const events = useMemo(() => {
    return calendarTrips(mappedTrips).map((trip, index) => ({
      ...trip,
      themeIndex: index,
    }));
  }, [mappedTrips]);

  function choose(day: number, tripId: string | null = null) {
    setSelectedDay(day);
    setSelectedTripId(tripId);
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      detailRef.current?.focus({ preventScroll: true });
    });
  }

  function changeMonth(value: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value < '0100-01' || value > '9998-12') return;
    setMonth(value);
    setSelectedDay(null);
    setSelectedTripId(null);
  }

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/?tripId=${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const grid = month ? monthDays(month) : null;
  const monthEvents = grid ? events.filter(trip => trip.start <= grid.last && trip.end >= grid.first) : [];
  const shown = selectedDay === null ? monthEvents : monthEvents.filter(trip => trip.start <= selectedDay && trip.end >= selectedDay);
  const details = selectedTripId ? shown.filter(trip => trip.id === selectedTripId) : shown;

  const monthLabel = (m: string) =>
    new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${m}-01T00:00:00Z`));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <section id="admin-trip-calendar" aria-labelledby="admin-calendar-title" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-5">
        
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 id="admin-calendar-title" className="flex items-center gap-2 text-base sm:text-lg font-black text-slate-800">
              <CalendarDays className="w-5 h-5 text-violet-600" />
              ปฏิทินการเดินทางและสตาฟ
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">ตารางทริปทั้งหมดของระบบ พร้อมข้อมูลสตาฟประจำทริปและสตาฟประจำรถ</p>
          </div>

          {month && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="เดือนก่อนหน้า"
                onClick={() => changeMonth(shiftMonth(month, -1))}
                className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <input
                id="admin-calendar-month"
                type="month"
                min="0100-01"
                max="9998-12"
                value={month}
                onChange={e => changeMonth(e.target.value)}
                className="min-w-0 max-w-44 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
              
              <button
                type="button"
                aria-label="เดือนถัดไป"
                onClick={() => changeMonth(shiftMonth(month, 1))}
                className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <button
                type="button"
                onClick={() => changeMonth(bangkokToday().slice(0, 7))}
                className="px-3 py-2 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition"
              >
                เดือนนี้
              </button>
            </div>
          )}
        </div>

        {!grid ? (
          <p role="status" className="text-sm text-slate-500 py-8 text-center">กำลังเตรียมปฏิทิน…</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">{monthLabel(month)}</h3>
              <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-100">{monthEvents.length} รอบเดินทาง</span>
            </div>
            
            <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              ข้อความสีแดง: วันหยุดราชการ / วันหยุดชดเชย · คลิกเลือกวันเพื่อดูรายละเอียดสตาฟและการเดินทาง
            </p>

            {!holidaysLoading && !holidayData.years.includes(Number(month.slice(0, 4))) && (
              <p role="status" className="text-xs text-slate-400">แหล่งข้อมูลยังไม่มีวันหยุดสำหรับปี {Number(month.slice(0, 4)) + 543}</p>
            )}

            {/* Calendar Grid Container */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-700">
                {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((day, idx) => (
                  <div key={day} className={cn("py-2.5", idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-sky-600' : '')}>
                    {day}
                  </div>
                ))}
              </div>

              {calendarWeeks(month, monthEvents).map(week => {
                const visible = week.segments.filter(segment => segment.lane < 3);
                const rows = Math.max(1, ...visible.map(segment => segment.lane + 1));
                const hidden = week.segments.filter(segment => segment.lane >= 3);

                return (
                  <div key={week.days[0]} className="relative border-t border-slate-100">
                    <div className="absolute inset-0 grid grid-cols-7 pointer-events-none" aria-hidden="true">
                      {week.days.map(day => (
                        <div
                          key={day}
                          className={cn(
                            "border-r border-slate-100 transition-colors",
                            day < grid.first || day > grid.last
                              ? 'bg-slate-50/70'
                              : selectedDay === day
                              ? 'bg-violet-50/60 ring-2 ring-inset ring-violet-400'
                              : ''
                          )}
                        />
                      ))}
                    </div>

                    <div className="relative grid grid-cols-7">
                      {week.days.map(day => {
                        if (day < grid.first || day > grid.last) return <div key={day} />;
                        const date = dayKey(day);
                        const holidays = holidaysOn(date);
                        const holidayText = holidays.map(holidayLabel).join(' • ');
                        const count = monthEvents.filter(trip => trip.start <= day && trip.end >= day).length;

                        return (
                          <button
                            key={day}
                            type="button"
                            title={holidayText || undefined}
                            aria-label={`${formatThaiDate(date)} ${holidayText} มี ${count} ทริป`}
                            aria-pressed={selectedDay === day}
                            aria-current={date === today ? 'date' : undefined}
                            onClick={() => choose(day)}
                            className={cn(
                              "m-1 min-w-0 min-h-9 rounded-lg px-1 py-1 text-xs sm:text-sm font-bold transition flex flex-col items-start justify-start",
                              date === today
                                ? 'bg-violet-600 text-white shadow-sm hover:bg-violet-700'
                                : holidays.length
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'text-slate-700 hover:bg-slate-100'
                            )}
                          >
                            <span>{Number(date.slice(-2))}</span>
                            {holidays.length > 0 && (
                              <span className="block text-[9px] sm:text-[10px] font-medium leading-tight mt-0.5 text-left">
                                <span className="line-clamp-2 break-words">{holidays.map(h => h.name).join(' / ')}</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Trip Segment Bars */}
                    <div className="relative grid grid-cols-7 gap-y-1 pb-2" style={{ gridTemplateRows: `repeat(${rows}, 30px)` }}>
                      {visible.map(segment => {
                        const trip = segment.event;
                        const theme = getTripTheme(trip.themeIndex);
                        const guide = trip.guideName?.trim();

                        return (
                          <button
                            key={trip.id}
                            type="button"
                            title={`${trip.name} • สตาฟ: ${guide || 'ยังไม่ระบุ'} • ${rangeLabel(trip)}`}
                            onClick={() => choose(segment.start, trip.id)}
                            style={{
                              gridColumn: `${segment.column} / span ${segment.span}`,
                              gridRow: segment.lane + 1,
                            }}
                            className={cn(
                              "min-w-0 mx-0.5 px-1.5 sm:px-2 text-left text-[10px] sm:text-xs font-bold border flex items-center gap-1 hover:brightness-95 transition shadow-2xs",
                              theme.vanBg,
                              theme.vanTitle,
                              segment.continuesBefore ? '' : 'rounded-l-md border-l-4 ' + theme.borderLeft,
                              segment.continuesAfter ? '' : 'rounded-r-md border-r'
                            )}
                          >
                            {segment.continuesBefore && <span aria-hidden="true" className="shrink-0 opacity-60">‹</span>}
                            <span className="truncate flex items-center gap-1 min-w-0">
                              <span className="truncate font-extrabold">{trip.name}</span>
                              <span className={cn("shrink-0 px-1 py-0.2 text-[9px] font-semibold rounded bg-white/60 border border-slate-200/60 hidden sm:inline-block", theme.labelColor)}>
                                👤 {guide || 'ไม่ระบุสตาฟ'}
                              </span>
                            </span>
                            {segment.continuesAfter && <span aria-hidden="true" className="ml-auto shrink-0 opacity-60">›</span>}
                          </button>
                        );
                      })}
                    </div>

                    {hidden.length > 0 && (
                      <div className="relative grid grid-cols-7 pb-1">
                        {week.days.map(day => {
                          const count = hidden.filter(segment => segment.start <= day && segment.end >= day).length;
                          return count > 0 ? (
                            <button
                              key={day}
                              type="button"
                              onClick={() => choose(day)}
                              className="min-w-0 py-0.5 text-[10px] sm:text-xs font-bold text-violet-700 hover:underline"
                            >
                              +{count}<span className="hidden sm:inline"> ทริป</span>
                            </button>
                          ) : (
                            <div key={day} />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Day / Trip Details Drawer */}
            {selectedDay !== null && (
              <div
                ref={detailRef}
                tabIndex={-1}
                className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 animate-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-violet-600" />
                    ทริปวันที่ {formatThaiDate(dayKey(selectedDay))}
                  </h3>
                  <div className="flex items-center gap-2">
                    {selectedTripId && (
                      <button
                        type="button"
                        onClick={() => setSelectedTripId(null)}
                        className="text-xs font-bold text-violet-700 hover:underline px-2 py-1"
                      >
                        ดูทุกทริปในวันนี้ ({shown.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDay(null);
                        setSelectedTripId(null);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-2xs"
                    >
                      ปิดรายละเอียด
                    </button>
                  </div>
                </div>

                {holidaysOn(dayKey(selectedDay)).map(holiday => (
                  <p key={holiday.name} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-800">
                    {holidayLabel(holiday)}
                  </p>
                ))}

                {details.length === 0 ? (
                  <p className="rounded-xl bg-white border border-dashed border-slate-200 p-8 text-center text-xs font-bold text-slate-400">
                    ไม่มีรายการทริปในวันที่เลือก
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {details.map(trip => {
                      const theme = getTripTheme(trip.themeIndex);
                      const tripVans = vans.filter(v => v.tripId === trip.id).sort((a, b) => a.vanNumber - b.vanNumber);
                      const totalSeats = tripVans.flatMap(v => v.seats.filter(s => s.type === 'customer' || s.type === 'staff')).length;
                      const occupiedSeats = tripVans.flatMap(v => v.seats.filter(s => (s.type === 'customer' || s.type === 'staff') && s.status !== 'available')).length;
                      const vacantSeats = totalSeats - occupiedSeats;

                      return (
                        <article key={trip.id} className={cn("rounded-2xl border bg-white p-4 space-y-3.5 shadow-sm border-l-4 transition hover:shadow-md", theme.borderLeft)}>
                          {/* Header info */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className={cn("font-black text-sm leading-snug flex items-center gap-2", theme.titleColor)}>
                                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", theme.dotBg)} />
                                <span>{trip.name}</span>
                              </h4>
                              <p className="text-xs text-slate-500 font-semibold mt-1">รอบ {rangeLabel(trip)}</p>
                            </div>
                            <span className={cn("text-xs font-black tracking-tight shrink-0 px-2.5 py-1 rounded-lg border shadow-2xs", theme.badgeBg)}>
                              ฿{Number(trip.cost || 0).toLocaleString('th-TH')}
                            </span>
                          </div>

                          {/* Staff Details Section */}
                          <div className={cn("p-3 rounded-xl border text-xs space-y-2.5", theme.boxBg)}>
                            <div className="flex items-center gap-2">
                              <UserCheck className={cn("w-4 h-4 shrink-0", theme.iconColor)} />
                              <span className={cn("font-bold", theme.labelColor)}>สตาฟประจำทริป:</span>
                              <span className={cn("px-2 py-0.5 rounded-md text-xs font-extrabold border shadow-2xs", theme.badgeBg)}>
                                {trip.guideName?.trim() || 'ยังไม่ระบุสตาฟ'}
                              </span>
                            </div>

                            {tripVans.length > 0 ? (
                              <div className="border-t border-slate-200/60 pt-2 space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">สตาฟประจำรถ:</span>
                                <div className="space-y-1">
                                  {tripVans.map(van => {
                                    const vanStaff = [...new Set(van.seats.filter(s => s.type === 'staff').map(s => s.staffName?.trim() || s.passengerName?.trim()).filter(Boolean))];
                                    return (
                                      <div key={van.id} className={cn("px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between border", theme.vanBg)}>
                                        <span className={cn("font-bold shrink-0", theme.vanTitle)}>รถคันที่ {van.vanNumber}</span>
                                        <span className="text-slate-700 font-semibold text-right break-words">{vanStaff.length ? vanStaff.join(', ') : 'ยังไม่ระบุสตาฟ'}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">ยังไม่มีรถในทริปนี้</p>
                            )}
                          </div>

                          {/* Details & Vacancy */}
                          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="font-medium">ออก {trip.departureTime ? `${trip.departureTime} น.` : 'ยังไม่ระบุ'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="font-medium truncate">{trip.pickupPoint || 'ยังไม่ระบุ'}</span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-medium">สถานะที่นั่ง:</span>
                              <span className="font-bold text-slate-700">
                                ว่าง <strong className={vacantSeats === 0 ? 'text-rose-600' : 'text-emerald-600'}>{vacantSeats}</strong>/{totalSeats} ที่
                              </span>
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => copyLink(trip.id)}
                              className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition",
                                copiedId === trip.id ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : theme.shareBtn
                              )}
                            >
                              {copiedId === trip.id ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                              <span>{copiedId === trip.id ? 'คัดลอกแล้ว' : 'แชร์ลิ้งก์'}</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
