'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, RefreshCw, Search, ArrowDownLeft, ArrowUpRight, ArrowRight, ChevronLeft, ChevronRight, ChartNoAxesCombined, Wallet, Clock3, Users, Map as MapIcon, ReceiptText, LayoutDashboard, FileSpreadsheet, Plus, CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminPaymentRow } from '@/lib/adminPayments';
import EntriesPanel, { EntryForm } from './EntriesPanel';
import PartnersPanel from './PartnersPanel';
import { fieldClass, money, PAYMENT_CATEGORY_ID, PAYMENT_CATEGORY_NAME, profitTone, Stat, thaiDate, type AccountingData } from './shared';

const VIEWS = [
  { id: 'overview', label: 'ภาพรวม', icon: LayoutDashboard },
  { id: 'trip', label: 'บัญชีรายทริป', icon: MapIcon },
  { id: 'income', label: 'รายรับ', icon: ArrowDownLeft },
  { id: 'expense', label: 'รายจ่าย', icon: ArrowUpRight },
  { id: 'partners', label: 'หุ้นส่วน', icon: Users },
  { id: 'report', label: 'รายงาน', icon: FileSpreadsheet },
] as const;
type View = typeof VIEWS[number]['id'];

async function fetchAccounting(): Promise<{ data?: AccountingData; error?: string }> {
  try {
    const res = await fetch('/api/admin/accounting', { cache: 'no-store' });
    const json = await res.json();
    return json.success ? { data: json } : { error: json.error || 'โหลดข้อมูลบัญชีไม่สำเร็จ' };
  } catch { return { error: 'โหลดข้อมูลบัญชีไม่สำเร็จ' }; }
}

export default function AccountingTab() {
  const [view, setView] = useState<View>('overview');
  const [data, setData] = useState<AccountingData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tripId, setTripId] = useState('');
  const [quickEntry, setQuickEntry] = useState<'income' | 'expense' | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const apply = useCallback((result: { data?: AccountingData; error?: string }) => {
    if (result.data) { setData(result.data); setUpdatedAt(new Date()); }
    setError(result.error || '');
    setLoading(false);
  }, []);
  const reload = useCallback(async () => { setLoading(true); apply(await fetchAccounting()); }, [apply]);
  useEffect(() => {
    let cancelled = false;
    void fetchAccounting().then(result => { if (!cancelled) apply(result); });
    return () => { cancelled = true; };
  }, [apply]);

  const openTrip = (id: string) => { setTripId(id); setView('trip'); };

  return (
    <div className="min-w-0 space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-50/60 p-5 sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full border-[32px] border-violet-100/40" />
        <div className="relative flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/15 sm:h-14 sm:w-14"><Wallet className="h-6 w-6" /></span>
            <div><p className="mb-1 text-[9px] font-bold tracking-[0.2em] text-violet-500">DAPAI DERNPAI · FINANCE</p><h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">ทุกตัวเลขของการเดินทาง</h2><p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-sm">ดูรายรับ ติดตามต้นทุน และจัดการบัญชีของทีมในที่เดียว</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data && data.canEdit !== false && <>
              <button type="button" onClick={() => setQuickEntry('income')} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3.5 text-xs font-bold text-violet-700 transition hover:bg-violet-50"><Plus className="h-4 w-4" />บันทึกรายรับ</button>
              <button type="button" onClick={() => setQuickEntry('expense')} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700"><Plus className="h-4 w-4" />บันทึกรายจ่าย</button>
            </>}
            <a download href="/api/admin/accounting/export" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 transition hover:border-violet-200 hover:text-violet-700"><Download className="h-4 w-4" />ส่งออก Excel</a>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="หมวดงานบัญชี" className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-1.5 shadow-sm [scrollbar-width:none]">
          {VIEWS.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)} className={cn('flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-violet-500 sm:px-4', view === id ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/20' : 'text-slate-500 hover:bg-violet-50 hover:text-violet-700')}><Icon className="h-4 w-4" />{label}</button>)}
        </nav>
        <div className="flex shrink-0 items-center justify-end gap-3">
          {updatedAt && <span className="text-[10px] text-slate-400">อัปเดต {updatedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>}
          <button type="button" disabled={loading} onClick={() => void reload()} aria-label="โหลดข้อมูลบัญชีใหม่" className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500 transition hover:text-violet-700 disabled:opacity-50"><RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />โหลดใหม่</button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>}
      {data && data.canEdit === false && <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs font-bold text-sky-800">คุณมีสิทธิ์ดูข้อมูลบัญชีอย่างเดียว ไม่สามารถเพิ่ม แก้ไข หรือลบรายการได้</div>}
      {!data ? (
        loading && <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400"><RefreshCw className="h-5 w-5 animate-spin text-violet-600" /> กำลังโหลดข้อมูลบัญชี...</div>
      ) : view === 'overview' ? <Overview data={data} onOpenTrip={openTrip} onView={setView} />
        : view === 'trip' ? <TripLedger data={data} tripId={tripId || data.trips[0]?.tripId || ''} onTripChange={setTripId} />
        : view === 'income' ? <IncomeView data={data} onChanged={reload} onOpenTrip={openTrip} />
        : view === 'expense' ? <EntriesPanel type="expense" data={data} onChanged={reload} />
        : view === 'partners' ? <PartnersPanel data={data} onChanged={reload} />
        : <Report data={data} onOpenTrip={openTrip} />}
      {data && quickEntry && <EntryForm type={quickEntry} data={data} entry={null} onClose={() => setQuickEntry(null)} onSaved={async () => { setQuickEntry(null); await reload(); }} />}
    </div>
  );
}

function Overview({ data, onOpenTrip, onView }: { data: AccountingData; onOpenTrip: (id: string) => void; onView: (view: View) => void }) {
  const o = data.overview;
  const activeTrips = data.trips.filter(t => t.incomeSatang || t.expenseSatang || t.status !== 'completed');
  const paidShare = o.incomeSatang > 0 ? Math.max(0, Math.min(100, o.paymentIncomeSatang / o.incomeSatang * 100)) : 0;
  const maximum = Math.max(o.incomeSatang, o.expenseSatang, 1);
  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Stat label="รายรับรวม" value={money(o.incomeSatang)} tone="text-emerald-600" icon={ArrowDownLeft} hint={`ลูกทริป ${money(o.paymentIncomeSatang)} · อื่น ๆ ${money(o.otherIncomeSatang)}`} />
      <Stat label="รายจ่ายรวม" value={money(o.expenseSatang)} tone="text-rose-600" icon={ArrowUpRight} hint={`รายทริป ${money(o.tripExpenseSatang)} · ส่วนกลาง ${money(o.overheadExpenseSatang)}`} />
      <Stat label={o.profitSatang >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'} value={money(o.profitSatang)} tone={profitTone(o.profitSatang)} icon={ChartNoAxesCombined} hint="รายรับทั้งหมด หักรายจ่ายทั้งหมด" />
      <Stat label="ลูกทริปค้างชำระ" value={money(o.outstandingSatang)} tone="text-amber-600" icon={Clock3} hint="ยอดคงเหลือจากรายการที่มัดจำแล้ว" />
    </div>

    <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-black text-slate-800">ภาพรวมรายรับและรายจ่าย</h3><p className="mt-1 text-[11px] text-slate-400">สรุปยอดสะสมจากข้อมูลบัญชีทั้งหมด</p></div><span className="rounded-lg bg-violet-50 p-2 text-violet-500"><ChartNoAxesCombined className="h-4 w-4" /></span></div>
        <div className="mt-6 space-y-5">
          {[{ label: 'รายรับ', value: o.incomeSatang, bar: 'bg-emerald-400', text: 'text-emerald-600' }, { label: 'รายจ่าย', value: o.expenseSatang, bar: 'bg-rose-400', text: 'text-rose-600' }].map(row => <div key={row.label}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium text-slate-500">{row.label}</span><span className={cn('font-black tabular-nums', row.text)}>{money(row.value)}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-50"><div className={cn('h-full rounded-full', row.bar)} style={{ width: `${row.value / maximum * 100}%` }} /></div></div>)}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-violet-50/70 px-4 py-3"><span className="text-xs font-bold text-violet-900">{o.profitSatang >= 0 ? 'กำไรหลังหักค่าใช้จ่าย' : 'ขาดทุนหลังหักค่าใช้จ่าย'}</span><span className={cn('text-lg font-black tabular-nums', profitTone(o.profitSatang))}>{money(o.profitSatang)}</span></div>
      </section>
      <section className="min-w-0 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-black text-slate-800">รายรับมาจากไหน</h3><p className="mt-1 text-[11px] text-slate-400">แยกยอดรับจากระบบชำระเงินและรายรับอื่น</p>
        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
          <div role="img" aria-label={`รายรับจากลูกทริป ${money(o.paymentIncomeSatang)} และรายรับอื่น ${money(o.otherIncomeSatang)}`} className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full" style={{ background: o.incomeSatang ? `conic-gradient(#34d399 0% ${paidShare}%, #8b5cf6 ${paidShare}% 100%)` : '#f1f5f9' }}><div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white"><span className="text-[10px] text-slate-400">จากลูกทริป</span><span className="mt-1 text-xl font-black text-slate-800">{o.incomeSatang ? `${Math.round(paidShare)}%` : '—'}</span></div></div>
          <div className="w-full space-y-4 sm:w-auto sm:flex-1">
            <div><p className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-400" />ชำระผ่านระบบ</p><p className="mt-1 pl-4 text-lg font-black tabular-nums text-slate-800">{money(o.paymentIncomeSatang)}</p></div>
            <div><p className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-violet-500" />รายรับอื่น ๆ</p><p className="mt-1 pl-4 text-lg font-black tabular-nums text-slate-800">{money(o.otherIncomeSatang)}</p></div>
            <button type="button" onClick={() => onView('income')} className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600">ดูรายละเอียดรายรับ<ArrowRight className="h-3 w-3" /></button>
          </div>
        </div>
      </section>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={() => onView('income')} className="group flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-left"><div className="flex items-center gap-3"><span className="rounded-xl bg-white p-2.5 text-amber-600"><Clock3 className="h-5 w-5" /></span><div><p className="text-xs font-semibold text-amber-800">ติดตามยอดค้างจากลูกทริป</p><p className="mt-1 text-lg font-black tabular-nums text-amber-950">{money(o.outstandingSatang)}</p></div></div><ChevronRight className="h-4 w-4 shrink-0 text-amber-500 transition-transform group-hover:translate-x-0.5" /></button>
      <button type="button" onClick={() => onView('partners')} className="group flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 text-left"><div className="flex items-center gap-3"><span className="rounded-xl bg-white p-2.5 text-violet-600"><Users className="h-5 w-5" /></span><div><p className="text-xs font-semibold text-violet-800">ยอดค้างเบิกคืนหุ้นส่วน</p><p className="mt-1 text-lg font-black tabular-nums text-violet-950">{money(o.owedToPartnersSatang)}</p></div></div><ChevronRight className="h-4 w-4 shrink-0 text-violet-500 transition-transform group-hover:translate-x-0.5" /></button>
    </div>

    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[11px] text-slate-500">
      <span><b className="text-violet-700">{o.openTrips}</b> ทริปที่เปิดอยู่</span><span><b className="text-slate-700">{o.closedTrips}</b> ทริปที่ปิดแล้ว</span><span>กำไร <b className="text-emerald-600">{data.trips.filter(t => t.profitSatang > 0).length}</b> ทริป</span><span>ขาดทุน <b className="text-rose-600">{data.trips.filter(t => t.profitSatang < 0).length}</b> ทริป</span>
    </div>
    <TripTable title="ผลประกอบการรายทริป" trips={activeTrips} onOpenTrip={onOpenTrip} />
    <p className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-white/60 p-4 text-[11px] leading-relaxed text-slate-500"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />รายรับจากลูกทริปดึงจากยอดที่ตรวจสลิปผ่านแล้ว เงินที่รับนอกระบบให้บันทึกในหมวด “ค่าทริป (รับนอกระบบ)”</p>
  </div>;
}

function TripTable({ title, trips, onOpenTrip, totals }: { title: string; trips: AccountingData['trips']; onOpenTrip: (id: string) => void; totals?: boolean }) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const filtered = trips.filter(trip => trip.name.toLowerCase().includes(q.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  const sum = (key: 'incomeSatang' | 'expenseSatang' | 'profitSatang' | 'outstandingSatang') => filtered.reduce((s, t) => s + t[key], 0);
  return <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5"><div><h3 className="text-sm font-black text-slate-800">{title}<span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">{filtered.length} ทริป</span></h3><p className="mt-1 text-[10px] text-slate-400">เลือกชื่อทริปเพื่อดูรายละเอียดบัญชี</p></div><label className="relative w-full sm:w-56"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input aria-label="ค้นหาชื่อทริปในตาราง" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="ค้นหาชื่อทริป..." className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-xs outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label></div>
    {filtered.length === 0 ? <div className="flex flex-col items-center gap-2 py-12 text-center"><MapIcon className="h-8 w-8 text-violet-200" /><p className="text-sm text-slate-400">{q ? 'ไม่พบทริปที่ค้นหา' : 'ยังไม่มีข้อมูลทริป'}</p></div> : <>
      <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-xs tabular-nums">
        <thead className="bg-slate-50/80 text-left text-[10px] font-bold text-slate-400"><tr><th scope="col" className="px-5 py-3">ทริป / วันเดินทาง</th><th scope="col" className="px-3 py-3">สถานะ</th><th scope="col" className="px-3 py-3 text-right">ลูกทริป</th><th scope="col" className="px-3 py-3 text-right">รายรับ</th><th scope="col" className="px-3 py-3 text-right">รายจ่าย</th><th scope="col" className="px-3 py-3 text-right">กำไร / ขาดทุน</th><th scope="col" className="px-3 py-3 text-right">ต้นทุน / คน</th><th scope="col" className="px-5 py-3 text-right">ค้างชำระ</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{visible.map(t => <tr key={t.tripId} onClick={() => onOpenTrip(t.tripId)} className="group cursor-pointer transition-colors hover:bg-violet-50/40">
          <td className="max-w-64 px-5 py-4"><button type="button" onClick={e => { e.stopPropagation(); onOpenTrip(t.tripId); }} className="flex items-center gap-2 text-left font-bold leading-relaxed text-slate-800 hover:text-violet-700 focus-visible:outline-2 focus-visible:outline-violet-500"><span className="line-clamp-2">{t.name}</span><ChevronRight className="h-3 w-3 shrink-0 text-slate-300 group-hover:text-violet-500" /></button><p className="mt-1 text-[10px] text-slate-400">{thaiDate(t.departureDate)}</p></td>
          <td className="px-3 py-4"><span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold', t.status === 'completed' ? 'bg-slate-100 text-slate-500' : 'bg-violet-50 text-violet-700')}><span className={cn('h-1 w-1 rounded-full', t.status === 'completed' ? 'bg-slate-400' : 'bg-violet-500')} />{t.status === 'completed' ? 'ปิดแล้ว' : 'เปิดอยู่'}</span></td>
          <td className="px-3 py-4 text-right text-slate-500">{t.passengers}</td>
          <td className="whitespace-nowrap px-3 py-4 text-right font-semibold text-emerald-600">{money(t.incomeSatang)}</td>
          <td className="whitespace-nowrap px-3 py-4 text-right font-semibold text-rose-600">{money(t.expenseSatang)}</td>
          <td className={cn('whitespace-nowrap px-3 py-4 text-right font-black', profitTone(t.profitSatang))}>{money(t.profitSatang)}</td>
          <td className="whitespace-nowrap px-3 py-4 text-right text-slate-500">{t.costPerPassengerSatang === null ? '—' : money(t.costPerPassengerSatang)}</td>
          <td className="whitespace-nowrap px-5 py-4 text-right"><span className={cn(t.outstandingSatang ? 'rounded-lg bg-amber-50 px-2 py-1 font-bold text-amber-700' : 'text-slate-300')}>{money(t.outstandingSatang)}</span></td>
        </tr>)}</tbody>
        {totals && <tfoot className="border-t border-slate-100 bg-violet-50/40 font-black"><tr><td colSpan={3} className="px-5 py-4">รวม {filtered.length} ทริป</td><td className="px-3 py-4 text-right text-emerald-600">{money(sum('incomeSatang'))}</td><td className="px-3 py-4 text-right text-rose-600">{money(sum('expenseSatang'))}</td><td className={cn('px-3 py-4 text-right', profitTone(sum('profitSatang')))}>{money(sum('profitSatang'))}</td><td /><td className="px-5 py-4 text-right text-amber-600">{money(sum('outstandingSatang'))}</td></tr></tfoot>}
      </table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3"><span className="text-[10px] text-slate-400">แสดง {(currentPage - 1) * 8 + 1}–{Math.min(currentPage * 8, filtered.length)} จาก {filtered.length} ทริป</span><div className="flex items-center gap-2"><button type="button" aria-label="ตารางทริปหน้าก่อนหน้า" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-violet-50 disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" /></button><span className="px-1 text-[10px] font-bold text-slate-500">{currentPage} / {pages}</span><button type="button" aria-label="ตารางทริปหน้าถัดไป" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-violet-50 disabled:opacity-30"><ChevronRight className="h-3.5 w-3.5" /></button></div></div>
    </>}
  </section>;
}

function Breakdown({ title, rows, tone }: { title: string; rows: [string, number][]; tone: string }) {
  const total = rows.reduce((s, [, v]) => s + v, 0);
  const income = tone === 'text-emerald-600';
  return <section className="min-w-0 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4"><div className="flex items-center gap-2"><span className={cn('rounded-lg p-2', income ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>{income ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</span><h4 className="text-sm font-black text-slate-800">{title}</h4></div><span className={cn('shrink-0 text-sm font-black tabular-nums', tone)}>{money(total)}</span></div>
    {rows.length === 0 ? <p className="py-10 text-center text-xs text-slate-400">ยังไม่มีรายการในหมวดนี้</p> : <ul className="mt-5 max-h-80 space-y-5 overflow-y-auto pr-1">{[...rows].sort((a, b) => b[1] - a[1]).map(([label, value]) => <li key={label}><div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="min-w-0 break-words font-medium text-slate-600">{label}</span><span className="shrink-0 font-bold tabular-nums text-slate-800">{money(value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-50"><div className={cn('h-full rounded-full', income ? 'bg-emerald-400' : 'bg-rose-400')} style={{ width: `${total ? value / total * 100 : 0}%` }} /></div></li>)}</ul>}
  </section>;
}

const categoryLabel = (data: AccountingData, id: string) => id === PAYMENT_CATEGORY_ID ? PAYMENT_CATEGORY_NAME : data.categories.find(c => c.id === id)?.name || 'ไม่ระบุหมวด';

function TripLedger({ data, tripId, onTripChange }: { data: AccountingData; tripId: string; onTripChange: (id: string) => void }) {
  const trip = data.trips.find(t => t.tripId === tripId);
  const entries = data.entries.filter(e => e.tripId === tripId);
  if (!trip) return <p className="py-12 text-center text-sm text-slate-400">ยังไม่มีทริป</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="min-w-0"><p className="mb-2 text-[10px] font-bold text-violet-500">บัญชีรายทริป</p><h3 className="text-lg font-black text-slate-800">{trip.name}</h3><p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><MapIcon className="h-3.5 w-3.5" />{thaiDate(trip.departureDate)}<span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-violet-600">{trip.status === 'completed' ? 'ปิดทริปแล้ว' : 'เปิดอยู่'}</span></p></div>
        <label className="block text-[10px] font-bold text-slate-400 sm:w-72 sm:shrink-0">เปลี่ยนทริป<select aria-label="เลือกทริปสำหรับดูบัญชี" value={tripId} onChange={e => onTripChange(e.target.value)} className={cn(fieldClass, 'bg-white font-semibold')}>
          {data.trips.map(t => <option key={t.tripId} value={t.tripId}>{t.name} ({thaiDate(t.departureDate)}){t.status === 'completed' ? ' · ปิดแล้ว' : ''}</option>)}
        </select></label>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="ลูกทริป (อนุมัติแล้ว)" value={`${trip.passengers} คน`} />
        <Stat label="รายรับ" value={money(trip.incomeSatang)} tone="text-emerald-600" hint={`ลูกทริป ${money(trip.paymentIncomeSatang)} · อื่น ๆ ${money(trip.otherIncomeSatang)}`} />
        <Stat label="รายจ่าย (ต้นทุน)" value={money(trip.expenseSatang)} tone="text-rose-600" hint={trip.costPerPassengerSatang !== null ? `เฉลี่ย ${money(trip.costPerPassengerSatang)} / คน` : undefined} />
        <Stat label={trip.profitSatang >= 0 ? 'กำไร' : 'ขาดทุน'} value={money(trip.profitSatang)} tone={profitTone(trip.profitSatang)} hint={trip.incomeSatang ? `อัตรากำไร ${Math.round((trip.profitSatang / trip.incomeSatang) * 100)}%` : undefined} />
        <Stat label="ค้างชำระจากลูกทริป" value={money(trip.outstandingSatang)} tone="text-amber-600" />
      </div>
      {trip.reviewOrders > 0 && <p className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700"><AlertTriangle className="h-4 w-4" /> มี {trip.reviewOrders} รายการชำระที่รอแอดมินตรวจสอบ (ดูในเมนูการชำระเงิน)</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="รายรับตามหมวด" tone="text-emerald-600" rows={Object.entries(trip.incomeByCategory).map(([id, v]) => [categoryLabel(data, id), v])} />
        <Breakdown title="รายจ่ายตามหมวด" tone="text-rose-600" rows={Object.entries(trip.expenseByCategory).map(([id, v]) => [categoryLabel(data, id), v])} />
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <h3 className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-sm font-black text-slate-800"><ReceiptText className="h-4 w-4 text-violet-500" />รายการบันทึกของทริปนี้<span className="ml-auto text-[10px] font-medium text-slate-400">{entries.length} รายการ</span></h3>
        {entries.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีรายการ (เพิ่มได้ที่แท็บรายรับ / รายจ่าย)</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {entries.map(e => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-20 shrink-0 text-slate-500">{thaiDate(e.date)}</span>
                <span className="flex-1"><span className="font-semibold text-slate-700">{categoryLabel(data, e.categoryId)}</span>{e.description && <span className="ml-2 text-slate-500">{e.description}</span>}</span>
                <span className={cn('font-bold', e.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>{e.type === 'income' ? '+' : '-'}{money(e.amountSatang)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function IncomeView({ data, onChanged, onOpenTrip }: { data: AccountingData; onChanged: () => Promise<void>; onOpenTrip: (id: string) => void }) {
  const paying = data.trips.filter(t => t.paymentIncomeSatang || t.outstandingSatang);
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-sm font-black text-slate-800">รายรับจากการชำระเงินของลูกทริป <span className="font-normal text-slate-500">(ดึงอัตโนมัติจากระบบชำระเงิน)</span></h3>
        <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
          {paying.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีการชำระเงินผ่านระบบ</p> : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500"><tr><th className="px-4 py-2.5">ทริป</th><th className="px-4 py-2.5 text-right">รับแล้ว</th><th className="px-4 py-2.5 text-right">ค้างชำระ</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {paying.map(t => (
                  <tr key={t.tripId} className="cursor-pointer hover:bg-violet-50/40" onClick={() => onOpenTrip(t.tripId)}>
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{t.name}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{money(t.paymentIncomeSatang)}</td>
                    <td className={cn('px-4 py-2.5 text-right', t.outstandingSatang ? 'font-bold text-amber-600' : 'text-slate-400')}>{money(t.outstandingSatang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      <CustomerPaymentSearch />
      <section className="space-y-2">
        <h3 className="text-sm font-black text-slate-800">รายรับอื่น ๆ</h3>
        <EntriesPanel type="income" data={data} onChanged={onChanged} />
      </section>
    </div>
  );
}

/** Search a customer's payment history by name or phone number. */
function CustomerPaymentSearch() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AdminPaymentRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/admin/payments?${new URLSearchParams({ q: q.trim(), state: 'all' })}`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'ค้นหาไม่สำเร็จ');
      setRows(json.payments);
    } catch (err) { setError(err instanceof Error ? err.message : 'ค้นหาไม่สำเร็จ'); setRows(null); }
    finally { setBusy(false); }
  };
  return (
    <section className="space-y-4 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-white p-5 sm:p-6">
      <div className="flex items-center gap-2"><Search className="h-4 w-4 text-violet-500" /><h3 className="text-sm font-black text-slate-800">ค้นหาประวัติการชำระเงินของลูกทริป</h3></div>
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} aria-label="ค้นหาประวัติชำระเงินด้วยชื่อหรือเบอร์โทร" placeholder="ชื่อ ชื่อเล่น หรือเบอร์โทรศัพท์" className={cn(fieldClass, 'mt-0 pl-9')} />
        </div>
        <button type="submit" disabled={busy || !q.trim()} className="rounded-xl bg-violet-600 px-5 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-40">{busy ? 'กำลังค้นหา...' : 'ค้นหา'}</button>
      </form>
      {error && <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}
      {rows && (
        <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
          {rows.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">ไม่พบประวัติการชำระเงิน</p> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {rows.map(r => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-bold text-slate-800">{r.booking?.fullName || r.userName || '-'} <span className="font-normal text-slate-500">{r.booking?.phone}</span></span>
                    <span className="text-xs font-bold text-slate-500">{r.stateLabel}</span>
                  </div>
                  <p className="text-xs text-slate-500">{r.tripName} · ที่นั่ง {r.booking?.seatLabel || '-'} · ต้องชำระ {money(r.totalSatang)} · ชำระแล้ว <b className="text-emerald-600">{money(r.paidSatang)}</b> · คงเหลือ <b className="text-amber-600">{money(r.balanceSatang)}</b></p>
                  {r.receipts.length > 0 && <p className="mt-1 text-[11px] text-slate-400">{r.receipts.map(x => `${new Date(x.paidAt).toLocaleDateString('th-TH')} ${money(x.amountSatang)}${x.payerName ? ` (${x.payerName})` : ''}`).join(' · ')}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Report({ data, onOpenTrip }: { data: AccountingData; onOpenTrip: (id: string) => void }) {
  const [status, setStatus] = useState<'all' | 'active' | 'completed'>('all');
  const trips = useMemo(() => data.trips.filter(t => status === 'all' || (status === 'completed' ? t.status === 'completed' : t.status !== 'completed')), [data, status]);
  const categories = useMemo(() => {
    const income = new Map<string, number>(); const expense = new Map<string, number>();
    const add = (map: Map<string, number>, rows: Record<string, number>) => { for (const [id, v] of Object.entries(rows)) map.set(categoryLabel(data, id), (map.get(categoryLabel(data, id)) || 0) + v); };
    for (const t of data.trips) { add(income, t.incomeByCategory); add(expense, t.expenseByCategory); }
    add(income, data.overhead.incomeByCategory); add(expense, data.overhead.expenseByCategory);
    return { income: [...income], expense: [...expense] };
  }, [data]);
  const o = data.overview;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className={cn(fieldClass, 'mt-0 w-auto bg-white')}>
          <option value="all">ทุกทริป</option><option value="active">ทริปที่เปิดอยู่</option><option value="completed">ทริปที่ปิดแล้ว</option>
        </select>
        <button type="button" onClick={() => { window.location.href = '/api/admin/accounting/export'; }} className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700"><Download className="h-4 w-4" /> ส่งออก Excel</button>
      </div>
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="mb-3 text-sm font-black text-slate-800">งบกำไรขาดทุนรวม</h3>
        <dl className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
          {[
            ['รายรับจากลูกทริป', o.paymentIncomeSatang], ['รายรับอื่น ๆ', o.otherIncomeSatang], ['รายจ่ายรายทริป', -o.tripExpenseSatang],
            ['รายจ่ายส่วนกลาง', -o.overheadExpenseSatang],
          ].map(([label, value]) => <div key={label as string} className="flex justify-between border-b border-dashed border-slate-100 py-1"><dt className="text-slate-600">{label}</dt><dd className={cn('font-bold', profitTone(value as number))}>{money(value as number)}</dd></div>)}
          <div className="flex justify-between py-1 sm:col-span-2"><dt className="font-black text-slate-800">{o.profitSatang >= 0 ? 'กำไรสุทธิ' : 'ขาดทุนสุทธิ'}</dt><dd className={cn('text-lg font-black', profitTone(o.profitSatang))}>{money(o.profitSatang)}</dd></div>
        </dl>
      </div>
      <TripTable title="รายงานรายทริป" trips={trips} onOpenTrip={onOpenTrip} totals />
      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="รายรับตามหมวด (ทั้งหมด)" tone="text-emerald-600" rows={categories.income} />
        <Breakdown title="รายจ่ายตามหมวด (ทั้งหมด)" tone="text-rose-600" rows={categories.expense} />
      </div>
    </div>
  );
}
