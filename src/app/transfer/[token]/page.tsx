'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

type Transfer = { seatLabel: string; tripName: string; departureDate: string; pickupPoint: string; originalName: string; expiresAt: number };
const initial = { titleName: '', fullName: '', nickname: '', phone: '', nationalId: '', birthDate: '', emergencyName: '', emergencyPhone: '', allergies: '', medicalConditions: '', consentInsurance: false };

export default function TransferPage() {
  const { token } = useParams<{ token: string }>();
  const { data: session, status: sessionStatus } = useSession();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  useEffect(() => { fetch(`/api/booking-transfers/${encodeURIComponent(token)}`).then(async response => { const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error); setTransfer(result.transfer); }).catch(error => setError(error.message)).finally(() => setLoading(false)); }, [token]);
  useEffect(() => {
    const lineUserId = session?.user && (session.user as { id?: string }).id;
    if (sessionStatus !== 'authenticated' || !lineUserId) return;
    let active = true;
    setProfileLoading(true);
    fetch(`/api/profile?lineUserId=${encodeURIComponent(lineUserId)}`, { cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success || !result.profile || !active) return;
        setForm(current => ({ ...current, fullName: result.profile.fullName || '', nickname: result.profile.nickname || '', phone: result.profile.phone || '', nationalId: result.profile.nationalId || '', birthDate: result.profile.birthDate || '', emergencyName: result.profile.emergencyName || '', emergencyPhone: result.profile.emergencyPhone || '', allergies: result.profile.allergies || '', medicalConditions: result.profile.medicalConditions || '' }));
      })
      .catch(() => {})
      .finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [sessionStatus, session]);
  const set = (key: keyof typeof initial, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(''); try { const response = await fetch(`/api/booking-transfers/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error); setSuccess(result.message); } catch (error) { setError(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ'); } finally { setBusy(false); } }
  const input = (key: keyof typeof initial, label: string, type = 'text', maxLength?: number) => <label className="block text-xs font-bold text-slate-600">{label}<input required={['allergies', 'medicalConditions'].includes(key) === false} type={type} maxLength={maxLength} value={String(form[key])} onChange={event => set(key, type === 'tel' ? event.target.value.replace(/\D/g, '') : event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-violet-500" /></label>;
  const login = () => void signIn('line', { callbackUrl: window.location.href });
  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-800"><div className="mx-auto max-w-xl space-y-5">{loading ? <p className="py-10 text-center text-violet-600">กำลังตรวจสอบลิงก์…</p> : error && !transfer ? <div className="rounded-2xl bg-rose-50 p-5 text-center font-bold text-rose-700">{error}</div> : success ? <div className="rounded-2xl bg-emerald-50 p-6 text-center font-bold text-emerald-700">{success}<p className="mt-2 text-sm font-normal">ผู้เดินทางสำหรับที่นั่ง {transfer?.seatLabel} ถูกบันทึกแล้ว</p></div> : transfer && <><section className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold text-violet-600">ลงทะเบียนผู้เดินทางแทน</p><h1 className="mt-1 text-2xl font-black">{transfer.tripName}</h1><p className="mt-2 text-sm text-slate-600">ที่นั่ง <b>{transfer.seatLabel}</b> · ผู้จองเดิม {transfer.originalName}</p><p className="mt-1 text-xs text-slate-500">ลิงก์นี้ใช้สำหรับลงทะเบียนข้อมูลผู้เดินทางเท่านั้น ไม่สร้างรายการจองหรือเปลี่ยนธุรกรรมการเงินเดิม</p></section>{sessionStatus !== 'authenticated' || !session?.user ? <section className="rounded-2xl bg-white p-6 text-center shadow-sm"><p className="text-sm font-bold">กรุณาเข้าสู่ระบบด้วย LINE ก่อนลงทะเบียน</p><button type="button" onClick={login} className="mt-4 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white">เข้าสู่ระบบ LINE</button></section> : <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-bold text-violet-700">ข้อมูลผู้เดินทาง</p>{profileLoading && <span className="text-[11px] text-slate-400">กำลังโหลดข้อมูลเดิม…</span>}</div><div className="grid gap-3 sm:grid-cols-[120px_1fr]"><label className="block text-xs font-bold text-slate-600">คำนำหน้า<select required value={form.titleName} onChange={event => set('titleName', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm"><option value="">เลือก</option><option>นาย</option><option>นาง</option><option>นางสาว</option></select></label>{input('fullName', 'ชื่อ-นามสกุล')}</div><div className="grid gap-3 sm:grid-cols-2">{input('nickname', 'ชื่อเล่น')}{input('phone', 'เบอร์โทรศัพท์', 'tel', 10)}</div><div className="grid gap-3 sm:grid-cols-2">{input('nationalId', 'เลขบัตรประชาชน', 'tel', 13)}{input('birthDate', 'วันเดือนปีเกิด', 'date')}</div><div className="grid gap-3 sm:grid-cols-2">{input('emergencyName', 'ผู้ติดต่อฉุกเฉิน')}{input('emergencyPhone', 'เบอร์ฉุกเฉิน', 'tel', 10)}</div><div className="grid gap-3 sm:grid-cols-2">{input('allergies', 'แพ้อาหาร (ถ้ามี)')}{input('medicalConditions', 'โรคประจำตัว (ถ้ามี)')}</div><label className="flex items-start gap-2 rounded-xl border border-purple-100 bg-purple-50 p-3 text-xs leading-relaxed"><input type="checkbox" required checked={form.consentInsurance} onChange={event => set('consentInsurance', event.target.checked)} className="mt-0.5" />ยินยอมให้ผู้จัดทริปเก็บ ใช้ และเปิดเผยข้อมูลที่จำเป็นเพื่อทำประกันและดูแลความปลอดภัยระหว่างเดินทาง</label>{error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}<button disabled={busy || profileLoading} className="w-full rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'กำลังบันทึก…' : 'ลงทะเบียนผู้เดินทางแทน'}</button></form>}</>}</div></main>;
}
