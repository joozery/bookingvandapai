'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, ArrowLeft, MessageSquare } from 'lucide-react';
import { isTripReviewOpen } from '@/lib/tripReview';

type PublicReviews = {
  trip: { id: string; name: string; departureDate: string; durationDays: number };
  count: number;
  average: number | null;
  page: number;
  pageCount: number;
  reviews: { id: string; rating: number; comment: string; createdAt: string }[];
};

export default function PublicTripReviews({ tripId }: { tripId: string }) {
  const [data, setData] = useState<PublicReviews | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let sequence = 0;
    async function refresh() {
      const current = ++sequence;
      try {
        const response = await fetch(`/api/reviews/public?tripId=${encodeURIComponent(tripId)}&page=${page}`, { cache: 'no-store', signal: controller.signal });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        if (!controller.signal.aborted && current === sequence) { setData(result); setError(''); }
      } catch (err) {
        if (!controller.signal.aborted && current === sequence) { setData(null); setError(err instanceof Error ? err.message : 'โหลดรีวิวไม่สำเร็จ'); }
      } finally { if (!controller.signal.aborted && current === sequence) setLoading(false); }
    }
    void refresh();
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 30_000);
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', focus); };
  }, [tripId, page, retry]);
  const changePage = (next: number) => { setLoading(true); setPage(next); };

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800 sm:py-12">
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/#completed-trips" className="inline-flex items-center gap-2 text-sm font-bold text-purple-800"><ArrowLeft className="h-4 w-4" />กลับไปทริปที่ปิดไปแล้ว</Link>
      {loading ? <p role="status" className="rounded-2xl bg-white p-10 text-center">กำลังโหลดรีวิว…</p> : error ? <div role="alert" className="rounded-2xl bg-white p-8 text-center"><p>{error}</p><button onClick={() => { setLoading(true); setRetry(value => value + 1); }} className="mt-4 rounded-xl bg-purple-800 px-5 py-2 text-white">ลองใหม่</button></div> : data && <>
        <header className="rounded-3xl border border-purple-100 bg-white p-6 sm:p-8">
          <p className="text-sm font-bold text-purple-700">ด่าไป เดินไป · รีวิวจากผู้ร่วมทริป</p>
          <h1 className="mt-3 text-2xl font-bold">{data.trip.name}</h1>
          <span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">ทริปที่ปิดไปแล้ว</span>
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-purple-50 p-5">
            <Star className="h-10 w-10 fill-amber-400 text-amber-400" aria-hidden="true" />
            <div><p className="text-3xl font-bold text-purple-900">{data.average === null ? '—' : data.average.toFixed(1)} <span className="text-base font-normal">/ 5</span></p><p className="mt-1 text-sm text-slate-600">คะแนนเฉลี่ยจาก {data.count.toLocaleString('th-TH')} รีวิวที่แสดงอยู่</p></div>
          </div>
          {isTripReviewOpen(data.trip) && <Link href={`/?tripId=${encodeURIComponent(tripId)}`} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-purple-800 px-4 py-3 text-sm font-bold text-white"><MessageSquare className="h-4 w-4" />ร่วมทริปนี้? เขียนรีวิวของคุณ</Link>}
        </header>
        <section aria-label="รีวิวของทริป" className="space-y-4">
          <h2 className="text-lg font-bold">ความคิดเห็นจากผู้ร่วมทริป</h2>
          {!data.count && <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">ยังไม่มีรีวิวที่แสดงสำหรับทริปนี้</p>}
          {data.reviews.map(review => <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">ผู้ร่วมทริป</h3><span className="text-xl text-amber-500" aria-label={`${review.rating} จาก 5 ดาว`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{review.comment || 'ให้คะแนนอย่างเดียว'}</p>
            <time dateTime={review.createdAt} className="mt-4 block text-xs text-slate-400">{new Date(review.createdAt).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'long', day: 'numeric' })}</time>
          </article>)}
        </section>
        {data.pageCount > 1 && <nav aria-label="หน้ารีวิว" className="flex items-center justify-center gap-4 text-sm"><button disabled={data.page <= 1} onClick={() => changePage(data.page - 1)} className="rounded-lg border bg-white p-3 disabled:opacity-40">ก่อนหน้า</button><span>หน้า {data.page} / {data.pageCount}</span><button disabled={data.page >= data.pageCount} onClick={() => changePage(data.page + 1)} className="rounded-lg border bg-white p-3 disabled:opacity-40">ถัดไป</button></nav>}
      </>}
    </div>
  </main>;
}
