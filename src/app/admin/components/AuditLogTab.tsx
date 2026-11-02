'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, History, RefreshCw, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AuditLog } from '@/lib/audit';

const RESOURCES: Record<string, string> = {
  admin: 'บัญชีผู้ดูแล / สิทธิ์', payment: 'การชำระเงิน', 'payment-settings': 'ตั้งค่ารับเงิน / QR',
  'accounting:entries': 'บัญชี: รายรับ–รายจ่าย', 'accounting:categories': 'บัญชี: หมวดหมู่', 'accounting:partners': 'บัญชี: หุ้นส่วน', 'accounting:reimbursements': 'บัญชี: เบิกคืน',
  trip: 'ทริป', van: 'รถตู้', booking: 'การจอง', 'site-settings': 'ตั้งค่าเว็บไซต์', 'customer-profile': 'โปรไฟล์ลูกทริป', 'customer-role': 'สถานะลูกทริป',
  review: 'รีวิว', leaderboard: 'อันดับ', file: 'ไฟล์', database: 'ฐานข้อมูล',
};
const ACTIONS: Record<string, { label: string; style: string }> = {
  create: { label: 'เพิ่ม', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  update: { label: 'แก้ไข', style: 'bg-sky-50 text-sky-700 border-sky-200' },
  delete: { label: 'ลบ', style: 'bg-rose-50 text-rose-700 border-rose-200' },
  other: { label: 'อื่น ๆ', style: 'bg-slate-50 text-slate-600 border-slate-200' },
};
const when = (ms: number) => new Date(ms).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'medium' });
const show = (value: unknown) => value === null || value === undefined || value === '' ? '—'
  : Array.isArray(value) ? (value.length ? value.join(', ') : '—')
  : typeof value === 'boolean' ? (value ? 'ใช่' : 'ไม่')
  : typeof value === 'object' ? JSON.stringify(value) : String(value);

type Result = { logs: AuditLog[]; total: number; page: number; pageCount: number; actors: { id: string; name: string }[] };

export default function AuditLogTab() {
  const [filters, setFilters] = useState({ q: '', actor: '', resource: '', action: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number, current: typeof filters) => {
    const params = new URLSearchParams({ ...current, page: String(nextPage) });
    try {
      const res = await fetch(`/api/admin/audit-logs?${params}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'โหลดไม่สำเร็จ');
      return { result: json as Result };
    } catch (e) { return { error: e instanceof Error ? e.message : 'โหลดไม่สำเร็จ' }; }
  }, []);
  const apply = (r: { result?: Result; error?: string }) => { if (r.result) setResult(r.result); setError(r.error || ''); setLoading(false); };

  useEffect(() => {
    let cancelled = false;
    void load(page, filters).then(r => { if (!cancelled) apply(r); });
    return () => { cancelled = true; };
    // Filters apply on submit / select change via `run`, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, load]);

  const run = async (next: typeof filters) => { setFilters(next); setPage(1); setLoading(true); apply(await load(1, next)); };
  const set = (key: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...filters, [key]: e.target.value };
    if (key === 'q') setFilters(next); else void run(next);
  };
  const field = 'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm';

  return (
    <div className="space-y-4">
      <form onSubmit={e => { e.preventDefault(); void run(filters); }} className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm md:grid-cols-2 xl:grid-cols-6">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={filters.q} onChange={set('q')} placeholder="ค้นหารายละเอียด ชื่อผู้ดำเนินการ หรือรหัสรายการ (กด Enter)" className={cn(field, 'w-full pl-9')} />
        </div>
        <select value={filters.actor} onChange={set('actor')} className={field}>
          <option value="">ผู้ดำเนินการทั้งหมด</option>
          {result?.actors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filters.resource} onChange={set('resource')} className={field}>
          <option value="">ทุกประเภทข้อมูล</option>
          {Object.entries(RESOURCES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={set('from')} className={field} aria-label="ตั้งแต่วันที่" />
        <input type="date" value={filters.to} onChange={set('to')} className={field} aria-label="ถึงวันที่" />
      </form>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm">
          <span className="font-bold text-slate-700">{result ? `${result.total.toLocaleString('th-TH')} รายการ` : ''}</span>
          <button type="button" onClick={() => void run(filters)} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> โหลดใหม่</button>
        </div>
        {!result?.logs.length ? (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-400"><History className="h-10 w-10 opacity-30" />{loading ? 'กำลังโหลด...' : 'ยังไม่มีประวัติ'}</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {result.logs.map(log => {
              const expanded = open === log.id;
              const action = ACTIONS[log.action] || ACTIONS.other;
              return (
                <li key={log.id}>
                  <button type="button" onClick={() => setOpen(expanded ? null : log.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50">
                    <span className={cn('mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold', action.style)}>{action.label}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{log.summary}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        <b className="text-slate-700">{log.actorName || log.actorUsername}</b> · {when(log.at)} · {RESOURCES[log.resource] || log.resource}
                      </span>
                    </span>
                    {log.changes.length > 0 && <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-slate-400 transition', expanded && 'rotate-180')} />}
                  </button>
                  {expanded && log.changes.length > 0 && (
                    <div className="px-4 pb-4">
                      <table className="w-full overflow-hidden rounded-xl border border-slate-100 text-xs">
                        <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-3 py-2">ข้อมูล</th><th className="px-3 py-2">ก่อน</th><th className="px-3 py-2">หลัง</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {log.changes.map((c, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-bold text-slate-700">{c.field}</td>
                              <td className="break-all px-3 py-2 text-rose-700">{show(c.before)}</td>
                              <td className="break-all px-3 py-2 text-emerald-700">{show(c.after)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="mt-1.5 text-[10px] text-slate-400">ผู้ใช้: {log.actorUsername}{log.ip ? ` · IP ${log.ip}` : ''}{log.resourceId ? ` · รหัส ${log.resourceId}` : ''}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {result && result.pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
            <button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage(p => p - 1); }} className="inline-flex items-center gap-1 font-bold text-slate-600 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /> ใหม่กว่า</button>
            <span className="text-slate-500">หน้า {result.page} / {result.pageCount}</span>
            <button type="button" disabled={page >= result.pageCount} onClick={() => { setLoading(true); setPage(p => p + 1); }} className="inline-flex items-center gap-1 font-bold text-slate-600 disabled:opacity-30">เก่ากว่า <ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-500">บันทึกทุกการเพิ่ม แก้ไข และลบข้อมูลโดยผู้ดูแล รหัสผ่าน คีย์ และเลขบัตรประชาชนจะไม่ถูกบันทึกเต็ม ประวัติแก้ไขหรือลบจากหน้านี้ไม่ได้</p>
    </div>
  );
}
