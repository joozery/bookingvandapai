'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Edit2, Plus, RefreshCw, Search, Upload, Wallet, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AdminPaymentRow } from '@/lib/adminPayments';
import type { Trip } from './types';

const money = (satang: number) => `฿ ${(satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const when = (ms?: number) => (ms ? new Date(ms).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' }) : '-');

const STATES = [
  { id: 'bookings', label: 'รายการจองที่นั่ง' },
  { id: 'received', label: 'มีการชำระเงิน' },
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
  exempt: 'bg-sky-50 text-sky-700 border-sky-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  unpaid: 'bg-rose-50 text-rose-700 border-rose-200',
  review: 'bg-rose-50 text-rose-700 border-rose-200',
  lapsed: 'bg-slate-100 text-slate-500 border-slate-200',
};

async function fetchPayments(page: number, q: string, tripId: string, state: string, tripStatus: string): Promise<{ rows?: AdminPaymentRow[]; total?: number; canEdit?: boolean; error?: string }> {
  try {
    if (state === 'bookings') {
      const params = new URLSearchParams({ q, tripId, tripStatus, page: String(page) });
      const res = await fetch(`/api/admin/payments/legacy?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!data.success) return { error: data.error || 'โหลดรายการจองไม่สำเร็จ' };
      const rows: AdminPaymentRow[] = (data.rows || []).map((candidate: { bookingId: string; tripId: string; tripName: string; departureDate: string; fullName: string; nickname: string; phone: string; lineUserName: string; seatLabel: string; vanNumber: number | null; totalSatang: number; manualPaidSatang: number; systemPaidSatang: number; balanceSatang: number; paymentOrderId?: string; paymentExempt?: boolean; payments?: { id: string; amountSatang: number; paidAt: number; method: string; note?: string }[] }) => {
        const paidSatang = candidate.manualPaidSatang + candidate.systemPaidSatang;
        const stateValue = candidate.paymentExempt ? 'exempt' : candidate.balanceSatang === 0 ? 'paid' : paidSatang > 0 ? 'partial' : 'unpaid';
        return {
          id: `booking:${candidate.bookingId}`, tripId: candidate.tripId, tripName: candidate.tripName, departureAt: Date.parse(`${candidate.departureDate}T00:00:00+07:00`), balanceDueAt: 0, createdAt: Date.now(),
          plan: 'full', state: stateValue as AdminPaymentRow['state'], stateLabel: candidate.paymentExempt ? 'ยกเว้นค่าใช้จ่าย' : stateValue === 'paid' ? 'ชำระครบถ้วน' : stateValue === 'partial' ? 'ชำระบางส่วน' : 'รอชำระ',
          totalSatang: candidate.totalSatang, paidSatang, balanceSatang: candidate.balanceSatang, openInvoiceSatang: 0, creditUsedSatang: 0, cashPaidSatang: paidSatang,
          userId: '', userName: candidate.lineUserName, booking: { id: candidate.bookingId, fullName: candidate.fullName, nickname: candidate.nickname, phone: candidate.phone, seatLabel: candidate.seatLabel, vanNumber: candidate.vanNumber, status: 'approved', paymentOrderId: candidate.paymentOrderId },
          receipts: (candidate.payments || []).map(payment => ({ transRef: `manual-${payment.id}`, paidAt: payment.paidAt, recordedAt: payment.paidAt, amountSatang: payment.amountSatang, payerName: '', payerBank: '', registrantName: candidate.fullName, seatLabel: candidate.seatLabel, reviewRequired: false, source: 'manual' as const, method: payment.method, note: payment.note })), adjustments: [], seatHistory: [], lastVerification: null,
        };
      });
      return { rows, total: data.total, canEdit: true };
    }
    const params = new URLSearchParams({ page: String(page), q, tripId, state, tripStatus });
    const res = await fetch(`/api/admin/payments?${params.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    if (!data.success) return { error: data.error || 'โหลดข้อมูลไม่สำเร็จ' };
    return { rows: data.payments, total: data.total, canEdit: data.canEdit !== false };
  } catch { return { error: 'โหลดข้อมูลไม่สำเร็จ' }; }
}

async function fetchPaymentSummary(q: string, tripId: string, state: string, tripStatus: string) {
  const params = new URLSearchParams({ q, tripId, state, tripStatus });
  const response = await fetch(`/api/admin/payments/summary?${params.toString()}`, { cache: 'no-store' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'สรุปยอดไม่สำเร็จ');
  return data.totals as { total: number; paid: number; balance: number };
}

export default function PaymentsTab({ trips }: { trips: Trip[] }) {
  const [rows, setRows] = useState<AdminPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [tripId, setTripId] = useState('all');
  const [state, setState] = useState('bookings');
  const [tripStatus, setTripStatus] = useState<'active' | 'completed' | 'all'>('active');
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [legacyBookingId, setLegacyBookingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminPaymentRow | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [summary, setSummary] = useState<{ total: number; paid: number; balance: number } | null>(null);
  const [summaryRefresh, setSummaryRefresh] = useState(0);
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
    apply(await fetchPayments(page, q, tripId, state, tripStatus));
  }, [apply, page, q, tripId, state, tripStatus]);
  useEffect(() => {
    let cancelled = false;
    void fetchPayments(page, q, tripId, state, tripStatus).then(result => { if (!cancelled) apply(result); });
    return () => { cancelled = true; };
  }, [apply, page, q, tripId, state, tripStatus]);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    void fetchPaymentSummary(q, tripId, state, tripStatus)
      .then(result => { if (!cancelled) setSummary(result); })
      .catch(() => { if (!cancelled) setSummary(null); });
    return () => { cancelled = true; };
  }, [q, tripId, state, tripStatus, summaryRefresh]);

  // Same rules as the server-side filter, so the export matches what is shown.
  const filtered = rows;

  const totals = useMemo(() => filtered.reduce((sum, row) => ({
    total: sum.total + row.totalSatang, paid: sum.paid + row.paidSatang, balance: sum.balance + row.balanceSatang,
  }), { total: 0, paid: 0, balance: 0 }), [filtered]);
  const displayedTotals = summary || totals;
  const pages = Math.max(1, Math.ceil(remoteTotal / 20));
  const currentPage = Math.min(page, pages);
  const visibleRows = filtered;
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', String(currentPage));
    window.history.replaceState(null, '', `/admin/payments?${params.toString()}`);
  }, [currentPage]);

  const tripOptions = useMemo(() => {
    const known = trips
      .filter(trip => tripStatus === 'all' || trip.status === tripStatus)
      .map(trip => ({ id: trip.id, name: trip.name }));
    // The page already loads the complete trip list. Do not add stale rows
    // back into a status-specific dropdown while a new filter is loading.
    if (tripStatus === 'all') {
      for (const row of rows) if (!known.some(t => t.id === row.tripId)) known.push({ id: row.tripId, name: row.tripName });
    }
    return known;
  }, [rows, trips, tripStatus]);

  const exportHref = `/api/admin/payments/export?${new URLSearchParams({ q, tripId, state, tripStatus }).toString()}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'ยอดที่ต้องชำระรวม', value: displayedTotals.total, tone: 'text-slate-900' },
          { label: 'ชำระแล้ว', value: displayedTotals.paid, tone: 'text-emerald-600' },
          { label: 'ยอดคงเหลือ', value: displayedTotals.balance, tone: 'text-amber-600' },
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
        <select value={tripStatus} onChange={e => { const value = e.target.value as 'active' | 'completed' | 'all'; setTripStatus(value); setTripId('all'); setPage(1); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
          <option value="active">ทริปที่เปิดอยู่</option>
          <option value="completed">ทริปที่ปิดไปแล้ว</option>
          <option value="all">ทุกทริป</option>
        </select>
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
          {canEdit && <button type="button" onClick={() => setLegacyOpen(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-sm font-bold text-white hover:bg-violet-700"><Plus className="h-4 w-4" />บันทึกยอดเดิม</button>}
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
                  <th className="w-14 px-3 py-3 text-center">ลำดับ</th>
                  <th className="w-8 px-3 py-3" />
                  <th className="px-3 py-3">ลูกทริป</th>
                  <th className="px-3 py-3">ทริป / ที่นั่ง</th>
                  <th className="whitespace-nowrap px-5 py-3 text-right">ต้องชำระ</th>
                  <th className="whitespace-nowrap px-5 py-3 text-right">ชำระแล้ว</th>
                  <th className="whitespace-nowrap px-5 py-3 text-right">คงเหลือ</th>
                  <th className="px-3 py-3">สถานะ</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((row, index) => {
                  const open = expanded === row.id;
                  const rowNumber = (currentPage - 1) * 20 + index + 1;
                  return (
                    <React.Fragment key={row.id}>
                      <tr className={cn('cursor-pointer hover:bg-violet-50/40', open && 'bg-violet-50/40')} onClick={() => setExpanded(open ? null : row.id)}>
                        <td className="px-3 py-3 text-center font-bold text-slate-400">{rowNumber}</td>
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
                        <td className="whitespace-nowrap px-5 py-3 text-right font-bold tabular-nums text-slate-800">{money(row.totalSatang)}</td>
                        <td className="whitespace-nowrap px-5 py-3 text-right font-bold tabular-nums text-emerald-600">{money(row.paidSatang)}{row.creditUsedSatang > 0 && <p className="text-[10px] font-normal tabular-nums text-violet-600">เครดิต {money(row.creditUsedSatang)} · เงิน {money(row.cashPaidSatang)}</p>}</td>
                        <td className={cn('whitespace-nowrap px-5 py-3 text-right font-bold tabular-nums', row.balanceSatang ? 'text-amber-600' : 'text-slate-400')}>{money(row.balanceSatang)}</td>
                        <td className="px-3 py-3">
                          <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold', STATE_STYLE[row.state])}>{row.stateLabel}</span>
                          {row.balanceSatang > 0 && row.paidSatang > 0 && <p className="mt-1 text-[11px] text-slate-400">ครบกำหนด {when(row.balanceDueAt)}</p>}
                        </td>
                        <td className="px-3 py-3 text-right" onClick={e => e.stopPropagation()}>
                          {canEdit && (
                            <button type="button" onClick={() => {
                              if (row.id.startsWith('booking:')) {
                                setLegacyBookingId(row.id.slice('booking:'.length));
                                setLegacyOpen(true);
                              } else {
                                setEditing(row);
                              }
                            }} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50">
                              <Edit2 className="h-3.5 w-3.5" /> แก้ยอด
                            </button>
                          )}
                        </td>
                      </tr>
                      {open && <tr><td colSpan={9} className="bg-slate-50/60 px-6 py-4"><PaymentDetail row={row} /></td></tr>}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {remoteTotal > 20 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><span className="text-[11px] text-slate-400">แสดง {(currentPage - 1) * 20 + 1}-{Math.min(currentPage * 20, remoteTotal)} จาก {remoteTotal} รายการ</span><div className="flex items-center gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-violet-50 disabled:opacity-30" aria-label="หน้าก่อนหน้า"><ChevronLeft className="h-4 w-4" /></button><span className="text-[11px] font-bold text-slate-500">{currentPage} / {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-violet-50 disabled:opacity-30" aria-label="หน้าถัดไป"><ChevronRight className="h-4 w-4" /></button></div></div>}
      </div>

      {editing && <AdjustDialog row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setSummaryRefresh(value => value + 1); void load(); }} />}
      {legacyOpen && <LegacyPaymentDialog trips={trips} initialBookingId={legacyBookingId} initialTripStatus={tripStatus} onClose={() => { setLegacyOpen(false); setLegacyBookingId(null); }} onChanged={() => { setSummaryRefresh(value => value + 1); void load(); }} onSaved={() => { setLegacyOpen(false); setLegacyBookingId(null); setSummaryRefresh(value => value + 1); void load(); }} />}
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
              <li key={r.transRef} className={cn('rounded-xl border border-slate-200 bg-white p-3 text-xs', r.source === 'manual' && 'manual-receipt')}>
                <div className="flex justify-between gap-2 font-bold"><span>{when(r.paidAt)}</span><span className="text-emerald-600">{money(r.amountSatang)}</span></div>
                <p className="mt-1 text-slate-600">ผู้โอน: {r.payerName || '-'}{r.payerBank && ` (${r.payerBank})`}</p>
                <p className="text-slate-600">ผู้ลงทะเบียน: {r.registrantName || '-'} · ที่นั่งขณะชำระ: {r.seatLabel || 'ยังไม่เลือก'}</p>
                <p className="text-slate-400">เลขอ้างอิง: {r.transRef}</p>
                {r.reviewRequired && <p className="mt-1 font-bold text-rose-600">รอแอดมินตรวจสอบยอดนี้</p>}
                <p className="manual-reason">{r.source === 'manual' ? `\u0e40\u0e2b\u0e15\u0e38\u0e1c\u0e25: ${r.note || r.method || '-'}` : ''}</p>
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
        {row.booking?.currentTraveler && <div><h4 className="mb-1 text-xs font-black text-slate-700">ผู้เดินทางปัจจุบัน</h4><p className="text-slate-600">{row.booking.currentTraveler.fullName} · {row.booking.currentTraveler.phone}</p><p className="text-[11px] text-slate-400">ธุรกรรมเดิมยังผูกกับผู้จอง/ผู้โอนเดิม</p></div>}
        {!!row.booking?.transferHistory?.length && <div><h4 className="mb-1 text-xs font-black text-slate-700">ประวัติเปลี่ยนผู้เดินทาง</h4><ul className="space-y-1 text-slate-600">{row.booking.transferHistory.map(item => <li key={`${item.changedAt}-${item.toPhone}`}>{when(Date.parse(item.changedAt))} · {item.fromName || '-'} → {item.toName} · {item.toPhone}</li>)}</ul></div>}
        {row.booking?.id && row.booking.status === 'approved' && <TransferLinkButton bookingId={row.booking.id} />}
      </div>
    </div>
  );
}

function TransferLinkButton({ bookingId }: { bookingId: string }) {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function createLink() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/bookings/${encodeURIComponent(bookingId)}/transfer`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'สร้างลิงก์ไม่สำเร็จ');
      const value = `${window.location.origin}/transfer/${result.transfer.token}`;
      setLink(value);
      await navigator.clipboard?.writeText(value);
      setMessage('สร้างลิงก์แล้ว และคัดลอกไว้ให้แล้ว');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'สร้างลิงก์ไม่สำเร็จ'); }
    finally { setBusy(false); }
  }
  return <div className="rounded-xl border border-violet-200 bg-violet-50 p-3"><p className="font-black text-violet-900">เปลี่ยนผู้เดินทางแทน</p><p className="mt-1 text-[11px] text-violet-700">สร้างลิงก์เฉพาะ booking/ที่นั่งนี้ ผู้รับแทนจะกรอกข้อมูลประกันโดยไม่สร้างธุรกรรมใหม่</p><button type="button" disabled={busy} onClick={() => void createLink()} className="mt-2 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? 'กำลังสร้าง…' : link ? 'สร้างลิงก์ใหม่' : 'สร้างลิงก์ลงทะเบียน'}</button>{link && <input readOnly value={link} onFocus={event => event.currentTarget.select()} className="mt-2 w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-[10px] text-slate-600" />}{message && <p className="mt-1 text-[11px] font-bold text-violet-700">{message}</p>}</div>;
}

function AdjustDialog({ row, onClose, onSaved }: { row: AdminPaymentRow; onClose: () => void; onSaved: () => void }) {
  const [total, setTotal] = useState(String(row.totalSatang / 100));
  const [note, setNote] = useState('');
  const [staffExempt, setStaffExempt] = useState(false);
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

  const toggleStaff = async (checked: boolean) => {
    if (!row.booking?.id) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/admin/payments/legacy/booking/${encodeURIComponent(row.booking.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentExempt: checked }) });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'บันทึกสถานะ Staff ไม่สำเร็จ');
      setStaffExempt(checked);
      setError('บันทึกสถานะ Staff แล้ว');
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกสถานะ Staff ไม่สำเร็จ'); }
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
          {row.booking?.id && <label className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800"><input type="checkbox" checked={staffExempt} disabled={busy} onChange={e => void toggleStaff(e.target.checked)} />กำหนดรายการนี้เป็น Staff / ยกเว้นค่าใช้จ่าย</label>}
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

type LegacyCandidate = {
  bookingId: string; tripId: string; tripName: string; departureDate: string; fullName: string; nickname: string; phone: string;
  lineUserName: string; seatLabel: string; seatType: string; vanNumber: number | null; totalSatang: number; manualPaidSatang: number; systemPaidSatang: number; balanceSatang: number; paymentOrderId?: string; paymentExempt?: boolean;
  payments: { id: string; amountSatang: number; paidAt: number; method: string; note?: string; receiptKey?: string }[];
};

function LegacyPaymentDialog({ trips, initialBookingId, initialTripStatus, onClose, onChanged, onSaved }: { trips: Trip[]; initialBookingId?: string | null; initialTripStatus: 'active' | 'completed' | 'all'; onClose: () => void; onChanged: () => void; onSaved: () => void }) {
  const [q, setQ] = useState('');
  const [tripId, setTripId] = useState('all');
  const [candidates, setCandidates] = useState<LegacyCandidate[]>([]);
  const [selected, setSelected] = useState<LegacyCandidate | null>(null);
  const [totalDue, setTotalDue] = useState('');
  const [totalDueNote, setTotalDueNote] = useState('');
  const totalDueBookingId = useRef<string | null>(null);
  const [lookupBookingId, setLookupBookingId] = useState(initialBookingId || '');
  const initialSelectionDone = useRef(false);
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('bank_transfer');
  const [note, setNote] = useState('');
  const [slip, setSlip] = useState<File | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [savingExempt, setSavingExempt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ q, tripId, tripStatus: initialTripStatus, page: '1' });
      if (lookupBookingId) params.set('bookingId', lookupBookingId);
      const response = await fetch(`/api/admin/payments/legacy?${params.toString()}`, { cache: 'no-store' });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'โหลดรายการไม่สำเร็จ');
      setCandidates(data.rows || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดรายการไม่สำเร็จ'); }
    finally { setLoading(false); }
  }, [q, tripId, lookupBookingId, initialTripStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!initialBookingId || initialSelectionDone.current || selected || !candidates.length) return;
    const match = candidates.find(candidate => candidate.bookingId === initialBookingId);
    if (!match) return;
    const timer = window.setTimeout(() => {
      initialSelectionDone.current = true;
      setSelected(match);
      setLookupBookingId('');
      setTotalDue(String(match.totalSatang / 100));
      setAmount(match.balanceSatang > 0 ? String(match.balanceSatang / 100) : '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [candidates, initialBookingId, selected]);

  useEffect(() => {
    if (!selected || totalDueBookingId.current === selected.bookingId) return;
    totalDueBookingId.current = selected.bookingId;
    setTotalDue(String(selected.totalSatang / 100));
  }, [selected]);

  const saveTotalDue = async () => {
    if (!selected?.paymentOrderId) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/admin/payments/${encodeURIComponent(selected.paymentOrderId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalBaht: Number(totalDue), note: totalDueNote.trim() || 'แก้ไขยอดที่ต้องชำระจากหน้าแอดมิน' }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'บันทึกยอดที่ต้องชำระไม่สำเร็จ');
      const nextTotal = Number(data.totalSatang);
      const nextPaid = Number(data.paidSatang);
      setSelected(previous => previous ? { ...previous, totalSatang: nextTotal, balanceSatang: Math.max(0, nextTotal - nextPaid) } : previous);
      setTotalDueNote('');
      onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกยอดที่ต้องชำระไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      let response: Response;
      if (editingPaymentId) {
        response = await fetch(`/api/admin/payments/legacy/${encodeURIComponent(editingPaymentId)}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amountBaht: Number(amount), paidAt, method, note }),
        });
      } else {
        const form = new FormData();
        form.set('bookingId', selected.bookingId); form.set('amountBaht', amount); form.set('paidAt', paidAt); form.set('method', method); form.set('note', note);
        if (slip) form.set('receipt', slip);
        response = await fetch('/api/admin/payments/legacy', { method: 'POST', body: form });
      }
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  const editPayment = (payment: LegacyCandidate['payments'][number]) => {
    setEditingPaymentId(payment.id);
    setSelected(previous => previous ? { ...previous, balanceSatang: previous.balanceSatang + payment.amountSatang } : previous);
    setAmount(String(payment.amountSatang / 100));
    setPaidAt(new Date(payment.paidAt).toISOString().slice(0, 10));
    setMethod(payment.method);
    setNote(payment.note || '');
    setSlip(null);
    setError('');
  };

  const deletePayment = async (paymentId: string) => {
    if (!window.confirm('ยืนยันลบรายการชำระเงินนี้หรือไม่?')) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/admin/payments/legacy/${encodeURIComponent(paymentId)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'ลบรายการไม่สำเร็จ');
      onSaved();
    } catch (e) { setError(e instanceof Error ? e.message : 'ลบรายการไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  const setStaffExempt = async (exempt: boolean) => {
    if (!selected) return;
    setSavingExempt(true); setError('');
    try {
      const response = await fetch(`/api/admin/payments/legacy/booking/${encodeURIComponent(selected.bookingId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentExempt: exempt }) });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'บันทึกประเภทที่นั่งไม่สำเร็จ');
      setSelected(previous => previous ? { ...previous, paymentExempt: exempt, totalSatang: exempt ? 0 : previous.totalSatang, balanceSatang: exempt ? 0 : previous.balanceSatang } : previous);
      setError('บันทึกสถานะ Staff แล้ว');
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกประเภทที่นั่งไม่สำเร็จ'); }
    finally { setSavingExempt(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
    <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
      <div className="mb-4 flex items-start justify-between"><div><h3 className="font-black text-slate-900">บันทึกยอดที่ชำระก่อนมีระบบ</h3><p className="text-xs text-slate-500">เลือก Booking เดิม แล้วเพิ่มรายการชำระได้หลายครั้ง</p></div><button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button></div>
      {!selected ? <>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row"><Input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อ, LINE Name, เบอร์โทร" className="h-10 flex-1" /><select value={tripId} onChange={e => setTripId(e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="all">ทุกทริปที่เปิดอยู่</option>{trips.filter(trip => trip.status === 'active').map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select><button type="button" onClick={() => void load()} className="rounded-lg border px-3 text-sm font-bold">ค้นหา</button></div>
        {error && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}
        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-100"><table className="w-full min-w-[760px] text-sm"><thead className="sticky top-0 bg-slate-50 text-left text-xs font-bold text-slate-500"><tr><th className="px-3 py-2">ลูกค้า / LINE</th><th className="px-3 py-2">ทริป / ที่นั่ง</th><th className="px-3 py-2 text-right">จ่ายแล้ว</th><th className="px-3 py-2 text-right">คงเหลือ</th><th /></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">กำลังโหลด...</td></tr> : candidates.map(candidate => { const hasHistory = candidate.payments.length > 0; const disabled = candidate.paymentExempt || (!candidate.balanceSatang && !hasHistory); return <tr key={candidate.bookingId}><td className="px-3 py-3"><p className="font-bold">{candidate.fullName || '-'}</p><p className="text-xs text-slate-500">{candidate.lineUserName || '-'} · {candidate.phone || '-'}</p></td><td className="px-3 py-3"><p className="font-semibold">{candidate.tripName}</p><p className="text-xs text-slate-500">รถ {candidate.vanNumber ?? '-'} · {candidate.seatLabel || '-'}</p></td><td className="px-3 py-3 text-right font-bold text-emerald-600">{candidate.paymentExempt ? 'ยกเว้น' : money(candidate.manualPaidSatang + candidate.systemPaidSatang)}</td><td className="px-3 py-3 text-right font-bold text-amber-600">{candidate.paymentExempt ? money(0) : money(candidate.balanceSatang)}</td><td className="px-3 py-3 text-right"><button type="button" disabled={disabled} onClick={() => { setSelected(candidate); setAmount(candidate.balanceSatang > 0 ? String(candidate.balanceSatang / 100) : ''); }} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">{candidate.paymentExempt ? 'ยกเว้นค่าใช้จ่าย' : hasHistory ? 'แก้ไข' : 'เพิ่มยอด'}</button></td></tr>; })}</tbody></table></div>
      </> : <div className="space-y-4"><button type="button" onClick={() => setSelected(null)} className="text-xs font-bold text-violet-600">← เลือกลูกค้าคนอื่น</button><div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="font-black">{selected.fullName} <span className="font-normal text-slate-500">({selected.lineUserName || 'ไม่มี LINE Name'})</span></p><p className="mt-1 text-xs text-slate-500">{selected.tripName} · รถ {selected.vanNumber ?? '-'} · ที่นั่ง {selected.seatLabel || '-'}</p><p className="mt-2 text-xs">ราคาทริป {money(selected.totalSatang)} · จ่ายรวมแล้ว {money(selected.totalSatang - selected.balanceSatang)} · คงเหลือ {money(selected.balanceSatang)}</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">ยอดที่ชำระครั้งนี้<Input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 h-10" /></label><label className="text-xs font-bold">วันที่ชำระ<Input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} className="mt-1 h-10" /></label><label className="text-xs font-bold">วิธีชำระ<select value={method} onChange={e => setMethod(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"><option value="bank_transfer">โอนธนาคาร</option><option value="cash">เงินสด</option><option value="other">อื่น ๆ</option></select></label><label className="text-xs font-bold">แนบสลิป (ถ้ามี)<span className="mt-1 flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 font-normal"><Upload className="h-4 w-4" /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setSlip(e.target.files?.[0] || null)} className="min-w-0 text-xs" /></span></label></div><label className="block text-xs font-bold">หมายเหตุ<Input value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น โอนก่อนเริ่มใช้ระบบ" className="mt-1 h-10" /></label>{error && <p className="rounded-lg bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}<button type="button" disabled={saving || !amount || Number(amount) <= 0 || Number(amount) * 100 > selected.balanceSatang} onClick={() => void save()} className="h-10 w-full rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-40">{saving ? 'กำลังบันทึก...' : 'บันทึกยอดชำระเดิม'}</button></div>}
      {selected && selected.payments.length > 0 && <div className="mt-3 space-y-2 rounded-xl border border-slate-100 p-3"><p className="text-xs font-black text-slate-700">รายการชำระเดิม</p>{selected.payments.map(payment => <div key={payment.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"><div><p className="font-bold">{money(payment.amountSatang)} · {new Date(payment.paidAt).toLocaleDateString('th-TH')}</p><p className="text-slate-500">{payment.note || payment.method}</p></div><div className="flex gap-1"><button type="button" onClick={() => editPayment(payment)} className="rounded-md border px-2 py-1 font-bold"><Edit2 className="mr-1 inline h-3 w-3" />แก้ไข</button><button type="button" onClick={() => void deletePayment(payment.id)} className="rounded-md border border-rose-200 px-2 py-1 font-bold text-rose-600">ลบ</button></div></div>)}</div>}
      {selected && <label className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800"><input type="checkbox" disabled={savingExempt} checked={selected.paymentExempt === true} onChange={e => void setStaffExempt(e.target.checked)} />กำหนดที่นั่งนี้เป็น Staff / ยกเว้นค่าใช้จ่าย</label>}
    {selected?.paymentOrderId && <TotalDueEditor totalDue={totalDue} setTotalDue={setTotalDue} totalDueNote={totalDueNote} setTotalDueNote={setTotalDueNote} currentTotalSatang={selected.totalSatang} paidSatang={selected.totalSatang - selected.balanceSatang} saving={saving} onSave={() => void saveTotalDue()} />}
    </div>
  </div>;
}

function TotalDueEditor({ totalDue, setTotalDue, totalDueNote, setTotalDueNote, currentTotalSatang, paidSatang, saving, onSave }: { totalDue: string; setTotalDue: (value: string) => void; totalDueNote: string; setTotalDueNote: (value: string) => void; currentTotalSatang: number; paidSatang: number; saving: boolean; onSave: () => void }) {
  const nextSatang = Math.round(Number(totalDue) * 100);
  const valid = Number.isFinite(nextSatang) && nextSatang >= paidSatang && nextSatang > 0 && nextSatang !== currentTotalSatang;
  return <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs">
    <p className="font-black text-violet-900">แก้ไขยอดที่ต้องชำระทั้งหมด</p>
    <p className="mt-1 text-violet-700">เดิม {money(currentTotalSatang)} · ชำระแล้ว {money(paidSatang)} · คงเหลือใหม่ {money(Math.max(0, nextSatang - paidSatang))}</p>
    <Input type="number" min={paidSatang / 100} step="0.01" value={totalDue} onChange={event => setTotalDue(event.target.value)} className="mt-2 h-9 bg-white" />
    <Input value={totalDueNote} onChange={event => setTotalDueNote(event.target.value)} placeholder="เหตุผลการแก้ไขยอด" className="mt-2 h-9 bg-white" />
    <button type="button" disabled={!valid || saving} onClick={onSave} className="mt-2 rounded-lg bg-violet-600 px-3 py-2 font-bold text-white disabled:opacity-40">{saving ? 'กำลังบันทึก...' : 'บันทึกยอดที่ต้องชำระ'}</button>
  </div>;
}
