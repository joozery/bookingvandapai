'use client';

import { useState } from 'react';
import { Cake, ChevronLeft, ChevronRight } from 'lucide-react';
import type { UserRecord } from './UsersTab';

export function birthdayParts(value?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value || '');
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    ? { month: m - 1, day: d } : null;
}

export default function BirthdayCalendar({ users, onSelectUser }: {
  users: UserRecord[]; onSelectUser: (user: UserRecord) => void;
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const entries = users.flatMap(user => {
    const birthday = birthdayParts(user.birthDate);
    return birthday?.month === monthIndex ? [{ user, day: birthday.day }] : [];
  }).sort((a, b) => a.day - b.day || (a.user.nickname || a.user.fullName || '').localeCompare(b.user.nickname || b.user.fullName || '', 'th'));
  const missing = users.filter(user => !birthdayParts(user.birthDate)).length;
  const now = new Date();
  const move = (offset: number) => { setMonth(new Date(year, monthIndex + offset, 1)); setSelectedDay(null); };
  const monthLabel = month.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  const name = (user: UserRecord) => user.nickname || user.fullName || user.lineUserName || 'ไม่ระบุชื่อ';
  const listed = selectedDay === null ? entries : entries.filter(entry => entry.day === selectedDay);

  return <section className="rounded-2xl border border-purple-100 bg-white p-3 shadow-sm sm:p-5" aria-labelledby="birthday-heading">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 id="birthday-heading" className="flex items-center gap-2 font-black text-slate-800"><Cake className="h-5 w-5 text-purple-600" />ปฏิทินวันเกิดลูกทริป</h2>
        <p className="mt-1 text-xs text-slate-500">เดือนนี้ {entries.length} คน · ยังไม่มีข้อมูลวันเกิด {missing} คน</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="วันเกิดเดือนก่อนหน้า" onClick={() => move(-1)} className="rounded-lg border p-2 text-purple-700"><ChevronLeft className="h-4 w-4" /></button>
        <span aria-live="polite" className="min-w-28 text-center text-sm font-bold text-purple-900">{monthLabel}</span>
        <button type="button" aria-label="วันเกิดเดือนถัดไป" onClick={() => move(1)} className="rounded-lg border p-2 text-purple-700"><ChevronRight className="h-4 w-4" /></button>
        <button type="button" onClick={() => { setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDay(null); }} className="rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700">เดือนนี้</button>
      </div>
    </div>
    <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-purple-100">
      {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map(day => <div key={day} className="bg-purple-50 py-2 text-center text-xs font-bold text-purple-800">{day}</div>)}
      {Array.from({ length: Math.ceil((month.getDay() + days) / 7) * 7 }, (_, index) => {
        const day = index - month.getDay() + 1;
        if (day < 1 || day > days) return <div key={index} className="min-h-16 border-t border-purple-100 bg-slate-50 sm:min-h-24" />;
        const people = entries.filter(entry => entry.day === day);
        const today = year === now.getFullYear() && monthIndex === now.getMonth() && day === now.getDate();
        return <button type="button" key={index} onClick={() => setSelectedDay(day)} aria-pressed={selectedDay === day}
          aria-label={`${day} ${monthLabel} วันเกิด ${people.length} คน`}
          className={`min-h-16 min-w-0 border-t border-purple-100 p-1 text-left align-top hover:bg-purple-50 sm:min-h-24 sm:p-2 ${selectedDay === day ? 'bg-purple-100' : 'bg-white'}`}>
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${today ? 'bg-purple-600 text-white' : 'text-slate-700'}`}>{day}</span>
          {people.length > 0 && <><span className="mt-1 block text-[10px] font-bold text-purple-700">🎂 {people.length} คน</span><span className="hidden truncate text-xs text-slate-600 sm:block">{name(people[0].user)}</span></>}
        </button>;
      })}
    </div>
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm font-bold text-slate-700">
        <h3>{selectedDay === null ? 'วันเกิดในเดือนนี้' : `วันเกิดวันที่ ${selectedDay} ${monthLabel}`}</h3>
        {selectedDay !== null && <button type="button" className="text-xs text-purple-700 underline" onClick={() => setSelectedDay(null)}>ดูทั้งเดือน</button>}
      </div>
      {listed.length === 0 && <p className="py-3 text-xs text-slate-500">ไม่มีวันเกิดในช่วงที่เลือก</p>}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {listed.map(({ user, day }) => <button type="button" key={user.lineUserId} onClick={() => onSelectUser(user)} className="flex min-w-0 items-center gap-3 rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-left hover:bg-purple-100">
          <span className="shrink-0 rounded-lg bg-white p-2 text-sm font-black text-purple-700">{day}</span>
          <span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{name(user)}</span><span className="text-xs text-slate-500">ดูข้อมูลลูกทริป{day > days ? ' · เกิดวันที่ 29 ก.พ.' : ''}</span></span>
        </button>)}
      </div>
      {entries.some(entry => entry.day > days) && <p className="text-xs text-slate-500">ปีนี้ไม่มีวันที่ 29 กุมภาพันธ์ จึงแสดงรายชื่อผู้เกิดวันที่ 29 ในรายการแทน</p>}
    </div>
  </section>;
}
