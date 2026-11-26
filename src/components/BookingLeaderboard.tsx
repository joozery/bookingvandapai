'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Crown, Mountain, Users } from 'lucide-react';

type Person = { rank: number; nickname: string; pictureUrl?: string; tripCount: number };
type Leaderboard = { rankings: Person[]; total: number; page: number; pageCount: number };

function summaryStats(totalTrips: number, totalMembers: number | null) {
  return [
    { label: 'สมาชิกทั้งหมด', value: totalMembers === null ? '—' : totalMembers.toLocaleString('th-TH'), change: '+12%', icon: Users },
    { label: 'ทริปทั้งหมด', value: totalTrips.toLocaleString('th-TH'), change: '+33%', icon: CalendarDays },
  ];
}

function Avatar({ person, large = false }: { person: Person; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const size = large ? 'h-11 w-11 text-base' : 'h-9 w-9 text-sm';
  return person.pictureUrl && !failed ? <img src={person.pictureUrl} alt={person.nickname} onError={() => setFailed(true)} className={`${size} rounded-full border-2 border-white object-cover shadow-md`} /> : <span className={`flex ${size} items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-violet-500 to-fuchsia-500 font-black text-white shadow-md`}>{person.nickname.trim().charAt(0) || '?'}</span>;
}

function RankBadge({ rank }: { rank: number }) {
  const colors = rank === 1 ? 'from-amber-300 to-yellow-500 text-amber-950' : rank === 2 ? 'from-slate-200 to-slate-400 text-slate-700' : rank === 3 ? 'from-orange-300 to-orange-500 text-orange-950' : 'from-violet-100 to-purple-200 text-violet-700';
  return <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colors} text-xs font-black shadow-sm`}>{rank}</span>;
}

function MountainPeak({ person, maxTrips }: { person: Person; maxTrips: number }) {
  const height = Math.max(34, Math.round((person.tripCount / Math.max(maxTrips, 1)) * 100));
  const isLeader = person.rank === 1;
  const topColor = person.rank === 1 ? '#c4b5fd' : person.rank === 2 ? '#a5b4fc' : person.rank === 3 ? '#93c5fd' : person.rank === 4 ? '#bfdbfe' : '#dbeafe';
  const middleColor = person.rank === 1 ? '#8b5cf6' : person.rank === 2 ? '#6366f1' : person.rank === 3 ? '#4f46e5' : person.rank === 4 ? '#3b82f6' : '#60a5fa';
  const bottomColor = person.rank === 1 ? '#4c1d95' : person.rank === 2 ? '#3730a3' : person.rank === 3 ? '#312e81' : person.rank === 4 ? '#1d4ed8' : '#1e40af';
  return <div className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-3"><div className="relative flex h-56 w-full items-end justify-center"><div className={`relative h-full w-full origin-bottom transition-transform duration-300 group-hover:scale-[1.03] ${isLeader ? 'drop-shadow-[0_10px_15px_rgba(124,58,237,0.3)]' : ''}`} style={{ height: `${height}%` }}>{isLeader && <Crown aria-label="อันดับสูงสุด" className="absolute top-1 left-1/2 z-20 h-5 w-5 -translate-x-1/2 -rotate-6 fill-amber-300 text-amber-500" />}<svg viewBox="0 0 120 180" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" role="img" aria-label={`${person.nickname} ${person.tripCount} ทริป`}><defs><linearGradient id={`peak-${person.rank}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={topColor} /><stop offset="55%" stopColor={middleColor} /><stop offset="100%" stopColor={bottomColor} /></linearGradient></defs><path d="M 0 180 L 60 58 L 120 180 Z" fill={`url(#peak-${person.rank})`} /><path d="M 0 180 L 60 58 L 60 180 Z" fill="#ffffff" fillOpacity="0.12" /><path d="M 60 58 L 120 180 L 60 180 Z" fill="#2e1065" fillOpacity="0.16" /><path d="M 18 180 L 60 102 L 102 180" fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.5" /><path d="M 10 180 L 60 126 L 110 180" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1.5" /><path d="M 24 180 L 60 146 L 96 180" fill="none" stroke="#2e1065" strokeOpacity="0.16" strokeWidth="2" /><path d="M 0 180 L 60 58 L 120 180" fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="2" /></svg><span className={`absolute top-1 left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-white p-0.5 shadow-lg ${isLeader ? 'ring-2 ring-amber-300' : ''}`} title={`${person.tripCount} ทริป`}><Avatar person={person} /></span></div></div><span className="max-w-[92px] truncate text-xs font-bold text-slate-700">{person.nickname}</span></div>;
}

function MountainChart({ people, maxTrips }: { people: Person[]; maxTrips: number }) {
  const orderedPeople = [5, 3, 1, 2, 4].map(rank => people.find(person => person.rank === rank)).filter((person): person is Person => Boolean(person));
  return <div className="relative z-10 flex w-full items-end gap-0 overflow-hidden">{orderedPeople.map((person, index) => <div key={person.nickname} style={{ zIndex: person.rank === 1 ? 20 : index + 1 }} className={`relative min-w-0 flex-[0_0_27%] ${index > 0 ? '-ml-[8.75%]' : ''}`}><MountainPeak person={person} maxTrips={maxTrips} /></div>)}</div>;
}

export default function BookingLeaderboard({ title, totalTrips }: { title: string; totalTrips: number }) {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState('6 เดือนล่าสุด');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/leaderboard?page=1', { signal: controller.signal, cache: 'no-store' }).then(async response => { const result = await response.json(); if (!response.ok || !result.success) throw new Error('failed'); setData(result); }).catch(() => { if (!controller.signal.aborted) setError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const people = useMemo(() => (data?.rankings || []).slice(0, 5), [data]);
  const maxTrips = Math.max(...people.map(person => person.tripCount), 1);

  const stats = summaryStats(totalTrips, data?.total ?? null);
  return <section id="booking-leaderboard" aria-labelledby="leaderboard-title" className="mobile-performance-section relative overflow-hidden border-b border-purple-100 bg-[#fbf9ff] py-12 sm:py-16"><div className="relative mx-auto max-w-7xl space-y-7 px-4 sm:px-6 lg:px-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div className="flex items-center gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25"><Mountain className="h-7 w-7" /></div><div><p className="mb-1 text-[10px] font-bold tracking-[0.2em] text-violet-500">OUR TRAVEL COMMUNITY</p><h2 id="leaderboard-title" className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{title || 'สถิติคนมีป่า'} <span className="text-fuchsia-500">- ยอดนักเดินทาง</span></h2><p className="mt-1 text-sm text-slate-500">จัดอันดับตามจำนวนทริปที่ร่วมเดินป่า</p></div></div><label className="flex w-fit items-center gap-3 rounded-2xl border border-violet-100 bg-white/75 px-4 py-2.5 text-xs font-bold text-slate-500 shadow-sm"><span>ช่วงเวลา</span><select value={period} onChange={e => setPeriod(e.target.value)} className="rounded-lg border-0 bg-violet-50 px-2 py-1.5 font-black text-violet-800 outline-none"><option>6 เดือนล่าสุด</option><option>12 เดือนล่าสุด</option><option>ตลอดเวลา</option></select></label></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-2">{stats.map(stat => { const Icon = stat.icon; return <div key={stat.label} className="rounded-2xl border border-violet-100/80 bg-white/75 p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Icon className="h-4 w-4" /></span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-600">{stat.change}</span></div><p className="text-xl font-black text-slate-900 sm:text-2xl">{stat.value} <span className="text-xs font-bold text-slate-400">คน</span></p><p className="mt-1 text-xs font-semibold text-slate-500">{stat.label}</p></div>; })}</div>{loading ? <div className="rounded-3xl border border-violet-100 bg-white py-24 text-center text-sm font-bold text-violet-700">กำลังโหลดสถิตินักเดินทาง…</div> : error ? <div className="rounded-3xl border border-rose-100 bg-white py-16 text-center"><p className="text-sm font-bold text-rose-600">โหลดสถิติไม่สำเร็จ</p><button type="button" onClick={() => { setError(false); setLoading(true); setRetry(value => value + 1); }} className="mt-3 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white">ลองอีกครั้ง</button></div> : !people.length ? <div className="rounded-3xl border border-violet-100 bg-white py-16 text-center text-sm text-slate-500">ยังไม่มีข้อมูลสมาชิกที่ร่วมเดินป่า</div> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="overflow-hidden rounded-3xl border border-violet-100 bg-white/80 p-5 shadow-sm sm:p-7"><div className="mb-2 flex items-center justify-between"><div><h3 className="text-base font-black text-slate-900">การเดินทางของสมาชิก</h3><p className="mt-1 text-xs text-slate-500">ยอดภูเขาแทนจำนวนทริปของสมาชิก</p></div><span className="rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-bold text-violet-700">จำนวนทริป (ทริป)</span></div><div className="relative mt-7 flex items-end gap-2 border-b border-violet-100 pb-5 pt-5 sm:gap-5"><div className="absolute inset-x-0 bottom-5 top-5 flex flex-col justify-between opacity-60">{[12, 8, 4, 0].map(value => <div key={value} className="flex items-center gap-2 border-t border-dashed border-violet-100"><span className="w-5 text-[9px] font-bold text-slate-400">{value}</span><span className="h-px flex-1" /></div>)}</div><MountainChart people={people} maxTrips={maxTrips} /></div><div className="mt-4 text-[10px] text-slate-400">นับจากทริปที่สมาชิกเข้าร่วมกับกลุ่ม ไม่รวมยอดขายหรือสถิติทริป</div></div><aside className="rounded-3xl border border-violet-100 bg-white/85 p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="text-lg font-black text-slate-900">ยอดนักเดินทาง</h3><p className="mt-1 text-xs text-slate-500">Top 5 สมาชิกของชุมชน</p></div><Mountain className="h-5 w-5 text-violet-500" /></div><div className="space-y-2.5">{people.map(person => <div key={person.nickname} className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${person.rank === 1 ? 'bg-amber-50 ring-1 ring-amber-100' : 'bg-violet-50/60'}`}><RankBadge rank={person.rank} /><Avatar person={person} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-800">{person.nickname}</p><p className="text-[11px] font-semibold text-slate-400">อันดับ {person.rank}</p></div><p className="text-sm font-black text-violet-800">{person.tripCount} <span className="text-[10px] text-slate-400">ทริป</span></p></div>)}</div></aside></div>}</div></section>;
}
