'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { Trip } from './types';
import type { TripReview } from '@/lib/tripReview';

const defaults = { trip: '', tripStatus: '', rating: '', comment: '', search: '', sort: 'latest', visibility: 'visible' };

export default function ReviewsTab({ trips }: { trips: Trip[] }) {
  const [reviews, setReviews] = useState<TripReview[]>([]);
  const [filters, setFilters] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  async function toggleVisibility(review: TripReview) {
    if (savingId) return;
    setSavingId(review.id); setActionError(''); setNotice('');
    try {
      const response = await fetch('/api/reviews', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: review.id, isHidden: !review.isHidden }) });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      setReviews(previous => previous.map(item => item.id === review.id ? data.review : item));
      setNotice(data.review.isHidden ? 'ซ่อนรีวิวแล้ว ดูและเปิดกลับได้จากตัวกรอง “ซ่อนอยู่”' : 'เปิดแสดงรีวิวแล้ว');
    } catch (error) { setActionError(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่'); }
    finally { setSavingId(null); }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/reviews?admin=1', { cache: 'no-store', signal: controller.signal }).then(res => res.json()).then(data => {
      if (!data.success) throw new Error(data.error);
      setReviews(data.reviews);
    }).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  const names = useMemo(() => new Map(trips.map(trip => [trip.id, trip.name])), [trips]);
  const tripStatuses = useMemo(() => new Map(trips.map(trip => [trip.id, trip.status])), [trips]);
  const matchingTrips = trips.filter(trip => !filters.tripStatus || trip.status === filters.tripStatus);
  const filtered = useMemo(() => reviews.filter(review => {
    const search = filters.search.trim().toLocaleLowerCase('th');
    return (!filters.trip || review.tripId === filters.trip)
      && (!filters.tripStatus || tripStatuses.get(review.tripId) === filters.tripStatus)
      && (!filters.visibility || (filters.visibility === 'hidden' ? review.isHidden : !review.isHidden))
      && (!filters.rating || review.rating === Number(filters.rating))
      && (!filters.comment || (filters.comment === 'with' ? !!review.comment.trim() : !review.comment.trim()))
      && (!search || `${names.get(review.tripId) || ''} ${review.reviewerName} ${review.comment}`.toLocaleLowerCase('th').includes(search));
  }).sort((a, b) => (filters.sort === 'lowest' ? a.rating - b.rating : filters.sort === 'highest' ? b.rating - a.rating : 0) || Date.parse(b.createdAt) - Date.parse(a.createdAt)), [reviews, filters, tripStatuses, names]);
  const average = filtered.length ? (filtered.reduce((sum, r) => sum + r.rating, 0) / filtered.length).toFixed(1) : '—';
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  const update = (key: keyof typeof defaults, value: string) => {
    setFilters(previous => ({ ...previous, [key]: value, ...(key === 'tripStatus' && value && tripStatuses.get(previous.trip) !== value ? { trip: '' } : {}) }));
    setPage(1);
  };
  const control = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800';

  return <section className="space-y-5 text-slate-800">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold">รีวิวและความคิดเห็น</h1><p className="mt-1 text-sm text-slate-500">ความคิดเห็นจากผู้ร่วมทริป · เฉพาะแอดมินที่มีสิทธิ์</p></div><button onClick={() => { setLoading(true); setError(''); setRetry(x => x + 1); }} disabled={loading || !!savingId} className="rounded-xl border bg-white px-4 py-2 text-sm disabled:opacity-50">รีเฟรชข้อมูล</button></div>
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm">สถานะทริป<select value={filters.tripStatus} onChange={e => update('tripStatus', e.target.value)} className={control}><option value="">ทั้งหมด</option><option value="active">เปิดอยู่</option><option value="completed">ปิดแล้ว</option></select></label>
      <label className="text-sm">ทริป<select value={filters.trip} onChange={e => update('trip', e.target.value)} className={control}><option value="">ทุกทริป</option>{matchingTrips.map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select></label>
      <label className="text-sm">คะแนน<select value={filters.rating} onChange={e => update('rating', e.target.value)} className={control}><option value="">ทุกคะแนน</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ดาว</option>)}</select></label>
      <label className="text-sm">ความคิดเห็น<select value={filters.comment} onChange={e => update('comment', e.target.value)} className={control}><option value="">ทั้งหมด</option><option value="with">มีข้อความ</option><option value="without">ให้ดาวอย่างเดียว</option></select></label>
      <label className="text-sm">การแสดงผล<select value={filters.visibility} onChange={e => update('visibility', e.target.value)} className={control}><option value="visible">แสดงอยู่</option><option value="hidden">ซ่อนอยู่</option><option value="">ทั้งหมด</option></select></label>
      <label className="text-sm">ค้นหาทริป / ผู้ประเมิน / ข้อความ<input type="search" value={filters.search} onChange={e => update('search', e.target.value)} placeholder="ชื่อทริป ชื่อผู้ประเมิน หรือข้อความ" className={control} /></label>
      <label className="text-sm">เรียงตาม<select value={filters.sort} onChange={e => update('sort', e.target.value)} className={control}><option value="latest">ล่าสุด</option><option value="lowest">คะแนนต่ำสุด</option><option value="highest">คะแนนสูงสุด</option></select></label>
      <button onClick={() => { setFilters(defaults); setPage(1); }} className="self-end rounded-lg bg-slate-100 px-4 py-2 text-sm">ล้างตัวกรอง</button>
    </div>
    {actionError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{actionError}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p> : loading ? <p role="status" className="p-8 text-center">กำลังโหลดรีวิว…</p> : <>
      <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-purple-50 p-5"><p className="text-sm text-purple-800">คะแนนเฉลี่ยตามตัวกรอง</p><p className="mt-1 text-3xl font-bold text-purple-900">{average} <span className="text-base font-normal">/ 5</span></p></div><div className="rounded-2xl bg-white border p-5"><p className="text-sm text-slate-500">จำนวนผู้ประเมินตามตัวกรอง</p><p className="mt-1 text-3xl font-bold">{filtered.length.toLocaleString()} <span className="text-base font-normal">รีวิว</span></p></div></div>
      {!filtered.length && <p className="rounded-2xl border bg-white p-10 text-center text-slate-500">ไม่พบรีวิวตามเงื่อนไขที่เลือก</p>}
      <div className="space-y-3">{filtered.slice((currentPage - 1) * 20, currentPage * 20).map(review => <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold">{review.reviewerName}</h2><span className="text-lg text-amber-500" aria-label={`${review.rating} จาก 5 ดาว`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div>
        <p className="mt-1 text-sm text-purple-700">{names.get(review.tripId) || review.tripId}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className={`rounded-full px-2 py-1 text-xs ${review.isHidden ? 'bg-slate-100 text-slate-500' : 'bg-green-50 text-green-700'}`}>{review.isHidden ? 'ซ่อนอยู่' : 'แสดงอยู่'}</span>
          <button type="button" disabled={!!savingId} onClick={() => toggleVisibility(review)} aria-label={`${review.isHidden ? 'แสดง' : 'ซ่อน'}รีวิวของ ${review.reviewerName}`} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">
            {review.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {savingId === review.id ? 'กำลังบันทึก…' : review.isHidden ? 'แสดงรีวิว' : 'ซ่อนรีวิว'}
          </button>
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm">{review.comment || 'ให้คะแนนอย่างเดียว ไม่มีข้อความ'}</p>
        <time dateTime={review.createdAt} className="mt-3 block text-xs text-slate-400">{new Date(review.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</time>
      </article>)}</div>
      {pages > 1 && <div className="flex items-center justify-center gap-4 text-sm"><button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border p-2 disabled:opacity-40">ก่อนหน้า</button><span>หน้า {currentPage} / {pages}</span><button disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border p-2 disabled:opacity-40">ถัดไป</button></div>}
    </>}
  </section>;
}
