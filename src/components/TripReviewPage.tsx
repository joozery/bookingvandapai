'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Star, CheckCircle2 } from 'lucide-react';
import type { TripReview } from '@/lib/tripReview';

export default function TripReviewPage({ trip }: { trip: { id: string; name: string; status?: string } }) {
  const { data: session, status } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  return <TripReviewForm key={`${trip.id}:${status}:${userId || ''}`} trip={trip} />;
}

function TripReviewForm({ trip }: { trip: { id: string; name: string; status?: string } }) {
  const { data: session, status } = useSession();
  const [review, setReview] = useState<TripReview | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(status === 'authenticated');
  const [eligible, setEligible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  useEffect(() => {
    let active = true;
    if (status !== 'authenticated') return;
    fetch(`/api/reviews?tripId=${encodeURIComponent(trip.id)}`, { cache: 'no-store' })
      .then(res => res.json()).then(data => {
        if (!active) return;
        if (!data.success) throw new Error(data.error);
        setReview(data.review); setEligible(true);
      }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [trip.id, status, userId, retry]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating || saving) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tripId: trip.id, rating, comment }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setReview(data.review);
    } catch (err) { setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่'); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-800">
    <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 sm:p-10 shadow-sm border border-purple-100">
      <p className="text-sm font-bold text-purple-700">ด่าไป เดินไป · รีวิวหลังเดินทาง</p>
      <h1 className="mt-3 text-2xl font-bold">ขอบคุณที่ร่วมเดินทางกับเรา</h1>
      <h2 className="mt-2 text-lg text-slate-600">{trip.name}</h2>
      <p className="mt-3 text-sm text-slate-500">ทริปนี้ปิดรับจองแล้ว แบ่งปันความประทับใจและข้อเสนอแนะเพื่อพัฒนาทริปครั้งต่อไป คะแนนและความคิดเห็นที่ไม่ได้ถูกซ่อนจะแสดงสาธารณะเมื่อแอดมินปิดทริป กรุณาไม่ใส่ข้อมูลส่วนตัวในข้อความ</p>
      {trip.status === 'completed' && <Link href={`/trips/${encodeURIComponent(trip.id)}/reviews`} className="mt-4 inline-block text-sm font-bold text-purple-800 underline">ดูรีวิวและคะแนนเฉลี่ยของทริปนี้</Link>}
      {status === 'loading' || loading ? <p className="py-8" role="status">กำลังตรวจสอบข้อมูล…</p> : status !== 'authenticated' ?
        <button onClick={() => signIn('line', { callbackUrl: `${window.location.origin}/?tripId=${encodeURIComponent(trip.id)}` })} className="mt-6 w-full rounded-xl bg-green-600 p-3 font-bold text-white">เข้าสู่ระบบด้วย LINE เพื่อประเมิน</button> :
        review ? <div className="mt-8 rounded-2xl bg-purple-50 p-5" role="status">
          <CheckCircle2 className="text-green-600" /><h3 className="mt-2 font-bold">ขอบคุณสำหรับการประเมิน</h3>
          <p className="my-3 text-2xl text-amber-500" aria-label={`${review.rating} จาก 5 ดาว`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
          {review.comment && <p className="whitespace-pre-wrap break-words">{review.comment}</p>}
          <p className="mt-3 text-xs text-slate-500">บันทึกแล้ว · ประเมินได้หนึ่งครั้งต่อทริป</p>
        </div> : eligible ? <form onSubmit={submit} className="mt-7 space-y-5">
          <fieldset disabled={saving}><legend className="mb-3 font-bold">คะแนนความพึงพอใจโดยรวม</legend>
            <div className="flex gap-2">{[1, 2, 3, 4, 5].map(value => <label key={value} className="cursor-pointer rounded-lg p-1 has-focus-visible:ring-2 has-focus-visible:ring-purple-500">
              <input className="sr-only" type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} required aria-label={`${value} ดาว`} />
              <Star className={`h-9 w-9 sm:h-11 sm:w-11 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
            </label>)}</div><p className="mt-2 text-sm text-slate-500">{rating ? `${rating} / 5 ดาว` : 'เลือก 1–5 ดาว'}</p>
          </fieldset>
          <label className="block text-sm font-bold">ความคิดเห็น / ข้อเสนอแนะ (ไม่บังคับ)
            <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={2000} rows={5} disabled={saving} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" placeholder="สิ่งที่ประทับใจ หรือสิ่งที่อยากให้เราปรับปรุง" />
            <span className="text-xs font-normal text-slate-400">{comment.length.toLocaleString()} / 2,000 ตัวอักษร</span>
          </label>
          <button disabled={!rating || saving} className="w-full rounded-xl bg-purple-800 p-3 font-bold text-white disabled:opacity-50">{saving ? 'กำลังบันทึก…' : 'ส่งแบบประเมิน'}</button>
        </form> : null}
      {error && <div role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}<button type="button" className="ml-3 underline" onClick={() => { setLoading(true); setError(''); setEligible(false); setRetry(x => x + 1); }}>ตรวจสอบอีกครั้ง</button></div>}
      <div className="mt-8 flex gap-5 text-sm text-purple-800"><Link href="/tickets" className="underline">ตั๋วและประวัติการจอง</Link><Link href="/" className="underline">กลับหน้าแรก</Link></div>
    </div>
  </main>;
}
