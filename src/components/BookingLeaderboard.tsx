'use client';

import { useEffect, useState } from 'react';
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react';

type Leaderboard = { rankings: { rank: number; nickname: string; pictureUrl?: string; tripCount: number }[]; total: number; page: number; pageCount: number };

function LeaderboardAvatar({ pictureUrl, nickname }: { pictureUrl?: string; nickname: string }) {
  const [hasError, setHasError] = useState(false);

  if (pictureUrl && !hasError) {
    return (
      <img
        src={pictureUrl}
        alt={nickname}
        onError={() => setHasError(true)}
        className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 shadow-xs"
      />
    );
  }

  const initial = nickname.trim().charAt(0) || '👤';
  return (
    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-black text-xs shrink-0 border border-violet-200">
      {initial}
    </div>
  );
}

export default function BookingLeaderboard({ title }: { title: string }) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    fetch(`/api/leaderboard?page=${page}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error('Failed to load');
        if (!controller.signal.aborted) setData(result);
      }).catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, retry]);
  return (
    <section id="booking-leaderboard" aria-labelledby="leaderboard-title" className="border-b border-slate-100 bg-white py-8 sm:py-10 scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-50 p-3"><Trophy className="w-6 h-6 text-amber-600" /></div>
          <div><h2 id="leaderboard-title" className="text-lg sm:text-xl font-black text-slate-900">{title === 'สถิติเวทคนปากดี' ? 'สถิติคนมีปาก' : (title || 'สถิติคนมีปาก')}</h2><p className="text-xs text-slate-500 mt-1">ลำดับของการจองทริปเพจ • จากมากไปน้อย</p></div>
        </div>
        <p className="text-xs text-slate-500">นับทริปที่อนุมัติการจองแล้วตลอดระยะเวลาใช้งาน คนละ 1 ครั้งต่อรอบทริป จำนวนเท่ากันได้อันดับร่วมกัน</p>
        <div aria-live="polite" aria-busy={loading}>
          {loading ? <p className="py-8 text-center text-sm text-slate-500">กำลังโหลดอันดับ…</p>
            : error ? <div className="py-8 text-center"><p className="text-sm text-slate-500">โหลดอันดับไม่สำเร็จ</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 text-sm font-bold text-violet-700">ลองอีกครั้ง</button></div>
            : !data?.rankings.length ? <p className="py-8 text-center text-sm text-slate-500">ยังไม่มีข้อมูลการจองที่อนุมัติแล้ว</p>
            : <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{title} เรียงตามจำนวนทริปที่จองและอนุมัติแล้ว</caption>
                <thead className="bg-violet-50 text-violet-900"><tr><th scope="col" className="px-3 sm:px-5 py-3 w-20">อันดับ</th><th scope="col" className="px-3 sm:px-5 py-3">ชื่อเล่น</th><th scope="col" className="px-3 sm:px-5 py-3 text-right whitespace-nowrap">จำนวนทริป</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{data.rankings.map((person, index) => <tr key={`${data.page}-${index}`} className={person.rank <= 3 ? 'bg-amber-50/40' : ''}>
                  <td className="px-3 sm:px-5 py-3"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-black ${person.rank === 1 ? 'bg-amber-100 text-amber-800' : person.rank === 2 ? 'bg-slate-200 text-slate-700' : person.rank === 3 ? 'bg-orange-100 text-orange-800' : 'text-slate-500'}`}>{person.rank}</span></td>
                  <td className="px-3 sm:px-5 py-3 font-bold text-slate-800 break-words [overflow-wrap:anywhere]">
                    <div className="flex items-center gap-2.5">
                      <LeaderboardAvatar pictureUrl={person.pictureUrl} nickname={person.nickname} />
                      <span>{person.nickname}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-5 py-3 text-right font-black text-violet-900">{person.tripCount.toLocaleString('th-TH')}</td>
                </tr>)}</tbody>
              </table>
            </div>}
        </div>
        {!loading && !error && data && data.total > 0 && <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
          <span>นักเดินทาง {data.total.toLocaleString('th-TH')} คน</span>
          {data.pageCount > 1 && <div className="flex items-center gap-2"><button type="button" aria-label="อันดับหน้าก่อนหน้า" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)} className="p-2 rounded-lg border disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button><span>{data.page} / {data.pageCount}</span><button type="button" aria-label="อันดับหน้าถัดไป" disabled={data.page >= data.pageCount} onClick={() => setPage(data.page + 1)} className="p-2 rounded-lg border disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button></div>}
        </div>}
      </div>
    </section>
  );
}
