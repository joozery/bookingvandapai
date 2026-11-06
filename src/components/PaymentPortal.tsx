'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, Download, LoaderCircle, MessageSquare, ShieldCheck, Upload, X } from 'lucide-react';
import { tripMessengerUrl } from '@/lib/contact';
import { depositSatang, paymentQuote } from '@/lib/paymentRules';
import type { PaymentOrder } from '@/lib/paymentStore';

type Order = Omit<PaymentOrder, 'userId'>;
type Trip = { id: string; name: string; image?: string | null; displayCost?: number; cost: number; flashSalePrice?: number | null; flashSaleActive?: boolean; depositAmount?: number | null; departureDate: string; departureTime: string; durationDays?: number; tripPeriod?: string; pickupPoint?: string; availableSeats: number };
const needsSeatSelection = (order: Order) => !order.autoCancelledAt && !order.bookingId && order.paidSatang > 0 && ['deposit_paid', 'paid'].includes(order.status);
const seatSelectionHref = (tripId: string) => `/?tripId=${encodeURIComponent(tripId)}&step=2&fromPayment=1`;
const money = (satang: number) => (satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 });
const dateTime = (value: number) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(value);
const thaiTripDate = (value: string) => value ? new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date(`${value}T00:00:00+07:00`)) : '-';

async function readResponse(response: Response) {
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || 'ทำรายการไม่สำเร็จ กรุณาลองใหม่');
  return data;
}

export default function PaymentPortal() {
  const { data: session, status } = useSession();
  const search = useSearchParams();
  const tripId = search.get('tripId');
  const requestedOrderId = search.get('orderId');
  const requestedMode = search.get('pay');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [current, setCurrent] = useState<Order | null>(null);
  const [plan, setPlan] = useState<'deposit' | 'full'>('full');
  const [creditBalanceSatang, setCreditBalanceSatang] = useState(0);
  const [useCredit, setUseCredit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slip, setSlip] = useState<File | null>(null);
  const [success, setSuccess] = useState<Order | null>(null);
  const [now, setNow] = useState(0);
  const qrRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const promptedOrders = useRef(new Set<string>());
  const presentSeatPrompt = useCallback((order: Order) => {
    if (!needsSeatSelection(order) || promptedOrders.current.has(order.id)) return;
    promptedOrders.current.add(order.id);
    setCurrent(order); setSlip(null); setError(''); setSuccess(order);
  }, []);

  const refresh = useCallback(async () => {
    const data = await readResponse(await fetch('/api/payments', { cache: 'no-store' }));
    const latest = data.orders as Order[];
    setOrders(latest);
    setCurrent(previous => previous ? latest.find(order => order.id === previous.id) || previous : previous);
    const awaitingSeat = latest.find(order => needsSeatSelection(order) && (!tripId || order.tripId === tripId) && (!requestedOrderId || order.id === requestedOrderId));
    if (awaitingSeat) presentSeatPrompt(awaitingSeat);
    try { const credits = await readResponse(await fetch('/api/credits', { cache: 'no-store' })); setCreditBalanceSatang(Number(credits.balanceSatang || 0)); } catch { /* payment history remains usable if credits are unavailable */ }
    return latest;
  }, [tripId, requestedOrderId, presentSeatPrompt]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (status === 'loading') return;
    async function load() {
      try {
        if (tripId) {
          const trips = await readResponse(await fetch('/api/trips', { cache: 'no-store' }));
          const selected = trips.trips.find((value: Trip) => value.id === tripId);
          if (!selected) throw new Error('ไม่พบทริปนี้');
          if (!cancelled) setTrip(selected);
        }
        if (!session?.user) return;
        const data = await readResponse(await fetch('/api/payments', { cache: 'no-store' }));
        try { const credits = await readResponse(await fetch('/api/credits', { cache: 'no-store' })); if (!cancelled) setCreditBalanceSatang(Number(credits.balanceSatang || 0)); } catch { /* ignore credit history loading errors */ }
        if (!cancelled) {
          setOrders(data.orders);
          const awaitingSeat = (data.orders as Order[]).find(order => needsSeatSelection(order) && (!tripId || order.tripId === tripId) && (!requestedOrderId || order.id === requestedOrderId));
          if (awaitingSeat) presentSeatPrompt(awaitingSeat);
        }
        if (requestedOrderId) {
          let requested = (data.orders as Order[]).find(order => order.id === requestedOrderId);
          if (!requested) requested = (await readResponse(await fetch(`/api/payments/${encodeURIComponent(requestedOrderId)}`, { cache: 'no-store' }))).order as Order;
          if (cancelled) return;
          setCurrent(requested);
          if (needsSeatSelection(requested)) presentSeatPrompt(requested);
          else if (requestedMode === 'balance' && requested.status === 'deposit_paid') {
            const prepared = await readResponse(await fetch(`/api/payments/${encodeURIComponent(requested.id)}`, { method: 'POST' }));
            if (!cancelled) setCurrent(prepared.order);
          }
        }
      } catch (error) { if (!cancelled) setError((error as Error).message); }
      finally { if (!cancelled) { setLoading(false); setNow(Date.now()); } }
    }
    void load();
    return () => { cancelled = true; };
  }, [status, session, tripId, requestedOrderId, requestedMode, presentSeatPrompt]);
  useEffect(() => { if (success && !dialogRef.current?.open) dialogRef.current?.showModal(); }, [success]);

  useEffect(() => {
    if (status !== 'authenticated' || busy) return;
    const controller = new AbortController();
    let inFlight = false;
    const sync = async () => {
      if (document.visibilityState !== 'visible' || inFlight) return;
      inFlight = true;
      try {
        const data = await readResponse(await fetch('/api/payments', { cache: 'no-store', signal: controller.signal }));
        if (controller.signal.aborted) return;
        const latest = data.orders as Order[];
        setOrders(latest);
        setCurrent(previous => previous ? latest.find(order => order.id === previous.id) || previous : previous);
        const awaitingSeat = latest.find(order => needsSeatSelection(order) && (!tripId || order.tripId === tripId) && (!requestedOrderId || order.id === requestedOrderId));
        if (awaitingSeat) presentSeatPrompt(awaitingSeat);
      } catch { /* keep the current invoice and retry on the next refresh */ }
      finally { inFlight = false; }
    };
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    const timer = current?.status === 'pending' ? setInterval(sync, 10_000) : null;
    return () => {
      controller.abort();
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
      if (timer) clearInterval(timer);
    };
  }, [status, busy, tripId, requestedOrderId, current?.status, presentSeatPrompt]);

  async function prepare(order: Order) {
    const latest = await readResponse(await fetch(`/api/payments/${encodeURIComponent(order.id)}`, { cache: 'no-store' }));
    order = latest.order;
    setCurrent(order);
    setSlip(null);
    if (fileRef.current) fileRef.current.value = '';
    if (needsSeatSelection(order)) {
      promptedOrders.current.add(order.id);
      setSuccess(order);
      return;
    }
    if (order.status === 'paid') return;
    const data = await readResponse(await fetch(`/api/payments/${encodeURIComponent(order.id)}`, { method: 'POST' }));
    setCurrent(data.order);
  }
  async function start(order?: Order) {
    setBusy(true); setError('');
    try {
      if (order) await prepare(order);
      else {
        const requestedTotal = plan === 'deposit' && trip ? depositSatang(trip) : trip ? Math.round((trip.displayCost ?? trip.cost) * 100) : 0;
        const creditSatang = useCredit ? Math.min(creditBalanceSatang, requestedTotal) : 0;
        const data = await readResponse(await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tripId: trip?.id, plan, useCredit: creditSatang > 0, creditSatang }) }));
        await prepare(data.order);
      }
      await refresh();
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function verify() {
    if (!slip || !current) return;
    setBusy(true); setError('');
    try {
      const form = new FormData(); form.set('slip', slip);
      const data = await readResponse(await fetch(`/api/payments/${encodeURIComponent(current.id)}/verify`, { method: 'POST', body: form }));
      setCurrent(data.order); setSlip(null);
      if (data.reviewRequired) setError(`ได้รับข้อมูลยอดโอนแล้ว แต่รายการนี้ต้องให้แอดมินตรวจสอบ กรุณาติดต่อแอดมินพร้อมเลขรายการ ${current.id}`);
      else setSuccess(data.order);
      await refresh();
    } catch (error) {
      setError((error as Error).message);
      // A lost HTTP response must not leave the screen asking the user to pay again.
      try {
        const data = await readResponse(await fetch(`/api/payments/${current.id}`, { cache: 'no-store' }));
        setCurrent(data.order);
        if (data.order.paidSatang > current.paidSatang) { setError(''); setSuccess(data.order); }
        await refresh();
      } catch { /* retain original error */ }
    } finally { setBusy(false); }
  }
  let depositAllowed = false;
  try { if (trip && now) { paymentQuote(trip, 'deposit', now); depositAllowed = true; } } catch { /* full payment only */ }
  const active = orders.find(order => order.tripId === tripId && !order.autoCancelledAt && (['paid', 'deposit_paid'].includes(order.status) || (order.status === 'pending' && order.expiresAt > now)));
  const expired = current?.status === 'pending' && current.expiresAt <= now;
  const selectedTotalSatang = plan === 'deposit' && trip ? depositSatang(trip) : trip ? Math.round((trip.displayCost ?? trip.cost) * 100) : 0;
  const selectedCreditSatang = useCredit ? Math.min(creditBalanceSatang, selectedTotalSatang) : 0;
  const action = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-purple-800 disabled:cursor-wait disabled:opacity-50';
  const isAdminSession = (session?.user as { role?: string } | undefined)?.role === 'admin';
  const isPaymentCustomer = !!session?.user && !isAdminSession;
  const loginCustomer = () => { void signOut({ redirect: false }).then(() => signIn('line', { callbackUrl: `/payments${search.toString() ? `?${search.toString()}` : ''}` })); };

  return <div className="min-h-screen bg-[#f8f6fd] text-slate-800">
    <header className="border-b border-purple-100 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4"><Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-purple-700"><ArrowLeft className="h-4 w-4" />กลับหน้าแรก</Link><div className="flex items-center gap-3">{isPaymentCustomer && <Link href="/tickets" className="text-xs font-bold text-purple-700">ตั๋วของฉัน</Link>}{!isPaymentCustomer && status !== 'loading' && <button type="button" onClick={loginCustomer} className="inline-flex min-h-9 items-center justify-center rounded-xl bg-purple-700 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-purple-800">เข้าสู่ระบบ LINE</button>}</div></div></header>
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:py-12">
      <style>{`main > div.p-8.text-center > div.mb-5.overflow-hidden { display: none; }`}</style>
      {trip && !isPaymentCustomer && <section className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm"><div className="relative h-44"><img src={trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&auto=format&fit=crop&q=80'} alt={trip.name} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" /><div className="absolute bottom-4 left-5 right-5 text-white"><h2 className="text-xl font-black">{trip.name}</h2><p className="mt-1 text-sm font-bold">{trip.flashSaleActive ? `Flash Sale ฿${money(Math.round((trip.displayCost ?? trip.cost) * 100))}` : `฿${money(Math.round(trip.cost * 100))}`} / ท่าน</p></div></div><div className="grid gap-3 p-5 text-sm text-slate-600 sm:grid-cols-2"><p>📅 ช่วงทริป: <b className="text-slate-800">{trip.tripPeriod || `${trip.durationDays || '-'} วัน`}</b></p><p>🗓️ วันออกเดินทาง: <b className="text-slate-800">{thaiTripDate(trip.departureDate)}</b></p><p>🕓 เวลาออกเดินทาง: <b className="text-slate-800">{trip.departureTime} น.</b></p><p>📍 จุดขึ้นรถ: <b className="text-slate-800">{trip.pickupPoint || '-'}</b></p><p>💺 ที่นั่งว่าง: <b className="text-slate-800">{trip.availableSeats} ที่นั่ง</b></p></div></section>}
      <div><p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-purple-500">DAPAI DERNPAI PAYMENT</p><h1 className="text-2xl font-black text-purple-950 sm:text-3xl">ชำระเงินทริปของคุณ</h1><p className="mt-2 text-sm text-slate-500">ชำระเงิน → ตรวจสลิป → เลือกที่นั่ง</p></div>
      {error && <p role="alert" className="sticky top-3 z-20 break-words rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-sm">{error}</p>}
      {status === 'loading' || loading ? <p role="status" className="py-8 text-center text-purple-600">กำลังโหลดข้อมูล…</p> : !isPaymentCustomer ? <div className="rounded-3xl border border-purple-100 bg-white p-8 text-center">{trip && <div className="mb-5 overflow-hidden rounded-2xl bg-purple-50 text-left"><img src={trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&auto=format&fit=crop&q=80'} alt={trip.name} className="h-40 w-full object-cover" /><div className="p-4"><p className="text-xs font-bold text-purple-500">ทริปที่เลือก</p><h2 className="mt-1 text-lg font-black text-purple-950">{trip.name}</h2><p className="mt-1 text-sm text-slate-600">ราคา ฿{money(Math.round((trip.displayCost ?? trip.cost) * 100))} / ท่าน · เหลือ {trip.availableSeats} ที่นั่ง</p></div></div>}<h2 className="mb-4 font-bold">เข้าสู่ระบบด้วย LINE เพื่อชำระเงิน</h2><button type="button" className={action} onClick={loginCustomer}>เข้าสู่ระบบด้วย LINE</button></div> : <>
        {trip && !current && <section className="rounded-3xl border border-purple-100 bg-white p-5 sm:p-7"><h2 className="text-xl font-black text-purple-950">{trip.name}</h2><p className="mt-2 text-sm text-slate-500">ราคาทริป {trip.flashSaleActive && <><span className="mr-2 text-slate-400 line-through">฿{money(Math.round(trip.cost * 100))}</span><span className="font-black text-amber-600">Flash Sale ฿{money(Math.round((trip.displayCost ?? trip.cost) * 100))}</span></>} {!trip.flashSaleActive && <>฿{money(Math.round(trip.cost * 100))}</>} / ท่าน</p>
          {active ? <div className="mt-5 space-y-3"><p className="text-sm text-purple-700">คุณมีรายการชำระเงินสำหรับทริปนี้แล้ว</p><button disabled={busy} className={action} onClick={() => start(active)}>เปิดรายการเดิม</button></div> : trip.availableSeats <= 0 ? <a className={`${action} mt-5`} href={tripMessengerUrl(trip.id)} target="_blank" rel="noopener noreferrer"><MessageSquare className="h-4 w-4" />ทริปเต็มแล้ว ทักแชทแอดมิน</a> : <>
            <fieldset disabled={busy} className="mt-5 grid gap-3 sm:grid-cols-2"><legend className="mb-3 text-sm font-bold">เลือกรูปแบบชำระเงิน</legend>{(['deposit', 'full'] as const).map(option => <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${plan === option ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-slate-200'} ${option === 'deposit' && !depositAllowed ? 'opacity-50' : ''}`}><input className="mt-1 accent-purple-600" type="radio" name="plan" value={option} checked={plan === option} disabled={option === 'deposit' && !depositAllowed} onChange={() => setPlan(option)} /><span><span className="block text-sm font-bold">{option === 'deposit' ? 'ชำระมัดจำ' : 'ชำระเต็มจำนวน'}</span><span className="mt-2 block text-xl font-black text-purple-800">฿{money(option === 'deposit' ? depositSatang(trip) : Math.round(trip.cost * 100))}</span></span></label>)}</fieldset>
            {creditBalanceSatang > 0 && <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><input type="checkbox" className="mt-1 accent-emerald-600" checked={useCredit} onChange={event => setUseCredit(event.target.checked)} /><span className="text-sm"><span className="block font-bold text-emerald-800">ใช้เครดิตของฉัน</span><span className="mt-1 block text-xs text-emerald-700">มีเครดิต ฿{money(creditBalanceSatang)} · ใช้ครั้งนี้ ฿{money(selectedCreditSatang)} · เหลือชำระด้วยการโอน ฿{money(selectedTotalSatang - selectedCreditSatang)}</span><span className="mt-1 block text-[11px] text-emerald-700">เครดิตมีอายุ 1 ปีนับจากวันที่ได้รับ</span></span></label>}
            <p className="my-4 text-xs leading-relaxed text-slate-500">ยอดคงเหลือต้องชำระก่อนออกเดินทางอย่างน้อย 7 วัน หากเหลือไม่ถึง 7 วันให้ชำระเต็มจำนวน ระบบกันจำนวนที่ว่างให้ 30 นาทีระหว่างชำระเงิน</p><button disabled={busy} className={action} onClick={() => start()}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}สร้าง QR ชำระเงิน</button>
          </>}
        </section>}

        {current && <section className="grid gap-5 rounded-3xl border border-purple-100 bg-white p-5 sm:p-7 md:grid-cols-2">
          <div><button disabled={busy} type="button" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-purple-600 disabled:opacity-50" onClick={() => { setCurrent(null); setSlip(null); setError(''); }}><ArrowLeft className="h-3.5 w-3.5" />กลับไปรายการ</button><h2 className="text-xl font-black text-purple-950">{current.tripName}</h2><p className="mt-2 break-all text-[10px] text-slate-400">เลขรายการ {current.id}</p><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt>ราคาทริป</dt><dd>฿{money(current.totalSatang)}</dd></div><div className="flex justify-between gap-3"><dt>ชำระแล้ว</dt><dd className="font-bold text-emerald-700">฿{money(current.paidSatang)}</dd></div><div className="flex justify-between gap-3 border-t border-purple-100 pt-3"><dt>ยอดคงเหลือ</dt><dd className="font-black text-purple-800">฿{money(current.totalSatang - current.paidSatang)}</dd></div></dl>
            {current.paidSatang < current.totalSatang && <p className={`mt-4 rounded-xl p-3 text-xs leading-relaxed ${now > current.balanceDueAt ? 'bg-rose-50 text-rose-700' : 'bg-purple-50 text-purple-700'}`}>กำหนดชำระครบ {dateTime(current.balanceDueAt)}{now > current.balanceDueAt && ' · เกินกำหนด กรุณาติดต่อแอดมิน'}</p>}
            {['deposit_paid', 'paid'].includes(current.status) && <Link href={current.bookingId ? '/tickets' : seatSelectionHref(current.tripId)} className={`${action} mt-5 w-full`}>{current.bookingId ? 'ดูตั๋วของฉัน' : 'ไปเลือกจองที่นั่ง'}<ArrowRight className="h-4 w-4" /></Link>}
            <a href={tripMessengerUrl(current.tripId)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-purple-600"><MessageSquare className="h-4 w-4" />ติดต่อแอดมินเกี่ยวกับรายการนี้</a>
          </div>
          <div className="rounded-2xl bg-purple-50/60 p-4 text-center">
            {needsSeatSelection(current) ? <div className="py-10"><CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" /><h3 className="font-black text-emerald-700">{current.status === 'paid' ? 'ชำระครบแล้ว' : 'ชำระมัดจำแล้ว'}</h3><p className="mt-3 text-sm text-slate-500">ไปเลือกที่นั่งเพื่อยืนยันการจองและรับตั๋วของคุณ</p><Link href={seatSelectionHref(current.tripId)} className={`${action} mt-5 w-full`}>เลือกจองที่นั่ง<ArrowRight className="h-4 w-4" /></Link></div> : current.status === 'expired' ? <p className="py-8 text-sm text-rose-700">ยอดชำระรอแอดมินตรวจสอบ กรุณาส่งเลขรายการให้แอดมิน</p> : current.status === 'paid' ? <div className="py-10"><CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-500" /><h3 className="font-black text-emerald-700">ชำระครบแล้ว</h3></div> : expired ? <p className="py-8 text-sm text-rose-700">หมดเวลากันที่ว่างแล้ว หากโอนแล้วให้แนบสลิปตรวจสอบหรือติดต่อแอดมิน ห้ามโอนซ้ำ</p> : current.qrCode ? <><p className="text-xs font-bold text-purple-700">สแกนพร้อมเพย์เพื่อชำระ {current.paidSatang ? 'ยอดคงเหลือ' : current.plan === 'deposit' ? 'มัดจำ' : 'เต็มจำนวน'}</p><p className="my-3 text-3xl font-black text-purple-950">฿{money(current.amountSatang)}</p><div ref={qrRef} className="mx-auto w-fit rounded-2xl bg-white p-4"><QRCodeCanvas value={current.qrCode} size={208} marginSize={2} level="M" title="QR พร้อมเพย์ชำระค่าทริป" /></div><p className="mt-3 text-sm font-bold">{current.accountName}</p><p className="mt-1 text-[11px] text-slate-500">ตรวจชื่อผู้รับและยอดเงินในแอปธนาคารก่อนยืนยัน</p><button type="button" className="my-3 inline-flex items-center gap-1.5 text-xs font-bold text-purple-600" onClick={() => { const canvas = qrRef.current?.querySelector('canvas'); if (canvas) { const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = `payment-${current.id}.png`; link.click(); } }}><Download className="h-3.5 w-3.5" />บันทึก QR</button>{current.paidSatang === 0 && <p className="text-[11px] text-slate-500">กันที่ว่างถึง {dateTime(current.expiresAt)}</p>}</> : <button disabled={busy} className={action} onClick={() => start(current)}>{busy ? 'กำลังเตรียม QR…' : current.paidSatang ? 'ชำระยอดคงเหลือ' : 'ลองสร้าง QR อีกครั้ง'}</button>}
            {!needsSeatSelection(current) && current.status !== 'paid' && current.status !== 'expired' && <div className="mt-5 space-y-3 border-t border-purple-200 pt-4 text-left"><label htmlFor="payment-slip" className="flex items-center gap-2 text-sm font-bold text-purple-900"><Upload className="h-4 w-4" />แนบสลิปหลังโอนเงิน</label><input ref={fileRef} id="payment-slip" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="block w-full min-w-0 text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-purple-100 file:px-3 file:py-2 file:text-purple-700" onChange={event => { setSlip(null); const file = event.target.files?.[0]; if (file && file.size <= 5_000_000 && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setSlip(file); setError(''); } else if (file) { event.target.value = ''; setError('กรุณาใช้รูป JPG, PNG หรือ WebP ไม่เกิน 5 MB'); } }} /><button disabled={!slip || busy || current.amountSatang <= 0} className={`${action} w-full`} onClick={verify}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{busy ? 'กำลังตรวจสอบ…' : 'ตรวจสลิปและยืนยันชำระเงิน'}</button><p className="text-[10px] text-slate-500">หากตรวจสอบไม่สำเร็จ ให้ตรวจรายการเดิมหรือติดต่อแอดมินก่อนโอนซ้ำ</p></div>}
          </div>
        </section>}

        <section><div className="mb-3 flex items-center justify-between"><h2 className="font-black text-purple-950">รายการชำระเงินของฉัน</h2><button disabled={busy} className="text-xs font-bold text-purple-600" onClick={() => { refresh().catch(error => setError(error.message)); }}>รีเฟรช</button></div>{orders.length === 0 ? <p className="rounded-2xl border border-dashed border-purple-200 p-6 text-center text-sm text-slate-500">ยังไม่มีรายการชำระเงิน เลือกจองจากทริปที่เปิดอยู่ได้เลย</p> : <div className="grid gap-3 sm:grid-cols-2">{orders.map(order => <article key={order.id} className="rounded-2xl border border-purple-100 bg-white p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-bold text-purple-950">{order.tripName}</h3><span className="shrink-0 rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700">{order.status === 'paid' ? 'ชำระครบ' : order.status === 'deposit_paid' ? 'ชำระมัดจำแล้ว' : order.status === 'expired' ? 'รอตรวจสอบ' : order.expiresAt <= now ? 'หมดเวลา' : 'รอชำระเงิน'}</span></div><p className="mt-3 text-xs text-slate-500">ชำระแล้ว ฿{money(order.paidSatang)} · คงเหลือ ฿{money(order.totalSatang - order.paidSatang)}</p>{order.paidSatang > 0 && order.paidSatang < order.totalSatang && <p className="mt-2 text-[11px] text-rose-600">ชำระครบก่อน {dateTime(order.balanceDueAt)}</p>}<button disabled={busy} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-purple-700 disabled:opacity-50" onClick={() => { if (order.status === 'expired' || (order.status === 'pending' && order.expiresAt <= now)) { setCurrent(order); setError('รายการหมดเวลาแล้ว หากโอนแล้วให้แนบสลิปหรือติดต่อแอดมิน'); } else void start(order); }}>{needsSeatSelection(order) ? 'เลือกจองที่นั่ง' : order.status === 'deposit_paid' ? 'ชำระยอดคงเหลือ / ดูรายการ' : 'ดูรายการ'}<ArrowRight className="h-3.5 w-3.5" /></button></article>)}</div>}</section>
      </>}
    </main>
    <dialog ref={dialogRef} aria-labelledby="payment-success-title" onClose={() => setSuccess(null)} className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-3xl border-0 bg-white p-7 shadow-2xl backdrop:bg-purple-950/50 backdrop:backdrop-blur-sm">
      {success && <><button aria-label="ปิดหน้าต่าง" onClick={() => dialogRef.current?.close()} className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-purple-50"><X className="h-4 w-4" /></button><CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-500" /><h2 id="payment-success-title" className="text-center text-xl font-black text-purple-950">{needsSeatSelection(success) ? 'ชำระเงินแล้ว ไปเลือกที่นั่งกัน' : 'ตรวจสลิปสำเร็จ'}</h2><p className="my-4 text-center text-sm leading-relaxed text-slate-500">{success.status === 'paid' ? 'ชำระครบเรียบร้อยแล้ว' : `ชำระมัดจำแล้ว ยอดคงเหลือ ฿${money(success.totalSatang - success.paidSatang)} ชำระก่อน ${dateTime(success.balanceDueAt)}`}{!success.bookingId && ' เลือกที่นั่งเพื่อรับตั๋วของคุณได้เลย'}</p><Link className={`${action} w-full`} href={success.bookingId ? '/tickets' : seatSelectionHref(success.tripId)}>{success.bookingId ? 'ดูตั๋วของฉัน' : 'ไปเลือกจองที่นั่ง'}<ArrowRight className="h-4 w-4" /></Link><button className="mt-3 w-full py-2 text-xs font-bold text-purple-600" onClick={() => dialogRef.current?.close()}>กลับไปดูรายการ</button></>}
    </dialog>
  </div>;
}
