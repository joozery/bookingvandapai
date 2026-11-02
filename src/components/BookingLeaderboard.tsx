'use client';

import { useEffect, useState } from 'react';
import { Trophy, ChevronLeft, ChevronRight, BarChart2, Sparkles, Users } from 'lucide-react';

type Leaderboard = {
  rankings: { rank: number; nickname: string; pictureUrl?: string; tripCount: number }[];
  total: number;
  page: number;
  pageCount: number;
};

const EMOJI_ANIMATIONS = [
  { icon: '✈️', anim: 'animate-[bounce_1.4s_ease-in-out_infinite] hover:scale-125' },
  { icon: '🧳', anim: 'animate-[bounce_1.8s_ease-in-out_infinite] hover:scale-125' },
  { icon: '🌴', anim: 'animate-[pulse_1.6s_ease-in-out_infinite] hover:scale-125' },
  { icon: '🏔️', anim: 'animate-[bounce_2s_ease-in-out_infinite] hover:scale-125' },
  { icon: '🗺️', anim: 'animate-[pulse_1.8s_ease-in-out_infinite] hover:scale-125' },
  { icon: '📷', anim: 'animate-[bounce_1.5s_ease-in-out_infinite] hover:scale-125' },
  { icon: '☀️', anim: 'animate-[spin_5s_linear_infinite] hover:scale-125' },
  { icon: '⛺', anim: 'animate-[bounce_2.2s_ease-in-out_infinite] hover:scale-125' },
  { icon: '🎈', anim: 'animate-[bounce_1.7s_ease-in-out_infinite] hover:scale-125' },
  { icon: '🌴', anim: 'animate-[pulse_2s_ease-in-out_infinite] hover:scale-125' },
];

const ROW_GRADIENTS = [
  'bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500 shadow-amber-500/20',
  'bg-gradient-to-r from-blue-400 via-sky-500 to-indigo-500 shadow-blue-500/20',
  'bg-gradient-to-r from-pink-400 via-rose-500 to-purple-500 shadow-pink-500/20',
  'bg-gradient-to-r from-indigo-400 to-blue-500',
  'bg-gradient-to-r from-emerald-400 to-green-500',
  'bg-gradient-to-r from-amber-300 to-yellow-500',
  'bg-gradient-to-r from-purple-400 to-fuchsia-500',
  'bg-gradient-to-r from-cyan-400 to-teal-500',
  'bg-gradient-to-r from-violet-400 to-purple-500',
  'bg-gradient-to-r from-rose-400 to-pink-500',
];

const ROW_BACKGROUNDS = [
  'bg-[#fff8eb]', // Rank 1 Warm Amber Tint
  'bg-[#f0f7ff]', // Rank 2 Ice Blue Tint
  'bg-[#fff0f3]', // Rank 3 Rose Tint
  'bg-white',     // Rank 4 White
  'bg-[#f0fdf4]', // Rank 5 Mint Tint
  'bg-[#fefce8]', // Rank 6 Yellow Tint
  'bg-[#faf5ff]', // Rank 7 Purple Tint
  'bg-[#ecfeff]', // Rank 8 Cyan Tint
  'bg-[#f5f3ff]', // Rank 9 Violet Tint
  'bg-[#fdf2f8]', // Rank 10 Pink Tint
];

function AnimatedTripBar({ count, maximum, rank }: { count: number; maximum: number; rank: number }) {
  const emoji = EMOJI_ANIMATIONS[(rank - 1) % EMOJI_ANIMATIONS.length];
  return <div aria-hidden="true" className="relative mx-2 h-2 rounded-full bg-purple-100/60">
    <div className={`relative h-full rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none ${ROW_GRADIENTS[(rank - 1) % ROW_GRADIENTS.length]}`} style={{ width: `${Math.min(100, Math.max(count / maximum * 100, 3))}%` }}>
      <span className="pointer-events-none absolute -right-3 top-1/2 -translate-y-1/2 select-none text-xl drop-shadow-sm"><span className={`inline-block motion-reduce:animate-none ${emoji.anim}`}>{emoji.icon}</span></span>
    </div>
  </div>;
}

function RankMedalBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="relative flex items-center justify-center shrink-0 w-9 h-9 sm:w-10 sm:h-10 select-none">
        {/* Red Ribbon Tails at Bottom */}
        <svg className="absolute -bottom-1.5 w-6.5 h-4 text-red-600 drop-shadow-xs z-0" viewBox="0 0 28 16" fill="currentColor">
          <path d="M5 0 L0 16 L6 12 L12 16 L7 0 Z M21 0 L16 16 L22 12 L28 16 L23 0 Z" />
        </svg>
        {/* Scalloped Gold Medal Body */}
        <div className="relative z-10 w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 p-0.5 shadow-md shadow-amber-500/40 flex items-center justify-center border border-amber-300">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400 border border-amber-600/40 flex items-center justify-center shadow-inner">
            <span className="font-black text-amber-950 text-xs sm:text-sm drop-shadow-[0_1px_0.5px_rgba(255,255,255,0.8)]">1</span>
          </div>
        </div>
        {/* Gold Sparkles ✨ */}
        <span className="absolute -top-1 -right-2 text-[11px] animate-[bounce_1.2s_ease-in-out_infinite] z-20">✨</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="relative flex items-center justify-center shrink-0 w-9 h-9 sm:w-10 sm:h-10 select-none">
        {/* Blue Ribbon Tails at Bottom */}
        <svg className="absolute -bottom-1.5 w-6.5 h-4 text-blue-600 drop-shadow-xs z-0" viewBox="0 0 28 16" fill="currentColor">
          <path d="M5 0 L0 16 L6 12 L12 16 L7 0 Z M21 0 L16 16 L22 12 L28 16 L23 0 Z" />
        </svg>
        {/* Scalloped Silver Medal Body */}
        <div className="relative z-10 w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-slate-400 via-slate-200 to-slate-300 p-0.5 shadow-md shadow-slate-400/40 flex items-center justify-center border border-slate-300">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 border border-slate-400/40 flex items-center justify-center shadow-inner">
            <span className="font-black text-slate-800 text-xs sm:text-sm drop-shadow-[0_1px_0.5px_rgba(255,255,255,0.8)]">2</span>
          </div>
        </div>
        {/* Silver Sparkle ✦ */}
        <span className="absolute -top-1 -right-1.5 text-sky-400 text-[10px] animate-[pulse_1.5s_infinite] z-20">✦</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="relative flex items-center justify-center shrink-0 w-9 h-9 sm:w-10 sm:h-10 select-none">
        {/* Red Ribbon Tails at Bottom */}
        <svg className="absolute -bottom-1.5 w-6.5 h-4 text-red-600 drop-shadow-xs z-0" viewBox="0 0 28 16" fill="currentColor">
          <path d="M5 0 L0 16 L6 12 L12 16 L7 0 Z M21 0 L16 16 L22 12 L28 16 L23 0 Z" />
        </svg>
        {/* Scalloped Bronze Medal Body */}
        <div className="relative z-10 w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-700 via-orange-500 to-amber-600 p-0.5 shadow-md shadow-amber-800/40 flex items-center justify-center border border-orange-400">
          <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-400 via-orange-300 to-amber-500 border border-amber-800/40 flex items-center justify-center shadow-inner">
            <span className="font-black text-amber-950 text-xs sm:text-sm drop-shadow-[0_1px_0.5px_rgba(255,255,255,0.8)]">3</span>
          </div>
        </div>
        {/* Bronze Sparkle ✦ */}
        <span className="absolute -top-1 -right-1.5 text-orange-400 text-[10px] animate-[pulse_1.8s_infinite] z-20">✦</span>
      </div>
    );
  }
  return (
    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-50 text-purple-700 font-black text-xs sm:text-sm flex items-center justify-center border border-purple-100 shadow-xs">
      {rank}
    </span>
  );
}

function LeaderboardAvatar({ pictureUrl, nickname, rank }: { pictureUrl?: string; nickname: string; rank?: number }) {
  const [hasError, setHasError] = useState(false);

  const renderBassGlowRings = () => {
    if (rank === 1) {
      return (
        <>
          {/* Subwoofer Bass Beat Ping Pulse Aura */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-pink-500 blur-xs animate-ping opacity-75 pointer-events-none" />
          {/* Rotating Laser Equalizer Spectrum Ring */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-yellow-300 via-amber-400 via-pink-500 to-yellow-300 animate-[spin_2s_linear_infinite] p-[2.5px] shadow-[0_0_12px_rgba(245,158,11,0.9),0_0_20px_rgba(236,72,153,0.8)] pointer-events-none">
            <div className="w-full h-full bg-transparent rounded-full" />
          </div>
        </>
      );
    }
    if (rank === 2) {
      return (
        <>
          {/* Subwoofer Bass Beat Ping Pulse Aura */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400 blur-xs animate-ping opacity-75 pointer-events-none" />
          {/* Rotating Laser Equalizer Spectrum Ring */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 via-indigo-400 to-cyan-300 animate-[spin_2.5s_linear_infinite_reverse] p-[2.5px] shadow-[0_0_12px_rgba(56,189,248,0.9),0_0_20px_rgba(129,140,248,0.8)] pointer-events-none">
            <div className="w-full h-full bg-transparent rounded-full" />
          </div>
        </>
      );
    }
    if (rank === 3) {
      return (
        <>
          {/* Subwoofer Bass Beat Ping Pulse Aura */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-rose-400 via-orange-400 to-pink-500 blur-xs animate-ping opacity-75 pointer-events-none" />
          {/* Rotating Laser Equalizer Spectrum Ring */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-rose-400 via-orange-400 via-pink-500 to-rose-400 animate-[spin_3s_linear_infinite] p-[2.5px] shadow-[0_0_12px_rgba(244,63,94,0.9),0_0_20px_rgba(249,115,22,0.8)] pointer-events-none">
            <div className="w-full h-full bg-transparent rounded-full" />
          </div>
        </>
      );
    }
    return null;
  };

  const initial = nickname.trim().charAt(0) || '👤';

  return (
    <div className="relative shrink-0 flex items-center justify-center p-0.5 select-none">
      {renderBassGlowRings()}
      {pictureUrl && !hasError ? (
        <img
          src={pictureUrl}
          alt={nickname}
          onError={() => setHasError(true)}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 border-2 border-white shadow-md relative z-10 transition-transform hover:scale-110"
        />
      ) : (
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0 border-2 border-white shadow-md relative z-10">
          {initial}
        </div>
      )}
    </div>
  );
}

export default function BookingLeaderboard({ title }: { title: string }) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [globalMaxTrips, setGlobalMaxTrips] = useState<number>(1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`/api/leaderboard?page=${page}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error('Failed to load');
        if (!controller.signal.aborted) {
          setData(result);
          if (page === 1 && result.rankings && result.rankings.length > 0) {
            const top1Count = result.rankings[0]?.tripCount || 1;
            setGlobalMaxTrips(Math.max(top1Count, 1));
          }
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, retry]);

  const effectiveMaxTrips = globalMaxTrips > 0 ? globalMaxTrips : (data?.rankings?.[0]?.tripCount || 1);

  const featured = data?.rankings.filter(person => person.rank <= 3) || [];
  const remaining = data?.rankings.filter(person => person.rank > 3) || [];

  return (
    <section id="booking-leaderboard" aria-labelledby="leaderboard-title" className="mobile-performance-section relative overflow-hidden scroll-mt-20 border-b border-purple-100 bg-gradient-to-b from-purple-50/50 via-sky-50/30 to-purple-50/40 py-10 sm:py-14">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-purple-300/20 blur-3xl" />
      <div className="relative mx-auto max-w-5xl space-y-5 px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-white bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 shadow-lg shadow-amber-500/20 sm:h-14 sm:w-14"><Trophy aria-hidden="true" className="h-7 w-7 text-amber-950" /></div>
            <div><p className="mb-1 text-[9px] font-bold tracking-[0.22em] text-purple-500">OUR TRAVEL COMMUNITY</p><h2 id="leaderboard-title" className="text-xl font-black tracking-tight text-slate-900 sm:text-3xl">{title === 'สถิติเวทคนปากดี' ? 'สถิติคนมีปาก' : (title || 'สถิติคนมีปาก')} <span aria-hidden="true" className="inline-block animate-[bounce_1.5s_ease-in-out_infinite] text-xl motion-reduce:animate-none">👑</span></h2><p className="mt-1 text-xs text-slate-500">ยิ่งเดินทางด้วยกัน ยิ่งมีเรื่องเล่า</p></div>
          </div>
          {!loading && !error && data && <div className="flex items-center gap-3 rounded-2xl border border-purple-100 bg-white px-4 py-3 shadow-sm"><Users aria-hidden="true" className="h-5 w-5 text-purple-500" /><div><p className="text-lg font-black leading-none text-purple-950">{data.total.toLocaleString('th-TH')} <span className="text-xs font-medium text-slate-500">คน</span></p><p className="mt-1 text-[10px] text-slate-500">นักเดินทางในทำเนียบ</p></div></div>}
        </div>

        <div aria-live="polite" aria-busy={loading}>
          {loading ? <div role="status" className="flex min-h-60 items-center justify-center gap-3 rounded-3xl border border-purple-100 bg-white text-sm font-bold text-purple-700"><span className="h-5 w-5 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />กำลังโหลดอันดับ…</div>
          : error ? <div className="space-y-3 rounded-3xl border border-rose-100 bg-white py-14 text-center"><p className="text-sm font-bold text-rose-600">โหลดอันดับไม่สำเร็จ</p><button type="button" onClick={() => setRetry(value => value + 1)} className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700">ลองอีกครั้ง</button></div>
          : !data?.rankings.length ? <div className="rounded-3xl border border-purple-100 bg-white py-16 text-center text-sm text-slate-500">ยังไม่มีข้อมูลการจองที่อนุมัติแล้ว</div>
          : <div className="space-y-5">
            {featured.length > 0 && <div className="grid gap-3 sm:grid-cols-3">
              {featured.map((person, index) => <article key={`${data.page}-${index}`} className={`relative overflow-hidden rounded-3xl border p-5 shadow-sm ${person.rank === 1 ? 'border-amber-300 bg-[#fff8eb]' : person.rank === 2 ? 'border-blue-200 bg-[#f0f7ff]' : 'border-rose-200 bg-[#fff0f3]'}`}>
                <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${ROW_GRADIENTS[person.rank - 1]}`} />
                <div className="mb-5 flex items-center justify-between"><span className="text-[10px] font-bold tracking-wide text-slate-500">{person.rank === 1 ? 'นักเดินทางอันดับหนึ่ง' : `นักเดินทางอันดับ ${person.rank}`}</span><RankMedalBadge rank={person.rank} /></div>
                <div className="flex items-center gap-4"><LeaderboardAvatar key={person.pictureUrl || person.nickname} pictureUrl={person.pictureUrl} nickname={person.nickname} rank={person.rank} /><h3 className="min-w-0 break-words text-base font-black text-slate-800">{person.nickname}{person.rank === 1 && <span aria-hidden="true" className="ml-1 inline-block animate-[bounce_1.4s_ease-in-out_infinite] motion-reduce:animate-none">👑</span>}</h3></div>
                <div className="mt-6 mb-2"><AnimatedTripBar count={person.tripCount} maximum={effectiveMaxTrips} rank={person.rank} /></div>
                <div className="mt-5 flex items-end justify-between border-t border-white pt-4"><span className="text-[11px] text-slate-500">เดินทางด้วยกันแล้ว</span><p className="text-3xl font-black tracking-tight text-slate-900">{person.tripCount.toLocaleString('th-TH')} <span className="text-xs font-medium text-slate-500">ทริป</span></p></div>
              </article>)}
            </div>}

            {remaining.length > 0 && <div className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm">
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-4 text-xs font-bold text-white sm:px-6"><span className="flex items-center gap-2"><BarChart2 aria-hidden="true" className="h-4 w-4" />ทำเนียบนักเดินทาง</span><span>จำนวนทริป</span></div>
              <div className="space-y-2 p-2 sm:p-3">
                {remaining.map((person, index) => <div key={`${data.page}-${index}`} className={`grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-3 sm:grid-cols-[32px_minmax(0,1fr)_minmax(100px,1fr)_auto] sm:gap-x-4 sm:px-4 ${ROW_BACKGROUNDS[(person.rank - 1) % ROW_BACKGROUNDS.length]}`}>
                  <RankMedalBadge rank={person.rank} />
                  <div className="flex min-w-0 items-center gap-3"><LeaderboardAvatar key={person.pictureUrl || person.nickname} pictureUrl={person.pictureUrl} nickname={person.nickname} /><span className="min-w-0 break-words text-xs font-bold text-slate-800 sm:text-sm">{person.nickname}</span></div>
                  <div className="col-start-2 row-start-2 py-2 sm:col-start-3 sm:row-start-1"><AnimatedTripBar count={person.tripCount} maximum={effectiveMaxTrips} rank={person.rank} /></div>
                  <p className="col-start-3 row-start-1 whitespace-nowrap rounded-xl border border-purple-100 bg-white/80 px-3 py-2 text-sm font-black text-purple-950 sm:col-start-4">{person.tripCount.toLocaleString('th-TH')} <span className="text-[10px] font-medium text-slate-500">ทริป</span></p>
                </div>)}
              </div>
            </div>}
          </div>}
        </div>

        <div className="flex flex-col gap-4 border-t border-purple-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex max-w-xl items-start gap-2 text-[10px] leading-relaxed text-slate-500 sm:text-xs"><Sparkles aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-500" />นับทริปที่อนุมัติการจองแล้วตลอดระยะเวลาใช้งาน คนละ 1 ครั้งต่อรอบทริป จำนวนเท่ากันได้อันดับร่วมกัน</p>
          {!loading && !error && data && data.pageCount > 1 && <nav aria-label="หน้าสถิตินักเดินทาง" className="flex shrink-0 items-center self-end gap-2 rounded-2xl border border-purple-100 bg-white p-1.5">
            <button type="button" aria-label="อันดับหน้าก่อนหน้า" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)} className="rounded-xl p-2 text-purple-700 transition hover:bg-purple-50 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-2 text-xs font-bold text-slate-700">{data.page} / {data.pageCount}</span>
            <button type="button" aria-label="อันดับหน้าถัดไป" disabled={data.page >= data.pageCount} onClick={() => setPage(data.page + 1)} className="rounded-xl p-2 text-purple-700 transition hover:bg-purple-50 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
          </nav>}
        </div>
      </div>
    </section>
  );
}
