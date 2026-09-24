'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

export default function TripRatingSummary({ tripId }: { tripId: string }) {
  const [summary, setSummary] = useState<{ average: number | null; count: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let sequence = 0;
    async function refresh() {
      const current = ++sequence;
      try {
        const response = await fetch(`/api/reviews/public?tripId=${encodeURIComponent(tripId)}`, {
          cache: 'no-store', signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error('Could not load rating');
        if (!controller.signal.aborted && current === sequence) {
          setSummary({ average: result.average, count: result.count });
          setError(false);
        }
      } catch {
        if (!controller.signal.aborted && current === sequence) setError(true);
      }
    }
    void refresh();
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); window.removeEventListener('focus', refresh); };
  }, [tripId]);

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-slate-800 shadow-sm" aria-live="polite">
      <Star aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${!error && summary?.count ? 'fill-amber-400 text-amber-500' : 'text-amber-500'}`} />
      {error ? <span aria-label="โหลดคะแนนไม่สำเร็จ">—</span> : !summary ? (
        <span aria-label="กำลังโหลดคะแนน">…</span>
      ) : summary.count > 0 && summary.average !== null ? (
        <span aria-label={`คะแนนเฉลี่ย ${summary.average.toFixed(1)} จาก 5`}>{summary.average.toFixed(1)}</span>
      ) : <span aria-label="ยังไม่มีคะแนนรีวิว">—</span>}
    </div>
  );
}
