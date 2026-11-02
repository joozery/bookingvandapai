'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, LoaderCircle, PlugZap, Save, ShieldCheck } from 'lucide-react';
import type { PaymentSettings } from '@/lib/paymentSettings';
import BankReceiverSelect from './BankReceiverSelect';

type Connection = { connected: boolean; package: string; tokenRemaining: number; checkedAt: string };
const initial: PaymentSettings = { enabled: false, baseUrl: 'https://connect.slip2go.com', promptPayType: 'phone_number', promptPayCode: '', accountName: '', receiverType: '', receiverNumber: '' };
async function read(response: Response) {
  let result;
  try { result = await response.json(); }
  catch { throw new Error(`เซิร์ฟเวอร์ตอบกลับไม่สมบูรณ์ (${response.status}) กรุณาลองใหม่`); }
  if (!response.ok || !result.success) throw new Error(result.error || 'ทำรายการไม่สำเร็จ');
  return result;
}
export default function PaymentSettingsPanel() {
  const [settings, setSettings] = useState(initial);
  const [secret, setSecret] = useState('');
  const [hasSecret, setHasSecret] = useState(false);
  // Read-only staff see the settings but cannot change the QR / receiver.
  const [canEdit, setCanEdit] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [savedEnabled, setSavedEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [connection, setConnection] = useState<Connection | null>(null);
  const [dirty, setDirty] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/payment-settings', { cache: 'no-store', signal: controller.signal }).then(read).then(result => {
      setSettings(result.settings); setHasSecret(result.hasSecret); setCanEdit(result.canEdit !== false); setSavedAt(result.updatedAt); setSavedEnabled(result.settings.enabled); setLoaded(true); setError('');
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  function update<K extends keyof PaymentSettings>(key: K, value: PaymentSettings[K]) {
    setSettings(current => ({ ...current, [key]: value })); setDirty(true); setMessage('');
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy('save'); setError(''); setMessage('');
    try {
      const result = await read(await fetch('/api/admin/payment-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20_000), body: JSON.stringify({ settings, ...(secret.trim() ? { secret: secret.trim() } : {}) }) }));
      setSettings(result.settings); setHasSecret(result.hasSecret); setSavedAt(result.updatedAt); setSavedEnabled(result.settings.enabled); setSecret(''); setDirty(false); setConnection(null); setMessage('บันทึกการตั้งค่าชำระเงินแล้ว');
    } catch (error) { setError(error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 'บันทึกใช้เวลานานกว่าปกติ กรุณาโหลดข้อมูลใหม่เพื่อตรวจสอบก่อนลองอีกครั้ง' : (error as Error).message); }
    finally { setBusy(null); }
  }
  async function test() {
    setBusy('test'); setError(''); setMessage(''); setConnection(null);
    try {
      const result = await read(await fetch('/api/admin/payment-settings', { method: 'POST' }));
      setConnection(result.connection);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(null); }
  }
  const field = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 disabled:bg-slate-50';
  return <section aria-labelledby="payment-settings-title" className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100 bg-purple-50/60 p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700"><CreditCard className="h-5 w-5" /></span><div><h3 id="payment-settings-title" className="font-black text-purple-950">ตั้งค่าชำระเงิน · Slip2Go</h3><p className="mt-1 text-xs text-slate-500">บัญชีรับเงิน การตรวจสลิป และสถานะการเชื่อมต่อ</p></div></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${savedEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{savedEnabled ? 'เปิดรับชำระเงิน' : 'ปิดรับชำระเงิน'}</span></div>
    <form noValidate onSubmit={save} className="space-y-5 p-5 sm:p-6">
      {loading ? <p className="text-sm text-purple-600" role="status">กำลังโหลดการตั้งค่า…</p> : <>
        <fieldset disabled={!!busy || !loaded || !canEdit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">API URL<input readOnly value={settings.baseUrl} className={`${field} bg-slate-50`} /></label>
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">Slip2Go Secret Key<span className="ml-2 font-normal text-purple-600">{hasSecret ? 'มีคีย์แล้ว · เว้นว่างเพื่อใช้คีย์เดิม' : 'ยังไม่ได้ตั้งค่าคีย์'}</span><input type="password" value={secret} maxLength={1000} autoComplete="new-password" placeholder={hasSecret ? 'กรอกเฉพาะเมื่อต้องการเปลี่ยนคีย์' : 'วาง Secret Key ของร้าน'} onChange={event => { setSecret(event.target.value); setDirty(true); setMessage(''); }} className={field} /></label>
          <label className="text-xs font-bold text-slate-600">ประเภทพร้อมเพย์<select value={settings.promptPayType} onChange={event => update('promptPayType', event.target.value)} className={field}><option value="phone_number">เบอร์โทรศัพท์ (10 หลัก)</option><option value="citizen_id">เลขบัตรประชาชน / เลขผู้เสียภาษี (13 หลัก)</option><option value="e_wallet">e-Wallet (15 หลัก)</option></select></label>
          <label className="text-xs font-bold text-slate-600">หมายเลขพร้อมเพย์<input inputMode="numeric" value={settings.promptPayCode} maxLength={15} onChange={event => update('promptPayCode', event.target.value.replace(/\D/g, ''))} placeholder="หมายเลขรับเงินของร้าน" className={field} /></label>
          <label className="text-xs font-bold text-slate-600 sm:col-span-2">ชื่อบัญชีผู้รับ<input value={settings.accountName} maxLength={200} onChange={event => update('accountName', event.target.value)} placeholder="ชื่อตามบัญชีธนาคาร" className={field} /></label>
          <BankReceiverSelect value={settings.receiverType} onChange={value => update('receiverType', value)} disabled={!!busy || !loaded || !canEdit} required={settings.enabled} />
          <label className="text-xs font-bold text-slate-600">เลขบัญชี / พร้อมเพย์สำหรับตรวจผู้รับ<input value={settings.receiverNumber} maxLength={30} onChange={event => update('receiverNumber', event.target.value)} placeholder="ห้ามเว้นวรรคหรือใส่ขีด" className={field} /></label>
          <p className="text-[11px] leading-relaxed text-slate-500 sm:col-span-2">QR รับเงินใช้หมายเลขพร้อมเพย์ด้านบน ระบบตรวจผู้รับได้ทั้งพร้อมเพย์นี้และบัญชีธนาคารที่ระบุ</p>
          <button type="button" className="justify-self-start text-xs font-bold text-purple-700 hover:underline sm:col-span-2" onClick={() => { setSettings(current => ({ ...current, receiverNumber: current.promptPayCode, receiverType: current.promptPayType === 'phone_number' ? '02001' : current.promptPayType === 'citizen_id' ? '02003' : '02004' })); setDirty(true); setMessage(''); }}>ใช้หมายเลขพร้อมเพย์ด้านบนตรวจผู้รับ</button>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-purple-100 bg-purple-50/50 p-4 sm:col-span-2"><input type="checkbox" checked={settings.enabled} onChange={event => update('enabled', event.target.checked)} className="mt-0.5 h-4 w-4 accent-purple-700" /><span><span className="block text-sm font-bold text-purple-950">เปิดระบบรับชำระเงิน</span><span className="mt-1 block text-xs font-normal leading-relaxed text-slate-500">ใช้กับการจองใหม่ · มัดจำ (ตั้งยอดได้ในหน้าจัดการทริป ค่าเริ่มต้น 50%) หรือชำระเต็ม · ยอดคงเหลือชำระก่อนเดินทาง 24 ชั่วโมง</span></span></label>
        </fieldset>
        {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}<button type="button" disabled={!!busy} onClick={() => setRetry(value => value + 1)} className="ml-3 text-xs font-bold underline">โหลดใหม่</button></div>}
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
        {loaded && !canEdit && <p role="status" className="rounded-xl bg-sky-50 p-3 text-xs font-bold text-sky-800">คุณมีสิทธิ์ดูการตั้งค่าอย่างเดียว การแก้ไขบัญชีรับเงิน / QR ต้องได้รับอนุญาตจากแอดมินหลัก</p>}
        {canEdit && <div className="flex flex-wrap gap-3"><button disabled={!!busy || !loaded} type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-800 disabled:opacity-50">{busy === 'save' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{busy === 'save' ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่าชำระเงิน'}</button><button disabled={!!busy || !loaded || !hasSecret || dirty} type="button" onClick={test} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-purple-200 px-4 py-2.5 text-xs font-bold text-purple-700 hover:bg-purple-50 disabled:opacity-50">{busy === 'test' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}ทดสอบการเชื่อมต่อ</button></div>}
        {!dirty && savedAt && <p className="text-xs text-slate-500">บันทึกล่าสุด {new Date(savedAt).toLocaleString('th-TH')}</p>}
        {dirty && <p role="status" className="text-xs text-amber-700">มีการแก้ไขที่ยังไม่ได้บันทึก กรุณาบันทึกก่อนทดสอบการเชื่อมต่อ</p>}
        {connection && <div role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="text-sm font-bold">เชื่อมต่อ Slip2Go สำเร็จ</p><p className="mt-1 text-xs">แพ็กเกจ {connection.package} · โควตาคงเหลือ {connection.tokenRemaining.toLocaleString('th-TH')} ครั้ง</p><p className="mt-1 text-[10px]">ตรวจเมื่อ {new Date(connection.checkedAt).toLocaleString('th-TH')}</p></div></div>}
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />คีย์ที่บันทึกใหม่ถูกเข้ารหัสและไม่ส่งกลับมาที่หน้าเว็บ การทดสอบเชื่อมต่ออ่านสถานะแพ็กเกจเท่านั้น ยังไม่สร้าง QR หรือตรวจสลิป</p>
      </>}
    </form>
  </section>;
}
