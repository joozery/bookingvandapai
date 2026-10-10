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

  return (
    <section id="booking-leaderboard" aria-labelledby="leaderboard-title" className="mobile-performance-section border-b border-purple-100 bg-gradient-to-b from-purple-50/50 via-sky-50/30 to-purple-50/40 py-10 sm:py-14 scroll-mt-20 overflow-hidden relative">
      
      {/* Background Decor Spotlights */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-sky-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 space-y-6">
        
        {/* Header Section with Trophy & Sticker */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* Trophy Icon with Wiggling Crown */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-white">
                  <Trophy className="w-8 h-8 text-amber-950 drop-shadow-sm" />
                </div>
                <span className="absolute -top-3 -right-2 text-xl animate-[bounce_1.2s_ease-in-out_infinite]">👑</span>
              </div>

              <div>
                <h2 id="leaderboard-title" className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                  {title === 'สถิติเวทคนปากดี' ? 'สถิติคนมีปาก' : (title || 'สถิติคนมีปาก')}
                  <span className="text-2xl inline-block animate-[bounce_1.5s_ease-in-out_infinite]">👑</span>
                </h2>
                <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">
                  ลำดับของการจองทริปเพจ • จากมากไปน้อย
                </p>
              </div>
            </div>

            {/* Rules Badge Pill */}
            <div className="inline-flex items-start sm:items-center gap-2 bg-white/90 backdrop-blur-md border border-purple-200/80 px-3 py-2 sm:px-3.5 sm:py-1.5 rounded-2xl sm:rounded-full text-[10.5px] sm:text-xs font-semibold text-purple-950 shadow-sm leading-tight sm:leading-normal">
              <BarChart2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5 sm:mt-0" />
              <span>นับทริปที่อนุมัติการจองแล้วตลอดระยะเวลาใช้งาน คนละ 1 ครั้งต่อรอบทริป จำนวนเท่ากันได้อันดับร่วมกัน</span>
            </div>
          </div>

          {/* Yellow Decorative Sticker Tag */}
          <div className="hidden lg:flex shrink-0">
            <div className="relative bg-amber-200/90 text-amber-950 border border-amber-300 px-4 py-2 rounded-2xl shadow-md rotate-2 transition-transform hover:rotate-0 select-none">
              <div className="flex items-center gap-1.5 text-xs font-black">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>จองทริปกับเรา เดินทางง่าย สนุกทุกทริป</span>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Card Container */}
        <div aria-live="polite" aria-busy={loading} className="relative">
          {loading ? (
            <div className="py-16 text-center bg-white/80 backdrop-blur-md rounded-3xl border border-purple-100 shadow-lg">
              <div className="inline-flex items-center gap-3 bg-purple-50 px-5 py-2.5 rounded-full text-purple-700 font-bold text-sm">
                <span className="w-4 h-4 rounded-full border-2 border-purple-600 border-t-transparent animate-spin shrink-0" />
                กำลังโหลดอันดับ…
              </div>
            </div>
          ) : error ? (
            <div className="py-12 text-center bg-white/80 backdrop-blur-md rounded-3xl border border-rose-100 shadow-lg space-y-3">
              <p className="text-sm font-bold text-rose-600">โหลดอันดับไม่สำเร็จ</p>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-purple-700 transition"
              >
                ลองอีกครั้ง
              </button>
            </div>
          ) : !data?.rankings.length ? (
            <div className="py-16 text-center bg-white/80 backdrop-blur-md rounded-3xl border border-purple-100 shadow-lg">
              <p className="text-sm font-bold text-slate-500">ยังไม่มีข้อมูลการจองที่อนุมัติแล้ว</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border-2 border-purple-200/80 bg-white/95 backdrop-blur-xl shadow-xl">
              
              {/* Table Header with Vertical Divider Bar "|" */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between text-xs sm:text-sm font-black tracking-wide select-none shadow-md">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <span className="w-10 sm:w-12 text-center shrink-0">อันดับ</span>
                  <span className="text-white/40 font-normal select-none px-1">|</span>
                  <span className="truncate">ชื่อเล่น</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300 shrink-0">
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>จำนวนทริป</span>
                </div>
              </div>

              {/* Seamless Full-Width Leaderboard Rows with Soft Pastel Tints & Dividers */}
              <div className="divide-y divide-purple-100/70">
                {data.rankings.map((person, index) => {
                  const emojiObj = EMOJI_ANIMATIONS[index % EMOJI_ANIMATIONS.length];
                  const barGradient = ROW_GRADIENTS[index % ROW_GRADIENTS.length];
                  const rowBg = 
                    person.rank === 1
                      ? 'bg-gradient-to-r from-amber-100/95 via-amber-50/90 to-amber-100/95 border-y-2 border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.35)] relative z-10'
                      : person.rank === 2
                      ? 'bg-gradient-to-r from-slate-100/95 via-blue-50/90 to-slate-100/95 border-y-2 border-slate-300/90 shadow-[0_0_14px_rgba(148,163,184,0.25)] relative z-10'
                      : person.rank === 3
                      ? 'bg-gradient-to-r from-rose-100/95 via-orange-50/90 to-rose-100/95 border-y-2 border-rose-300/90 shadow-[0_0_14px_rgba(244,63,94,0.2)] relative z-10'
                      : ROW_BACKGROUNDS[index % ROW_BACKGROUNDS.length];

                  const barWidthPercent = Math.max((person.tripCount / effectiveMaxTrips) * 100, 10);

                  return (
                    <div
                      key={`${data.page}-${index}`}
                      className={`flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-3 transition-colors duration-200 hover:bg-purple-100/50 ${rowBg}`}
                    >
                      {/* Rank Medal & User Info - Fixed width for exact progress bar alignment */}
                      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 w-[140px] xs:w-[165px] sm:w-[210px] md:w-[230px] pr-2">
                        {/* Custom Scalloped Medal Badge with Ribbons & Sparkles */}
                        <RankMedalBadge rank={person.rank} />

                        {/* Avatar with Glowing Ring Frame for Top 3 & Name */}
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <LeaderboardAvatar pictureUrl={person.pictureUrl} nickname={person.nickname} rank={person.rank} />
                          <span className="font-extrabold text-xs sm:text-sm text-slate-800 truncate flex items-center gap-1">
                            {person.nickname}
                            {person.rank === 1 && (
                              <span className="text-xs inline-block animate-[bounce_1.4s_ease-in-out_infinite] shrink-0">👑</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar with Wiggling Animated Travel Emoji at tip */}
                      <div className="flex flex-1 min-w-[80px] sm:min-w-[150px] mx-2 sm:mx-4 items-center relative">
                        <div className="w-full bg-slate-200/40 h-4 sm:h-5 rounded-full overflow-visible relative shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out relative shadow-sm ${barGradient}`}
                            style={{ width: `${barWidthPercent}%` }}
                          >
                            {/* Wiggling Emoji attached at right tip of progress bar */}
                            <span
                              className={`absolute -right-3.5 sm:-right-4.5 top-1/2 -translate-y-1/2 text-lg sm:text-2xl select-none pointer-events-none drop-shadow-md z-20 ${emojiObj.anim}`}
                            >
                              {emojiObj.icon}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Trip Count Pill Badge */}
                      <div className="shrink-0">
                        <div className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full font-black text-xs sm:text-sm shadow-sm ${
                          person.rank === 1
                            ? 'bg-gradient-to-r from-amber-200 to-yellow-300 text-amber-950 border border-amber-400 shadow-md'
                            : person.rank === 2
                            ? 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-900 border border-slate-400 shadow-sm'
                            : person.rank === 3
                            ? 'bg-gradient-to-r from-rose-200 to-amber-200 text-rose-950 border border-rose-400 shadow-sm'
                            : 'bg-purple-50 text-purple-900 border border-purple-100'
                        }`}>
                          {person.tripCount.toLocaleString('th-TH')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Area: Total Travelers & Pagination */}
        {!loading && !error && data && data.total > 0 && (
          <div className="flex items-center justify-between gap-4 text-xs font-extrabold text-slate-600 pt-2 select-none">
            {/* Total Travelers Badge */}
            <div className="inline-flex items-center gap-2 bg-white/90 border border-purple-200/80 px-4 py-2 rounded-2xl shadow-sm text-purple-950">
              <Users className="w-4 h-4 text-purple-600 shrink-0" />
              <span>นักเดินทาง {data.total.toLocaleString('th-TH')} คน</span>
            </div>

            {/* Pagination Controls */}
            {data.pageCount > 1 && (
              <div className="flex items-center gap-2 bg-white/90 border border-purple-200/80 p-1.5 rounded-2xl shadow-sm">
                <button
                  type="button"
                  aria-label="อันดับหน้าก่อนหน้า"
                  disabled={data.page <= 1}
                  onClick={() => setPage(data.page - 1)}
                  className="p-1.5 rounded-xl border border-slate-200 hover:bg-purple-50 hover:text-purple-700 text-slate-600 transition disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-black text-slate-800">
                  {data.page} / {data.pageCount}
                </span>
                <button
                  type="button"
                  aria-label="อันดับหน้าถัดไป"
                  disabled={data.page >= data.pageCount}
                  onClick={() => setPage(data.page + 1)}
                  className="p-1.5 rounded-xl border border-slate-200 hover:bg-purple-50 hover:text-purple-700 text-slate-600 transition disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
