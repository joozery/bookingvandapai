'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { bangkokToday, calendarTrips, calendarWeeks, dayKey, monthDays, shiftMonth, type CalendarTrip } from '@/lib/tripCalendar';
import { formatThaiDate } from '@/lib/dateFormat';
import { tripMessengerUrl } from '@/lib/contact';
import { thaiHolidays, holidayLabel, holidayYears, type ThaiHoliday } from '@/lib/thaiHolidays';

const colors = [
  'bg-violet-100 text-violet-900 border-violet-300',
  'bg-emerald-100 text-emerald-900 border-emerald-300',
  'bg-orange-100 text-orange-900 border-orange-300',
  'bg-sky-100 text-sky-900 border-sky-300',
  'bg-rose-100 text-rose-900 border-rose-300',
  'bg-teal-100 text-teal-900 border-teal-300',
  'bg-amber-100 text-amber-900 border-amber-300',
];
const monthLabel = (month: string) => new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
const rangeLabel = (trip: { start: number; end: number }) => trip.start === trip.end
  ? formatThaiDate(dayKey(trip.start)) : `${formatThaiDate(dayKey(trip.start))} – ${formatThaiDate(dayKey(trip.end))}`;

export default function TripCalendar({ trips }: { trips: CalendarTrip[] }) {
  const [today, setToday] = useState('');
  const [month, setMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);
  const [holidayData, setHolidayData] = useState<{ holidays: ThaiHoliday[]; years: number[]; updatedAt: string | null; stale: boolean }>({ holidays: thaiHolidays, years: holidayYears, updatedAt: null, stale: true });
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
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  useEffect(() => {
    const date = bangkokToday();
    setToday(date);
    setMonth(date.slice(0, 7));
  }, []);
  const events = useMemo(() => calendarTrips(trips).map((trip, index) => ({ ...trip, color: colors[index % colors.length] })), [trips]);
  function choose(day: number, tripId: string | null = null) {
    setSelectedDay(day);
    setSelectedTrip(tripId);
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      detailRef.current?.focus({ preventScroll: true });
    });
  }
  function changeMonth(value: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value < '0100-01' || value > '9998-12') return;
    setMonth(value);
    setSelectedDay(null);
    setSelectedTrip(null);
  }
  const grid = month ? monthDays(month) : null;
  const monthEvents = grid ? events.filter(trip => trip.start <= grid.last && trip.end >= grid.first) : [];
  const shown = selectedDay === null ? monthEvents : monthEvents.filter(trip => trip.start <= selectedDay && trip.end >= selectedDay);
  const details = selectedTrip ? shown.filter(trip => trip.id === selectedTrip) : shown;

  return (
    <section id="trip-calendar" aria-labelledby="trip-calendar-title" className="scroll-mt-20 border-b border-slate-200 bg-slate-50 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="trip-calendar-title" className="flex items-center gap-2 text-lg sm:text-xl font-black text-slate-900"><CalendarDays className="w-5 h-5 text-violet-700" />ปฏิทินทริปประจำเดือน</h2>
            <p className="mt-1 text-xs text-slate-500">เลือกวันเพื่อดูทริปและรอบเดินทาง • รวมทริปที่เต็มแล้ว</p>
          </div>
          {month && <div className="flex flex-wrap items-center gap-2">
            <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => changeMonth(shiftMonth(month, -1))} className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-violet-50"><ChevronLeft className="w-4 h-4" /></button>
            <label className="sr-only" htmlFor="trip-calendar-month">เลือกเดือน</label>
            <input id="trip-calendar-month" type="month" min="0100-01" max="9998-12" value={month} onChange={e => changeMonth(e.target.value)} className="min-w-0 max-w-44 rounded-xl border border-slate-200 bg-white p-2 text-sm" />
            <button type="button" aria-label="เดือนถัดไป" onClick={() => changeMonth(shiftMonth(month, 1))} className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-violet-50"><ChevronRight className="w-4 h-4" /></button>
            <button type="button" onClick={() => changeMonth(bangkokToday().slice(0, 7))} className="p-2 text-xs font-bold text-violet-800">เดือนนี้</button>
          </div>}
        </div>
        {!grid ? <p role="status" className="text-sm text-slate-500">กำลังเตรียมปฏิทิน…</p> : <>
          <div className="flex items-center justify-between gap-2"><h3 className="font-bold text-violet-950" aria-live="polite">{monthLabel(month)}</h3><span className="text-xs text-slate-500">{monthEvents.length} รอบเดินทาง</span></div>
          <p className="text-xs text-rose-700">สีแดง: วันหยุดราชการ / วันหยุดชดเชย • กดวันที่เพื่ออ่านชื่อเต็ม</p>
          <p role="status" className="text-xs text-slate-500">
            {holidaysLoading ? 'กำลังอัปเดตวันหยุด…' : holidayData.stale ? 'ต้นทางวันหยุดไม่พร้อมใช้งาน กำลังแสดงข้อมูลสำรอง' : 'อัปเดตวันหยุดอัตโนมัติทุก 1 ชั่วโมงเมื่อใช้งาน'}
            {holidayData.updatedAt && <span> • ดึงข้อมูลล่าสุด {new Date(holidayData.updatedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</span>}
            {' • '}<a href="https://calendar.google.com/calendar/ical/th.th%23holiday%40group.v.calendar.google.com/public/basic.ics" className="underline" target="_blank" rel="noopener noreferrer">Google Calendar</a> และข้อมูลราชการที่ตรวจสอบแล้ว
          </p>
          {!holidaysLoading && !holidayData.years.includes(Number(month.slice(0, 4))) && <p role="status" className="text-xs text-slate-500">แหล่งข้อมูลยังไม่มีวันหยุดสำหรับปี {Number(month.slice(0, 4)) + 543}</p>}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="grid grid-cols-7 bg-violet-50 text-center text-xs font-bold text-violet-900">{['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map(day => <div key={day} className="py-3">{day}</div>)}</div>
            {calendarWeeks(month, monthEvents).map(week => {
              const visible = week.segments.filter(segment => segment.lane < 3);
              const rows = Math.max(1, ...visible.map(segment => segment.lane + 1));
              const hidden = week.segments.filter(segment => segment.lane >= 3);
              return <div key={week.days[0]} className="relative border-t border-slate-100">
                <div className="absolute inset-0 grid grid-cols-7 pointer-events-none" aria-hidden="true">
                  {week.days.map(day => <div key={day} className={`border-r border-slate-100 ${day < grid.first || day > grid.last ? 'bg-slate-50' : selectedDay === day ? 'bg-violet-50 ring-2 ring-inset ring-violet-400' : ''}`} />)}
                </div>
                <div className="relative grid grid-cols-7">
                  {week.days.map(day => {
                    if (day < grid.first || day > grid.last) return <div key={day} />;
                    const date = dayKey(day);
                    const holidays = holidaysOn(date);
                    const holidayText = holidays.map(holidayLabel).join(' • ');
                    const count = monthEvents.filter(trip => trip.start <= day && trip.end >= day).length;
                    return <button key={day} type="button" title={holidayText || undefined} aria-label={`${formatThaiDate(date)} ${holidayText} มี ${count} ทริป`} aria-pressed={selectedDay === day} aria-current={date === today ? 'date' : undefined} onClick={() => choose(day)} className={`m-1 min-w-0 min-h-9 rounded-lg px-0.5 py-1 text-xs sm:text-sm font-bold ${date === today ? 'bg-violet-700 text-white hover:bg-violet-800' : holidays.length ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'text-slate-700 hover:bg-violet-100'}`}>
                      {Number(date.slice(-2))}
                      {holidays.length > 0 && <span className="block text-[9px] sm:text-[10px] font-medium leading-snug mt-1"><span className="line-clamp-2 break-words">{holidays.map(holiday => holiday.name).join(' / ')}</span>{holidays.some(holiday => holiday.scope) && <span className="block underline">เฉพาะพื้นที่</span>}</span>}
                    </button>;
                  })}
                </div>
                <div className="relative grid grid-cols-7 gap-y-1 pb-2" style={{ gridTemplateRows: `repeat(${rows}, 30px)` }}>
                  {visible.map(segment => {
                    const trip = segment.event;
                    return <button key={trip.id} type="button" title={`${trip.name} • ${rangeLabel(trip)}`} aria-label={`${trip.name} รอบ ${rangeLabel(trip)}`} onClick={() => choose(segment.start, trip.id)}
                      style={{ gridColumn: `${segment.column} / span ${segment.span}`, gridRow: segment.lane + 1 }}
                      className={`min-w-0 mx-0.5 px-1 sm:px-2 text-left text-[10px] sm:text-xs font-semibold border-y flex items-center gap-1 hover:brightness-95 ${trip.color} ${segment.continuesBefore ? '' : 'rounded-l-md border-l-4'} ${segment.continuesAfter ? '' : 'rounded-r-md border-r'}`}>
                      {segment.continuesBefore && <span aria-hidden="true" className="shrink-0">‹</span>}
                      <span className="truncate">{trip.name}{Number(trip.availableSeats ?? 0) <= 0 && ' · เต็ม'}</span>
                      {segment.continuesAfter && <span aria-hidden="true" className="ml-auto shrink-0">›</span>}
                    </button>;
                  })}
                </div>
                {hidden.length > 0 && <div className="relative grid grid-cols-7 pb-1">
                  {week.days.map(day => {
                    const count = hidden.filter(segment => segment.start <= day && segment.end >= day).length;
                    return count > 0 ? <button key={day} type="button" onClick={() => choose(day)} aria-label={`ดูอีก ${count} ทริป วันที่ ${formatThaiDate(dayKey(day))}`} className="min-w-0 py-1 text-[10px] sm:text-xs font-bold text-violet-800">+{count}<span className="hidden sm:inline"> ทริป</span></button> : <div key={day} />;
                  })}
                </div>}
              </div>;
            })}
          </div>
          {selectedDay !== null && <div ref={detailRef} tabIndex={-1} className="scroll-mt-24 space-y-3 rounded-xl focus-visible:outline-2 focus-visible:outline-violet-500">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800" aria-live="polite">ทริปวันที่ {formatThaiDate(dayKey(selectedDay))}</h3>
              <button type="button" onClick={() => { setSelectedDay(null); setSelectedTrip(null); }} className="text-xs font-bold text-violet-700 py-2">ปิดรายละเอียด</button>
              {selectedTrip && <button type="button" onClick={() => setSelectedTrip(null)} className="text-xs font-bold text-violet-700 py-2">ดูทุกทริปในวันนี้ ({shown.length})</button>}
            </div>
            {holidaysOn(dayKey(selectedDay)).map(holiday => <p key={holiday.name} className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">{holidayLabel(holiday)}</p>)}
            {details.length === 0 ? <p className="rounded-xl bg-white border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">ไม่มีทริปในวันที่เลือก</p> : <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {details.map(trip => <article key={trip.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className={`rounded-lg border-l-4 px-3 py-2 ${trip.color}`}><h4 className="font-bold text-sm break-words">{trip.name}</h4><p className="text-xs mt-1">รอบ {rangeLabel(trip)}</p></div>
                <div className="text-xs text-slate-600 space-y-1.5">
                  <p>{trip.durationDays} วัน • <span className="font-bold">{Number(trip.availableSeats ?? 0) > 0 ? `ว่าง ${trip.availableSeats} ที่` : 'เต็ม'}</span></p>
                  <p>จุดขึ้นรถ: {trip.pickupPoint || 'ยังไม่ระบุ'}</p>
                  <p>เวลาออกเดินทาง: {trip.departureTime ? `${trip.departureTime} น.` : 'ยังไม่ระบุ'}</p>
                  {trip.guideName && <p>ไกด์: {trip.guideName}</p>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100"><span className="font-black text-violet-900">฿{Number(trip.cost || 0).toLocaleString('th-TH')} <span className="text-xs font-normal text-slate-500">/ ท่าน</span></span><a href={tripMessengerUrl(trip.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900 hover:bg-violet-100"><MessageSquare className="h-3.5 w-3.5" />{Number(trip.availableSeats ?? 0) > 0 ? 'ติดต่อจอง' : 'สอบถามแอดมิน'}</a></div>
              </article>)}
            </div>}
          </div>}
        </>}
      </div>
    </section>
  );
}
