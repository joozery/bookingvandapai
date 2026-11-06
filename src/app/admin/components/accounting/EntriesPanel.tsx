'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Plus, Search, Tags, Trash2, ReceiptText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  accountingApi, fieldClass, labelClass, Modal, money, primaryButton, queryPage, setQueryPage, smallButton, thaiDate, today,
  type AccountCategory, type AccountEntry, type AccountingData,
} from './shared';

type EntryType = 'income' | 'expense';

/** Income or expense list with add / edit / delete and category management. */
export default function EntriesPanel({ type, data, onChanged }: { type: EntryType; data: AccountingData; onChanged: () => Promise<void> }) {
  const [tripId, setTripId] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<AccountEntry | 'new' | null>(null);
  const [managing, setManaging] = useState(false);
  const [page, setPage] = useState(queryPage);
  const [remoteEntries, setRemoteEntries] = useState<AccountEntry[]>([]);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const categories = data.categories.filter(c => c.type === type);
  const categoryName = (id: string) => data.categories.find(c => c.id === id)?.name || 'ไม่ระบุหมวด';
  const tripName = (id: string | null) => (id ? data.trips.find(t => t.tripId === id)?.name || 'ทริปที่ถูกลบ' : 'ส่วนกลาง');
  const partnerName = (id?: string | null) => (id ? data.partners.find(p => p.id === id)?.name || '' : '');

  useEffect(() => {
    let active = true;
    setRemoteLoading(true);
    const params = new URLSearchParams({ type, page: String(page), pageSize: '20', tripId, categoryId });
    fetch(`/api/admin/accounting/entries?${params.toString()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(result => { if (active && result.success) { setRemoteEntries(result.entries || []); setRemoteTotal(result.total || 0); } })
      .finally(() => { if (active) setRemoteLoading(false); });
    return () => { active = false; };
  }, [type, page, tripId, categoryId]);

  const rows = useMemo(() => remoteEntries.filter(e => e.type === type
    && (tripId === 'all' || (tripId === 'none' ? !e.tripId : e.tripId === tripId))
    && (categoryId === 'all' || e.categoryId === categoryId)
    && (!q.trim() || [e.description, categoryName(e.categoryId), tripName(e.tripId), partnerName(e.paidByPartnerId), partnerName(e.payeePartnerId)].join(' ').toLowerCase().includes(q.trim().toLowerCase()))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [data, remoteEntries, type, tripId, categoryId, q]);
  const total = rows.reduce((s, e) => s + e.amountSatang, 0);
  const pages = Math.max(1, Math.ceil(remoteTotal / 20));
  const currentPage = Math.min(page, pages);
  const visibleRows = rows;
  useEffect(() => { setQueryPage(currentPage); }, [currentPage]);

  const remove = async (entry: AccountEntry) => {
    if (!confirm(`ลบรายการ ${money(entry.amountSatang)} (${categoryName(entry.categoryId)})?`)) return;
    try { await accountingApi(`entries/${entry.id}`, 'DELETE'); await onChanged(); }
    catch (e) { alert(e instanceof Error ? e.message : 'ลบไม่สำเร็จ'); }
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-3"><span className={cn('rounded-xl p-2.5', type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>{type === 'income' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}</span><div><h3 className="text-sm font-black text-slate-800">{type === 'income' ? 'รายการรายรับอื่น ๆ' : 'บันทึกค่าใช้จ่าย'}</h3><p className="mt-1 text-[11px] text-slate-400">{rows.length} รายการตามตัวกรองที่เลือก</p></div></div>
        <div className="text-right"><p className="text-[10px] text-slate-400">ยอดรวมที่แสดง</p><p className={cn('mt-1 text-xl font-black tabular-nums', type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>{money(total)}</p></div>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} aria-label="ค้นหารายการบัญชี" placeholder="ค้นหารายละเอียด หมวด ทริป หรือหุ้นส่วน" className={cn(fieldClass, 'mt-0 pl-9')} />
        </div>
        <select aria-label="กรองรายการตามทริป" value={tripId} onChange={e => { setTripId(e.target.value); setPage(1); }} className={cn(fieldClass, 'mt-0 xl:w-48')}>
          <option value="all">ทุกทริป</option>
          <option value="none">ส่วนกลาง (ไม่ผูกทริป)</option>
          {data.trips.map(t => <option key={t.tripId} value={t.tripId}>{t.name}</option>)}
        </select>
        <select aria-label="กรองรายการตามหมวดหมู่" value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }} className={cn(fieldClass, 'mt-0 xl:w-40')}>
          <option value="all">ทุกหมวด</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {data.canEdit !== false && <div className="flex gap-2">
          <button type="button" onClick={() => setManaging(true)} className={cn(smallButton, 'h-10')}><Tags className="h-4 w-4" /> หมวดหมู่</button>
          <button type="button" onClick={() => setEditing('new')} className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-violet-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-violet-700">
            <Plus className="h-4 w-4" /> เพิ่ม{type === 'income' ? 'รายรับ' : 'รายจ่าย'}
          </button>
        </div>}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm">
          <span className="font-bold text-slate-700">{rows.length} รายการ</span>
          <span className={cn('font-black', type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>รวม {money(total)}</span>
        </div>
        {remoteLoading ? <div className="flex flex-col items-center gap-3 py-14"><ReceiptText className="h-7 w-7 text-violet-300" /><p className="text-sm font-bold text-slate-500">กำลังโหลดรายการ...</p></div> : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14"><span className="rounded-2xl bg-violet-50 p-4"><ReceiptText className="h-7 w-7 text-violet-300" /></span><p className="text-sm font-bold text-slate-500">ยังไม่มีรายการ{type === 'income' ? 'รายรับอื่น ๆ' : 'รายจ่าย'}</p><p className="text-[11px] text-slate-400">ลองเปลี่ยนตัวกรอง หรือเพิ่มรายการใหม่</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50/80 text-left text-[10px] font-bold text-slate-400">
                <tr><th className="px-4 py-3.5">วันที่</th><th className="px-4 py-3.5">หมวดหมู่</th><th className="px-4 py-3.5">ทริป</th><th className="px-4 py-3.5">รายละเอียด</th><th className="px-4 py-3.5 text-right">จำนวนเงิน</th><th className="px-4 py-3.5" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map(e => (
                  <tr key={e.id} className="transition-colors hover:bg-violet-50/30">
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">{thaiDate(e.date)}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700">{categoryName(e.categoryId)}</td>
                    <td className="px-4 py-3.5 text-slate-600">{tripName(e.tripId)}</td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {e.description || '-'}
                      {e.paidByPartnerId && <span className="ml-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">สำรองจ่ายโดย {partnerName(e.paidByPartnerId)}</span>}
                      {e.payeePartnerId && <span className="ml-1.5 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">จ่ายให้ {partnerName(e.payeePartnerId)}</span>}
                    </td>
                    <td className={cn('whitespace-nowrap px-4 py-3.5 text-right font-bold tabular-nums', type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>{money(e.amountSatang)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      {data.canEdit !== false && <>
                      <button type="button" onClick={() => setEditing(e)} className="p-1.5 text-slate-400 hover:text-violet-600" title="แก้ไข"><Edit2 className="h-4 w-4" /></button>
                      <button type="button" onClick={() => void remove(e)} className="p-1.5 text-slate-400 hover:text-rose-600" title="ลบ"><Trash2 className="h-4 w-4" /></button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {remoteTotal > 20 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><span className="text-[11px] text-slate-400">แสดง {(currentPage - 1) * 20 + 1}-{Math.min(currentPage * 20, remoteTotal)} จาก {remoteTotal} รายการ</span><div className="flex items-center gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-violet-50 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><span className="text-[11px] font-bold text-slate-500">{currentPage} / {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-violet-50 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div></div>}
      </div>

      {editing && <EntryForm type={type} data={data} entry={editing === 'new' ? null : editing} defaultTripId={tripId !== 'all' && tripId !== 'none' ? tripId : ''}
        onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onChanged(); }} />}
      {managing && <CategoryManager type={type} categories={categories} onClose={() => setManaging(false)} onChanged={onChanged} />}
    </div>
  );
}

export function EntryForm({ type, data, entry, defaultTripId = '', presetCategory, presetPayee, onClose, onSaved }: {
  type: EntryType; data: AccountingData; entry: AccountEntry | null; defaultTripId?: string;
  presetCategory?: string; presetPayee?: string; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const categories = data.categories.filter(c => c.type === type);
  const [form, setForm] = useState({
    date: entry?.date || today(), categoryId: entry?.categoryId || presetCategory || categories[0]?.id || '', tripId: entry?.tripId ?? defaultTripId,
    amount: entry ? String(entry.amountSatang / 100) : '', description: entry?.description || '',
    paidByPartnerId: entry?.paidByPartnerId || '', payeePartnerId: entry?.payeePartnerId || presetPayee || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const category = categories.find(c => c.id === form.categoryId);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [key]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await accountingApi(entry ? `entries/${entry.id}` : 'entries', entry ? 'PATCH' : 'POST', { ...form, amount: Number(form.amount) });
      await onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={`${entry ? 'แก้ไข' : 'เพิ่ม'}${type === 'income' ? 'รายรับ' : 'รายจ่าย'}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>วันที่<input type="date" required value={form.date} onChange={set('date')} className={fieldClass} /></label>
          <label className={labelClass}>จำนวนเงิน (บาท)<input type="number" required min="0.01" step="0.01" value={form.amount} onChange={set('amount')} className={cn(fieldClass, 'font-bold')} /></label>
        </div>
        <label className={labelClass}>หมวดหมู่
          <select required value={form.categoryId} onChange={set('categoryId')} className={fieldClass}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className={labelClass}>ทริป
          <select value={form.tripId || ''} onChange={set('tripId')} className={fieldClass}>
            <option value="">ส่วนกลาง (ไม่ผูกกับทริป)</option>
            {data.trips.map(t => <option key={t.tripId} value={t.tripId}>{t.name}{t.departureDate ? ` (${thaiDate(t.departureDate)})` : ''}</option>)}
          </select>
        </label>
        <label className={labelClass}>รายละเอียด<input value={form.description} onChange={set('description')} maxLength={300} placeholder="เช่น ค่ารถสองแถวขาไป" className={fieldClass} /></label>
        {type === 'expense' && (
          <>
            {category?.system === 'partner_compensation' && (
              <label className={labelClass}>หุ้นส่วนผู้รับค่าตอบแทน <span className="text-rose-500">*</span>
                <select required value={form.payeePartnerId} onChange={set('payeePartnerId')} className={fieldClass}>
                  <option value="">เลือกหุ้นส่วน</option>
                  {data.partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            )}
            <label className={labelClass}>ผู้จ่ายเงิน
              <select value={form.paidByPartnerId} onChange={set('paidByPartnerId')} className={fieldClass}>
                <option value="">จ่ายจากบัญชีธุรกิจ</option>
                {data.partners.map(p => <option key={p.id} value={p.id}>{p.name} สำรองจ่าย (รอเบิกคืน)</option>)}
              </select>
            </label>
          </>
        )}
        {error && <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}
        <button type="submit" disabled={busy} className={primaryButton}>{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
      </form>
    </Modal>
  );
}

function CategoryManager({ type, categories, onClose, onChanged }: { type: EntryType; categories: AccountCategory[]; onClose: () => void; onChanged: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try { await action(); await onChanged(); } catch (e) { setError(e instanceof Error ? e.message : 'ไม่สำเร็จ'); }
  };
  return (
    <Modal title={`หมวดหมู่${type === 'income' ? 'รายรับ' : 'รายจ่าย'}`} subtitle="ลบหมวดหมู่แล้ว รายการในหมวดนั้นจะย้ายไปอยู่หมวด “อื่น ๆ”" onClose={onClose}>
      <ul className="mb-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
        {categories.map(c => (
          <li key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm">
            {renaming?.id === c.id ? (
              <>
                <input autoFocus value={renaming.name} onChange={e => setRenaming({ id: c.id, name: e.target.value })} className={cn(fieldClass, 'mt-0 h-8 flex-1')} />
                <button type="button" className={smallButton} onClick={() => void run(async () => { await accountingApi(`categories/${c.id}`, 'PATCH', { name: renaming.name }); setRenaming(null); })}>บันทึก</button>
              </>
            ) : (
              <>
                <span className="flex-1 font-semibold text-slate-700">{c.name}{c.system && <span className="ml-1.5 text-[11px] font-normal text-slate-400">(ของระบบ)</span>}</span>
                <button type="button" className="p-1 text-slate-400 hover:text-violet-600" title="เปลี่ยนชื่อ" onClick={() => setRenaming({ id: c.id, name: c.name })}><Edit2 className="h-4 w-4" /></button>
                {!c.system && (
                  <button type="button" className="p-1 text-slate-400 hover:text-rose-600" title="ลบ"
                    onClick={() => { if (confirm(`ลบหมวด “${c.name}”? รายการในหมวดนี้จะย้ายไป “อื่น ๆ”`)) void run(() => accountingApi(`categories/${c.id}`, 'DELETE')); }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void run(async () => { await accountingApi('categories', 'POST', { type, name }); setName(''); }); }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="ชื่อหมวดหมู่ใหม่" className={cn(fieldClass, 'mt-0 flex-1')} />
        <button type="submit" disabled={!name.trim()} className="rounded-lg bg-violet-600 px-4 text-sm font-bold text-white disabled:opacity-40">เพิ่ม</button>
      </form>
      {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}
    </Modal>
  );
}
