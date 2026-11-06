'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Edit2, RefreshCw, Search, Wallet, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AdminPaymentRow } from '@/lib/adminPayments';
import type { Trip } from './types';

const money = (satang: number) => `฿${(satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const when = (ms?: number) => (ms ? new Date(ms).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }) : '-');

const STATES = [
  { id: 'active', label: 'ทั้งหมด (ไม่รวมที่หมดเวลา)' },
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'partial', label: 'ชำระบางส่วน' },
  { id: 'paid', label: 'ชำระครบถ้วน' },
  { id: 'unpaid', label: 'รอชำระ' },
  { id: 'review', label: 'รอแอดมินตรวจสอบ' },
  { id: 'lapsed', label: 'หมดเวลา (ไม่ได้ชำระ)' },
];
const STATE_STYLE: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  unpaid: 'bg-sky-50 text-sky-700 border-sky-200',
  review: 'bg-rose-50 text-rose-700 border-rose-200',
  lapsed: 'bg-slate-100 text-slate-500 border-slate-200',
};

async function fetchPayments(page: number, q: string, tripId: string, state: string): Promise<{ rows?: AdminPaymentRow[]; total?: number; canEdit?: boolean; error?: string }> {
  try {
    const params = new URLSearchParams({ page: String(page), q, tripId, state });
    const res = await fetch(`/api/admin/payments?${params.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) return { error: data.error || 'โหลดข้อมูลไม่สำเร็จ' };
    return { rows: data.payments, total: data.total, canEdit: data.canEdit !== false };
  } catch { return { error: 'โหลดข้อมูลไม่สำเร็จ' }; }
}

export default function PaymentsTab({ trips }: { trips: Trip[] }) {
  const [rows, setRows] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [tripId, setTripId] = useState('all');
  const [state, setState] = useState('active');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminPaymentRow | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [page, setPage] = useState(() => typeof window === 'undefined' ? 1 : Math.max(1, Number(new URLSearchParams(window.location.search).get('page')) || 1));

  const apply = useCallback((result: { rows?: AdminPaymentRow[]; total?: number; canEdit?: boolean; error?: string }) => {
    if (result.rows) setRows(result.rows);
    if (result.total !== undefined) setRemoteTotal(result.total);
    if (result.canEdit !== undefined) setCanEdit(result.canEdit);
    setError(result.error || '');
    setLoading(false);
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    apply(await fetchPayments(page, q, tripId, state));
  }, [apply, page, q, tripId, state]);
  useEffect(() => {
    let cancelled = false;
    void fetchPayments(page, q, tripId, state).then(result => { if (!cancelled) apply(result); });
    return () => { cancelled = true; };
  }, [apply, page, q, tripId, state]);

  // Same rules as the server-side filter, so the export matches what is shown.
  const filtered = rows;

  const totals = useMemo(() => filtered.reduce((sum, row) => ({
    total: sum.total + row.totalSatang, paid: sum.paid + row.paidSatang, balance: sum.balance + row.balanceSatang,
  }), { total: 0, paid: 0, balance: 0 }), [filtered]);
  const pages = Math.max(1, Math.ceil(remoteTotal / 20));
  const currentPage = Math.min(page, pages);
  const visibleRows = filtered;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', String(currentPage));
    window.history.replaceState(null, '', `/admin/payments?${params.toString()}`);
  }, [currentPage]);

  const tripOptions = useMemo(() => {
    const known = trips.map(trip => ({ id: trip.id, name: trip.name }));
    for (const row of rows) if (!known.some(t => t.id === row.tripId)) known.push({ id: row.tripId, name: row.tripName });
    return known;
  }, [rows, trips]);

  const exportHref = `/api/admin/payments/export?${new URLSearchParams({ q, tripId, state }).toString()}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'ยอดที่ต้องชำระรวม', value: totals.total, tone: 'text-slate-900' },
          { label: 'ชำระแล้ว', value: totals.paid, tone: 'text-emerald-600' },
          { label: 'ยอดคงเหลือ', value: totals.balance, tone: 'text-amber-600' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500">{card.label}</p>
            <p className={cn('mt-1 text-2xl font-black', card.tone)}>{money(card.value)}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">จาก {filtered.length} รายการที่แสดง</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="ค้นหาชื่อ, ชื่อผู้โอน, เบอร์, ที่นั่ง, เลขอ้างอิงการโอน, เลขรายการ" className="h-10 pl-9 text-sm" />
        </div>
        <select value={tripId} onChange={e => { setTripId(e.target.value); setPage(1); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
          <option value="all">ทุกทริป</option>
          {tripOptions.map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
        </select>
        <select value={state} onChange={e => { setState(e.target.value); setPage(1); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
          {STATES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> โหลดใหม่
          </button>
          <a href={exportHref} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700">
            <Download className="h-4 w-4" /> ส่งออก Excel
          </a>
        </div>
      </div>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading && !rows.length ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400"><RefreshCw className="h-5 w-5 animate-spin text-violet-600" /> กำลังโหลด...</div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-slate-400"><Wallet className="h-10 w-10 opacity-30" /> ไม่พบรายการชำระเงิน</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
                <tr>
                  <th className="w-8 px-3 py-3" />
                  <th className="px-3 py-3">ลูกทริป</th>
                  <th className="px-3 py-3">ทริป / ที่นั่ง</th>
                  <th className="px-3 py-3 text-right">ต้องชำระ</th>
                  <th className="px-3 py-3 text-right">ชำระแล้ว</th>
                  <th className="px-3 py-3 text-right">คงเหลือ</th>
                  <th className="px-3 py-3">สถานะ</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map(row => {
                  const open = expanded === row.id;
                  return (
                    <React.Fragment key={row.id}>
                      <tr className={cn('cursor-pointer hover:bg-violet-50/40', open && 'bg-violet-50/40')} onClick={() => setExpanded(open ? null : row.id)}>
                        <td className="px-3 py-3 text-slate-400">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                        <td className="px-3 py-3">
                          <p className="font-bold text-slate-800">{row.booking?.fullName || row.receipts.find(r => r.registrantName)?.registrantName || row.userName || '-'}</p>
                          <p className="text-xs text-slate-500">{[row.booking?.nickname, row.booking?.phone, row.userName && `LINE: ${row.userName}`].filter(Boolean).join(' · ')}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-700">{row.tripName}</p>
                          <p className="text-xs text-slate-500">
                            {row.booking ? `รถคันที่ ${row.booking.vanNumber ?? '-'} · ที่นั่ง ${row.booking.seatLabel || '-'}` : 'ยังไม่เลือกที่นั่ง'}
                            {' · '}{row.plan === 'deposit' ? 'มัดจำ' : 'ชำระเต็ม'}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-slate-800">{money(row.totalSatang)}</td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-600">{money(row.paidSatang)}{row.creditUsedSatang > 0 && <p className="text-[10px] font-normal text-violet-600">เครดิต ฿{money(row.creditUsedSatang)} · เงิน ฿{money(row.cashPaidSatang)}</p>}</td>
                        <td className={cn('px-3 py-3 text-right font-bold', row.balanceSatang ? 'text-amber-600' : 'text-slate-400')}>{money(row.balanceSatang)}</td>
                        <td className="px-3 py-3">
                          <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold', STATE_STYLE[row.state])}>{row.stateLabel}</span>
                          {row.balanceSatang > 0 && row.paidSatang > 0 && <p className="mt-1 text-[11px] text-slate-400">ครบกำหนด {when(row.balanceDueAt)}</p>}
                        </td>
                        <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                          {canEdit && ['partial', 'paid'].includes(row.state) && (
                            <button type="button" onClick={() => setEditing(row)} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50">
                              <Edit2 className="h-3.5 w-3.5" /> แก้ยอด
                            </button>
                          )}
                        </td>
                      </tr>
                      {open && <tr><td colSpan={8} className="bg-slate-50/60 px-6 py-4"><PaymentDetail row={row} /></td></tr>}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {remoteTotal > 20 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><span className="text-[11px] text-slate-400">แสดง {(currentPage - 1) * 20 + 1}-{Math.min(currentPage * 20, remoteTotal)} จาก {remoteTotal} รายการ</span><div className="flex items-center gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-violet-50 disabled:opacity-30" aria-label="หน้าก่อนหน้า"><ChevronLeft className="h-4 w-4" /></button><span className="text-[11px] font-bold text-slate-500">{currentPage} / {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-violet-50 disabled:opacity-30" aria-label="หน้าถัดไป"><ChevronRight className="h-4 w-4" /></button></div></div>}
      </div>

      {editing && <AdjustDialog row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void load(); }} />}
    </div>
  );
}

function PaymentDetail({ row }: { row: AdminPaymentRow }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <h4 className="mb-2 text-xs font-black text-slate-700">ประวัติการโอน (ตรวจสลิปอัตโนมัติ)</h4>
        {row.receipts.length ? (
          <ul className="space-y-2">
            {row.receipts.map(r => (
              <li key={r.transRef} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex justify-between gap-2 font-bold"><span>{when(r.paidAt)}</span><span className="text-emerald-600">{money(r.amountSatang)}</span></div>
                <p className="mt-1 text-slate-600">ผู้โอน: {r.payerName || '-'}{r.payerBank && ` (${r.payerBank})`}</p>
                <p className="text-slate-600">ผู้ลงทะเบียน: {r.registrantName || '-'} · ที่นั่งขณะชำระ: {r.seatLabel || 'ยังไม่เลือก'}</p>
                <p className="text-slate-400">เลขอ้างอิง: {r.transRef}</p>
                {r.reviewRequired && <p className="mt-1 font-bold text-rose-600">รอแอดมินตรวจสอบยอดนี้</p>}
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-slate-400">ยังไม่มีการโอน</p>}
        {row.lastVerification && row.state !== 'paid' && (
          <p className="mt-2 text-[11px] text-slate-500">ตรวจสลิปล่าสุด {when(row.lastVerification.checkedAt)}: {row.lastVerification.message}</p>
        )}
      </div>
      <div className="space-y-3 text-xs">
        <div>
          <h4 className="mb-1 text-xs font-black text-slate-700">รายละเอียดรายการ</h4>
          <p className="text-slate-600">สร้างเมื่อ {when(row.createdAt)} · เดินทาง {when(row.departureAt)}</p>
          {row.openInvoiceSatang > 0 && <p className="text-slate-600">มี QR รอชำระ {money(row.openInvoiceSatang)}</p>}
          <p className="text-slate-400">เลขรายการ: {row.id}</p>
        </div>
        {row.adjustments.length > 0 && (
          <div>
            <h4 className="mb-1 text-xs font-black text-slate-700">ประวัติแก้ไขยอด</h4>
            <ul className="space-y-1 text-slate-600">
              {row.adjustments.map(a => <li key={a.at}>{when(a.at)} · {money(a.fromSatang)} → {money(a.toSatang)} · {a.note} · โดย {a.by}</li>)}
            </ul>
          </div>
        )}
        {row.seatHistory.length > 0 && (
          <div>
            <h4 className="mb-1 text-xs font-black text-slate-700">ประวัติย้ายที่นั่ง</h4>
            <ul className="space-y-1 text-slate-600">
              {row.seatHistory.map(h => <li key={h.movedAt}>{when(h.movedAt)} · {h.from ? `${h.from.seatLabel} → ` : ''}{h.seatLabel}{h.vanNumber ? ` (รถคันที่ ${h.vanNumber})` : ''} · โดย {h.by}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function AdjustDialog({ row, onClose, onSaved }: { row: AdminPaymentRow; onClose: () => void; onSaved: () => void }) {
  const [total, setTotal] = useState(String(row.totalSatang / 100));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const newSatang = Math.round(Number(total) * 100);
  const valid = Number.isFinite(newSatang) && newSatang >= row.paidSatang && newSatang > 0;

  const save = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/admin/payments/${encodeURIComponent(row.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ totalBaht: Number(total), note }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-black text-slate-900">แก้ไขยอดที่ต้องชำระ</h3>
            <p className="text-xs text-slate-500">{row.booking?.fullName || row.userName} · {row.tripName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 text-sm">
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">ยอดเดิม {money(row.totalSatang)} · ชำระแล้ว {money(row.paidSatang)}</p>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">ยอดที่ต้องชำระใหม่ (บาท)</span>
            <Input type="number" min={row.paidSatang / 100} step="0.01" value={total} onChange={e => setTotal(e.target.value)} className="mt-1 h-10 font-bold" />
          </label>
          {valid && <p className="text-xs text-slate-600">ยอดคงเหลือใหม่: <b className="text-amber-600">{money(newSatang - row.paidSatang)}</b>{newSatang === row.paidSatang && ' (จะเป็น “ชำระครบถ้วน”)'}</p>}
          {!valid && total !== '' && <p className="text-xs font-bold text-rose-600">ยอดใหม่ต้องไม่น้อยกว่ายอดที่ชำระแล้ว</p>}
          <label className="block">
            <span className="text-xs font-bold text-slate-700">เหตุผล <span className="text-rose-500">*</span></span>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น ส่วนลดกลุ่ม, ค่าที่นั่งเพิ่ม" className="mt-1 h-10" />
          </label>
          {row.openInvoiceSatang > 0 && <p className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-700">ลูกค้ามี QR ยอดคงเหลือเดิมเปิดอยู่ ระบบจะยกเลิก QR นั้น กรุณาแจ้งลูกค้าให้กด “ชำระยอดคงเหลือ” ใหม่ และไม่โอนตาม QR เดิม</p>}
          {error && <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}
          <button type="button" disabled={!valid || !note.trim() || busy} onClick={() => void save()} className="h-10 w-full rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-40">
            {busy ? 'กำลังบันทึก...' : 'บันทึกยอดใหม่'}
          </button>
        </div>
      </div>
    </div>
  );
}
