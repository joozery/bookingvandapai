'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Edit2, HandCoins, Map, Plus, Trash2, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EntryForm } from './EntriesPanel';
import { accountingApi, fieldClass, labelClass, Modal, money, primaryButton, profitTone, queryPage, setQueryPage, smallButton, Stat, thaiDate, today, type AccountingData, type Partner } from './shared';

/** Partners: profit share, out-of-pocket advances, reimbursements and compensation. */
export default function PartnersPanel({ data, onChanged }: { data: AccountingData; onChanged: () => Promise<void> }) {
  const [editing, setEditing] = useState<Partner | 'new' | null>(null);
  const [reimbursing, setReimbursing] = useState<Partner | null>(null);
  const [paying, setPaying] = useState<Partner | null>(null);
  const compensation = data.categories.find(c => c.system === 'partner_compensation');
  const linkedCount = data.partners.filter(p => p.lineUserId).length;
  const name = (id: string) => data.partners.find(p => p.id === id)?.name || '-';

  const run = async (action: () => Promise<unknown>) => {
    try { await action(); await onChanged(); } catch (e) { alert(e instanceof Error ? e.message : 'ไม่สำเร็จ'); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="ค้างเบิกคืนหุ้นส่วนทั้งหมด" value={money(data.overview.owedToPartnersSatang)} tone="text-amber-600" hint="เงินที่หุ้นส่วนสำรองจ่ายไปและยังไม่ได้รับคืน" />
        <Stat label="กำไรสุทธิทั้งหมด" value={money(data.overview.profitSatang)} tone={profitTone(data.overview.profitSatang)} hint="ใช้คำนวณส่วนแบ่งตามสัดส่วนหุ้น" />
        <Stat label="บัญชีหุ้นส่วนที่ผูกแล้ว" value={`${linkedCount}/${data.partners.length}`} hint="ใช้บัญชีนี้ตรวจจากการจองเพื่อคำนวณส่วนแบ่งรายทริป" />
      </div>

      <PartnerTripTable data={data} onChanged={onChanged} />

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-black text-slate-800">หุ้นส่วน</h3>
          {data.canEdit !== false && <button type="button" onClick={() => setEditing('new')} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700"><Plus className="h-4 w-4" /> เพิ่มหุ้นส่วน</button>}
        </div>
        {data.partners.length === 0 ? <p className="py-12 text-center text-sm text-slate-400">ยังไม่มีข้อมูลหุ้นส่วน</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-50/80 text-left text-[10px] font-bold text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">ชื่อ</th><th className="px-4 py-2.5 text-right">บัญชี</th><th className="px-4 py-2.5 text-right">สำรองจ่าย</th>
                  <th className="px-4 py-2.5 text-right">เบิกคืนแล้ว</th><th className="px-4 py-2.5 text-right">ค้างเบิกคืน</th><th className="px-4 py-2.5 text-right">ค่าตอบแทน</th>
                  <th className="px-4 py-2.5 text-right">ส่วนแบ่งกำไร</th><th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.partners.map(p => (
                  <tr key={p.id} className="transition-colors hover:bg-violet-50/30">
                    <td className="px-4 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-black text-violet-700">{p.name.trim().charAt(0)}</span><div><p className="font-bold text-slate-800">{p.name}</p><p className="mt-1 text-[11px] text-slate-400">{[p.phone, p.note].filter(Boolean).join(' · ')}</p></div></div></td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">{p.lineUserId ? 'ผูกบัญชีแล้ว' : 'ยังไม่ผูกบัญชี'}</td>
                    <td className="px-4 py-3 text-right">{money(p.advancedSatang)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{money(p.reimbursedSatang)}</td>
                    <td className={cn('px-4 py-3 text-right font-black', p.owedSatang > 0 ? 'text-amber-600' : 'text-slate-400')}>{money(p.owedSatang)}</td>
                    <td className="px-4 py-3 text-right">{money(p.compensationSatang)}</td>
                    <td className={cn('px-4 py-3 text-right font-bold', profitTone(p.profitShareSatang))}>{money(p.profitShareSatang)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {data.canEdit !== false && <div className="flex justify-end gap-1.5">
                        <button type="button" className={smallButton} disabled={p.owedSatang <= 0} onClick={() => setReimbursing(p)} title="บันทึกการเบิกคืน"><Undo2 className="h-3.5 w-3.5" /> เบิกคืน</button>
                        <button type="button" className={smallButton} onClick={() => setPaying(p)} title="บันทึกค่าตอบแทน"><HandCoins className="h-3.5 w-3.5" /> ค่าตอบแทน</button>
                        <button type="button" className="p-1.5 text-slate-400 hover:text-violet-600" onClick={() => setEditing(p)} title="แก้ไข"><Edit2 className="h-4 w-4" /></button>
                        <button type="button" className="p-1.5 text-slate-400 hover:text-rose-600" title="ลบ" onClick={() => { if (confirm(`ลบหุ้นส่วน ${p.name}?`)) void run(() => accountingApi(`partners/${p.id}`, 'DELETE')); }}><Trash2 className="h-4 w-4" /></button>
                      </div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <h3 className="border-b border-slate-100 px-4 py-3 text-sm font-black text-slate-800">ประวัติการเบิกคืน</h3>
        {data.partnerTransactions.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">ยังไม่มีการเบิกคืน</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {data.partnerTransactions.map(t => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-24 text-slate-500">{thaiDate(t.date)}</span>
                <span className="flex-1 font-semibold text-slate-700">{name(t.partnerId)}{t.description && <span className="ml-2 font-normal text-slate-500">{t.description}</span>}</span>
                <span className="font-bold text-emerald-600">{money(t.amountSatang)}</span>
                {data.canEdit !== false && <button type="button" className="p-1 text-slate-400 hover:text-rose-600" title="ลบ" onClick={() => { if (confirm('ลบรายการเบิกคืนนี้?')) void run(() => accountingApi(`reimbursements/${t.id}`, 'DELETE')); }}><Trash2 className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[11px] text-slate-500">ระบบนับผู้ร่วมทริปจากบัญชีหุ้นส่วนที่ผูกไว้และมีการจองสถานะอนุมัติแล้ว · ยกเลิกการจองแล้วจะไม่นับเป็นผู้ร่วมทริป · สำรองจ่ายและค่าตอบแทนยังบันทึกแยกในบัญชีเดิม</p>

      {editing && <PartnerForm partner={editing === 'new' ? null : editing} adminAccounts={data.adminAccounts || []} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onChanged(); }} />}
      {reimbursing && <ReimburseForm partner={data.partners.find(p => p.id === reimbursing.id)!} onClose={() => setReimbursing(null)} onSaved={async () => { setReimbursing(null); await onChanged(); }} />}
      {paying && compensation && <EntryForm type="expense" data={data} entry={null} presetCategory={compensation.id} presetPayee={paying.id} onClose={() => setPaying(null)} onSaved={async () => { setPaying(null); await onChanged(); }} />}
    </div>
  );
}

function PartnerTripTable({ data, onChanged }: { data: AccountingData; onChanged: () => Promise<void> }) {
  const partnerName = (id: string) => data.partners.find(p => p.id === id)?.name || '-';
  const [page, setPage] = useState(queryPage);
  const pageSize = 20;
  const [trips, setTrips] = useState<AccountingData['trips']>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payout, setPayout] = useState<{ tripId: string; partnerId: string; remainingSatang: number } | null>(null);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  useEffect(() => { setQueryPage(currentPage); }, [currentPage]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/admin/accounting/partner-trips?page=${currentPage}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(result => { if (active && result.success) { setTrips(result.trips || []); setTotal(result.total || 0); } })
      .catch(() => { if (active) setTrips([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentPage]);
  return <div className="overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-sm">
    <div className="border-b border-violet-100 bg-violet-50/60 px-4 py-3">
      <div className="flex items-center gap-2"><Map className="h-4 w-4 text-violet-600" /><h3 className="text-sm font-black text-violet-900">ส่วนแบ่งหุ้นส่วนรายทริป</h3></div>
      <p className="mt-1 text-[11px] text-violet-700">ระบบตรวจจากบัญชีหุ้นส่วนที่มีการจองสถานะอนุมัติแล้ว · กันกำไร 20% เป็นเงินส่วนกลาง แล้วแบ่ง 80% ตามการไปทริป</p>
    </div>
    {loading ? <p className="py-10 text-center text-sm text-slate-400">กำลังโหลดข้อมูลทริป...</p> : total === 0 ? <p className="py-10 text-center text-sm text-slate-400">ยังไม่มีทริปที่จบแล้ว</p> : <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-xs">
        <thead className="bg-slate-50/80 text-left text-[10px] font-bold text-slate-400"><tr><th className="px-4 py-3">ทริป / วันเดินทาง</th><th className="px-3 py-3 text-right">กำไรสุทธิ</th><th className="px-3 py-3 text-right">ส่วนกลาง 20%</th><th className="px-3 py-3 text-right">ยอดแบ่ง 80%</th><th className="px-4 py-3">การแบ่งให้หุ้นส่วน</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{trips.map(trip => { const shares = trip.partnerShares || []; return <tr key={trip.tripId} className="align-top hover:bg-violet-50/30">
          <td className="px-4 py-4"><p className="max-w-64 font-bold text-slate-800">{trip.name}</p><p className="mt-1 text-[10px] text-slate-400">{thaiDate(trip.departureDate)}</p></td>
          <td className={cn('whitespace-nowrap px-3 py-4 text-right font-black', profitTone(trip.profitSatang))}>{money(trip.profitSatang)}</td>
          <td className="whitespace-nowrap px-3 py-4 text-right text-amber-600">{money(trip.centralReserveSatang)}</td>
          <td className="whitespace-nowrap px-3 py-4 text-right font-black text-violet-700">{money(trip.distributableProfitSatang)}</td>
          <td className="px-4 py-3"><div className="space-y-2">{shares.length ? shares.map(share => <div key={share.partnerId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"><div><p className="font-semibold text-slate-700">{partnerName(share.partnerId)} {share.attending ? <span className="ml-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">ไปทริป</span> : <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">ไม่ไป</span>}</p><p className="mt-1 text-[10px] text-slate-500">สิทธิ์ {money(share.amountSatang)} · เบิกแล้ว {money(share.paidSatang)} · เหลือ {money(share.remainingSatang)}</p></div>{data.canEdit !== false && <button type="button" disabled={share.remainingSatang <= 0} className={smallButton} onClick={() => setPayout({ tripId: trip.tripId, partnerId: share.partnerId, remainingSatang: share.remainingSatang })}>{share.remainingSatang > 0 ? 'เบิก' : 'เบิกครบแล้ว'}</button>}</div>) : <span className="text-slate-400">ยังไม่มีข้อมูลส่วนแบ่ง</span>}</div></td>
        </tr>; })}</tbody>
      </table>
      {pageCount > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><span className="text-[11px] text-slate-400">หน้า {currentPage} จาก {pageCount} · แสดง {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, total)} จาก {total} ทริป</span><div className="flex items-center gap-2"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-violet-50 disabled:opacity-30" aria-label="หน้าก่อนหน้า"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-violet-50 disabled:opacity-30" aria-label="หน้าถัดไป"><ChevronRight className="h-4 w-4" /></button></div></div>}
    </div>}
    {payout && <PayoutForm tripId={payout.tripId} partnerId={payout.partnerId} remainingSatang={payout.remainingSatang} partnerName={partnerName(payout.partnerId)} onClose={() => setPayout(null)} onSaved={async () => { setPayout(null); await onChanged(); }} />}
  </div>;
}

function PayoutForm({ tripId, partnerId, remainingSatang, partnerName, onClose, onSaved }: { tripId: string; partnerId: string; remainingSatang: number; partnerName: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ amount: String(remainingSatang / 100), date: today(), description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <Modal title="บันทึกการเบิกส่วนแบ่ง" subtitle={`${partnerName} · เหลือเบิก ${money(remainingSatang)}`} onClose={onClose}>
    <form className="space-y-3" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await accountingApi('payouts', 'POST', { ...form, amount: Number(form.amount), tripId, partnerId }); await onSaved(); } catch (err) { setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ'); } finally { setBusy(false); } }}>
      <label className={labelClass}>จำนวนเงินที่เบิก (บาท)<input type="number" required min="0.01" max={remainingSatang / 100} step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={cn(fieldClass, 'font-bold')} /></label>
      <label className={labelClass}>วันที่เบิก<input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={fieldClass} /></label>
      <label className={labelClass}>หมายเหตุ<input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="เช่น โอนเข้าบัญชีแล้ว" className={fieldClass} /></label>
      {error && <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}
      <button type="submit" disabled={busy} className={primaryButton}>{busy ? 'กำลังบันทึก...' : 'บันทึกการเบิก'}</button>
    </form>
  </Modal>;
}

function PartnerForm({ partner, adminAccounts, onClose, onSaved }: { partner: Partner | null; adminAccounts: NonNullable<AccountingData['adminAccounts']>; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: partner?.name || '', phone: partner?.phone || '', lineUserId: partner?.lineUserId || '', adminId: partner?.adminId || '', sharePercent: partner ? String(partner.sharePercent) : '', note: partner?.note || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }));
  return (
    <Modal title={partner ? 'แก้ไขหุ้นส่วน' : 'เพิ่มหุ้นส่วน'} onClose={onClose}>
      <form className="space-y-3" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError('');
        try { await accountingApi(partner ? `partners/${partner.id}` : 'partners', partner ? 'PATCH' : 'POST', form); await onSaved(); }
        catch (err) { setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ'); } finally { setBusy(false); }
      }}>
        <label className={labelClass}>ชื่อ <span className="text-rose-500">*</span><input required value={form.name} onChange={set('name')} className={fieldClass} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>เบอร์โทร<input value={form.phone} onChange={set('phone')} className={fieldClass} /></label>
          <p className="self-end pb-3 text-[11px] leading-relaxed text-slate-400">ส่วนแบ่งจะคำนวณตามการจองของแต่ละทริปอัตโนมัติ</p>
        </div>
        <label className={labelClass}>บัญชี Admin ที่เป็นหุ้นส่วน<select value={form.adminId} onChange={e => setForm(f => ({ ...f, adminId: e.target.value, lineUserId: '' }))} className={fieldClass}><option value="">ยังไม่ผูกบัญชี Admin</option>{adminAccounts.map(account => <option key={account.id} value={account.id}>{account.name} ({account.username})</option>)}</select></label>
        <label className={labelClass}>หมายเหตุ<input value={form.note} onChange={set('note')} className={fieldClass} /></label>
        {error && <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}
        <button type="submit" disabled={busy} className={primaryButton}>{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
      </form>
    </Modal>
  );
}

function ReimburseForm({ partner, onClose, onSaved }: { partner: AccountingData['partners'][number]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ amount: String(Math.max(0, partner.owedSatang) / 100), date: today(), description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal title="บันทึกการเบิกคืน" subtitle={`${partner.name} · ค้างเบิกคืน ${money(partner.owedSatang)}`} onClose={onClose}>
      <form className="space-y-3" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError('');
        try { await accountingApi('reimbursements', 'POST', { ...form, amount: Number(form.amount), partnerId: partner.id }); await onSaved(); }
        catch (err) { setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ'); } finally { setBusy(false); }
      }}>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>จำนวนเงิน (บาท)<input type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={cn(fieldClass, 'font-bold')} /></label>
          <label className={labelClass}>วันที่คืนเงิน<input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={fieldClass} /></label>
        </div>
        <label className={labelClass}>หมายเหตุ<input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="เช่น โอนคืนทาง PromptPay" className={fieldClass} /></label>
        {error && <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</p>}
        <button type="submit" disabled={busy} className={primaryButton}>{busy ? 'กำลังบันทึก...' : 'บันทึกการเบิกคืน'}</button>
      </form>
    </Modal>
  );
}
