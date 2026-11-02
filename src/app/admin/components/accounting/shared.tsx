'use client';

import React from 'react';
import { X, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccountCategory, AccountEntry, AccountingSummary, Partner, PartnerTransaction } from '@/lib/accounting';

export type AccountingData = AccountingSummary & { categories: AccountCategory[]; entries: AccountEntry[]; partnerTransactions: PartnerTransaction[]; canEdit?: boolean };
export type { AccountCategory, AccountEntry, Partner };

export const PAYMENT_CATEGORY_ID = 'customer-payments';
export const PAYMENT_CATEGORY_NAME = 'ค่าทริปจากลูกทริป (ระบบชำระเงิน)';

export const money = (satang: number) =>
  `${satang < 0 ? '-' : ''}฿${(Math.abs(satang) / 100).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
export const thaiDate = (iso: string) => (iso ? new Date(`${iso}T00:00:00+07:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Bangkok' }) : '-');
export const today = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

/** JSON call to the accounting API; throws the server's Thai error message. */
export async function accountingApi(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  const res = await fetch(`/api/admin/accounting/${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.error || 'บันทึกไม่สำเร็จ');
  return data;
}

export function Stat({ label, value, tone = 'text-slate-900', hint, icon: Icon = Wallet }: { label: string; value: string; tone?: string; hint?: string; icon?: React.ElementType }) {
  const colors = tone.includes('emerald') ? { bg: 'bg-emerald-50', line: 'bg-emerald-400', ink: 'text-emerald-600' }
    : tone.includes('rose') ? { bg: 'bg-rose-50', line: 'bg-rose-400', ink: 'text-rose-600' }
    : tone.includes('amber') ? { bg: 'bg-amber-50', line: 'bg-amber-400', ink: 'text-amber-600' }
    : { bg: 'bg-violet-50', line: 'bg-violet-400', ink: 'text-violet-600' };
  return <div className="relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
    <div aria-hidden="true" className={cn('absolute inset-x-5 top-0 h-0.5 rounded-b-full', colors.line)} />
    <div className="flex items-start justify-between gap-2"><p className="pt-1 text-[11px] font-semibold leading-relaxed text-slate-500">{label}</p><span className={cn('shrink-0 rounded-xl p-2', colors.bg, colors.ink)}><Icon aria-hidden="true" className="h-4 w-4" /></span></div>
    <p className={cn('mt-3 break-words text-xl font-black tracking-tight tabular-nums sm:text-2xl 2xl:text-[28px]', tone)}>{value}</p>
    {hint && <p className="mt-2 text-[10px] leading-relaxed text-slate-400">{hint}</p>}
  </div>;
}

export const profitTone = (satang: number) => (satang > 0 ? 'text-emerald-600' : satang < 0 ? 'text-rose-600' : 'text-slate-500');

export function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  const titleId = React.useId();
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/70 bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 id={titleId} className="text-lg font-black text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-50 p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-600" aria-label="ปิด"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fieldClass = 'mt-1.5 h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-700 outline-none transition-colors focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100';
export const labelClass = 'block text-xs font-bold text-slate-700';
export const primaryButton = 'h-11 w-full rounded-xl bg-violet-600 text-sm font-bold text-white shadow-sm shadow-violet-600/15 transition hover:bg-violet-700 disabled:opacity-40';
export const smallButton = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40';
