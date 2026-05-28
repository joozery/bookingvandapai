'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard, Compass, Bus, Users, QrCode, Settings,
  ChevronDown, ChevronRight, RefreshCw, Shield, FileText,
  TrendingUp, Download, Check, X, Search, Filter,
  Phone, Edit2, Trash2, MoreHorizontal, BadgeCheck, Clock,
  AlertTriangle, ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Trip, Van, Booking } from './types';

interface Props {
  trips: Trip[];
  vans: Van[];
  bookings: Booking[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCheckIn: (id: string, current: boolean) => Promise<void>;
  onManualSubmit: (data: { tripId: string; vanId: string; seatId: string; nickname: string; fullName: string; phone: string; note: string }) => Promise<void>;
}

export default function BookingsTab({ trips, vans, bookings, onApprove, onReject, onDelete, onCheckIn, onManualSubmit }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [tripFilter, setTripFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [tripSel, setTripSel] = useState('');
  const [vanSel, setVanSel] = useState('');
  const [seatSel, setSeatSel] = useState('');
  const [form, setForm] = useState({ nickname: '', fullName: '', phone: '', note: '' });

  const filtered = bookings.filter(b => {
    const matchTrip   = tripFilter === 'all' || b.tripId === tripFilter;
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const q = search.toLowerCase();
    return matchTrip && matchStatus && (
      b.fullName.toLowerCase().includes(q) || b.nickname.toLowerCase().includes(q) ||
      b.phone.includes(q) || b.seatLabel.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripSel || !vanSel || !seatSel) { alert('กรุณาเลือกทริป รถ และที่นั่ง'); return; }
    if (!form.nickname || !form.fullName || !form.phone) { alert('กรุณากรอกข้อมูลลูกทริปให้ครบ'); return; }
    await onManualSubmit({ tripId: tripSel, vanId: vanSel, seatId: seatSel, ...form });
    setShowForm(false);
    setForm({ nickname: '', fullName: '', phone: '', note: '' });
    setTripSel(''); setVanSel(''); setSeatSel('');
  };

  const statusBadge = (status: string) => {
    if (status === 'approved') return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />ยืนยันแล้ว</span>;
    if (status === 'pending')  return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />รออนุมัติ</span>;
    if (status === 'cancel_pending') return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-pulse" />ขอยกเลิก</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200"><span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />ยกเลิก</span>;
  };

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600" />
            การจองและผู้โดยสารทั้งหมด
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">ดูข้อมูลผู้โดยสาร จัดการการจอง และตรวจสอบสถานะ</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(!showForm); if (trips.length > 0) setTripSel(trips[0].id); }} className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8 gap-1.5 shadow-sm">
          <span className="text-base leading-none">+</span> เพิ่มผู้โดยสารใหม่
        </Button>
      </div>

      {/* Manual Form */}
      {showForm && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-bold text-violet-800 mb-4">เพิ่มผู้โดยสารด้วยตนเอง</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">ทริป</label>
              <select value={tripSel} onChange={e => { setTripSel(e.target.value); setVanSel(''); setSeatSel(''); }} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-400">
                <option value="">เลือกทริป</option>
                {trips.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">รถตู้</label>
              <select value={vanSel} onChange={e => { setVanSel(e.target.value); setSeatSel(''); }} disabled={!tripSel} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-400 disabled:opacity-50">
                <option value="">เลือกรถ</option>
                {vans.filter(v => v.tripId === tripSel).map(v => <option key={v.id} value={v.id}>คันที่ {v.vanNumber}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">เบาะว่าง</label>
              <select value={seatSel} onChange={e => setSeatSel(e.target.value)} disabled={!vanSel} className="w-full border border-slate-200 bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-400 disabled:opacity-50">
                <option value="">เลือกเบาะ</option>
                {vanSel && vans.find(v => v.id === vanSel)?.seats.filter(s => s.type === 'customer' && s.status === 'available').map(s => <option key={s.id} value={s.id}>เบาะ {s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">ชื่อเล่น</label>
              <Input required value={form.nickname} onChange={e => setForm({...form, nickname: e.target.value})} placeholder="เช่น นัท" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">ชื่อ-นามสกุล</label>
              <Input required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="นาย สมชาย..." className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">เบอร์โทร</label>
              <Input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="089-xxx-xxxx" className="h-8 text-xs" />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[10px] font-bold text-slate-500 block mb-1">หมายเหตุ</label>
              <Input value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="เช่น อาหารเจ, แพ้ยา..." className="h-8 text-xs" />
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2 pt-2 border-t border-violet-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8 text-xs">ยกเลิก</Button>
              <Button type="submit" size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"><Check className="w-3 h-3" />บันทึกและอนุมัติ</Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={tripFilter} onChange={e => setTripFilter(e.target.value)} className="h-8 border border-slate-200 bg-white rounded-lg px-3 text-xs focus:outline-none focus:border-violet-400 min-w-[110px]">
          <option value="all">ทุกทริป</option>
          {trips.map(t => <option key={t.id} value={t.id}>{t.name.substring(0, 20)}...</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา ชื่อ เบอร์โทร เลขที่นั่ง..." className="pl-8 h-8 text-xs" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-8 border border-slate-200 bg-white rounded-lg px-3 text-xs focus:outline-none focus:border-violet-400">
          <option value="all">สถานะทั้งหมด</option>
          <option value="approved">ยืนยันแล้ว</option>
          <option value="pending">รออนุมัติ</option>
          <option value="cancel_pending">ขอยกเลิก</option>
          <option value="rejected">ยกเลิก</option>
        </select>
        <button className="h-8 border border-slate-200 bg-white px-3 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition">
          <Download className="w-3.5 h-3.5" /> ส่งออก
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['ผู้โดยสาร', 'ทริป', 'รถ / เบาะที่นั่ง', 'เบอร์โทร', 'สถานะการจอง', 'การชำระเงิน', 'Check-in', 'จัดการ'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                  <p className="font-semibold text-sm">ไม่พบรายการจอง</p>
                </td></tr>
              ) : filtered.map(b => {
                const isChange = !!(b as any).replacesBookingId;

                // Find the original booking (the one being replaced)
                const originalBooking = isChange
                  ? bookings.find(x => x.id === (b as any).replacesBookingId)
                  : null;

                // Check if the target seat (b.seatId) is already 'booked' by another approved booking
                const targetSeatAlreadyBooked = isChange && vans.some(v =>
                  v.seats.some(s => s.id === b.seatId && s.status === 'booked' &&
                    // Make sure it's not booked by this pending request itself
                    bookings.some(bk => bk.id !== b.id && bk.seatId === s.id && bk.status === 'approved')
                  )
                );

                return (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Passenger */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={b.lineUserProfilePic} alt="" className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate max-w-[140px]">{b.fullName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="truncate max-w-[100px]">ชื่อเล่น: {b.nickname}</span>
                            {isChange && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 shrink-0">
                                <RefreshCw className="w-2.5 h-2.5" />
                                ย้ายที่นั่ง
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Trip */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-700 max-w-[160px] truncate text-[11px]" title={b.tripName}>{b.tripName}</div>
                      <div className="text-[10px] text-slate-400">{trips.find(t=>t.id===b.tripId)?.departureDate || ''}{trips.find(t=>t.id===b.tripId)?.durationDays ? ` (${trips.find(t=>t.id===b.tripId)?.durationDays} วัน)` : ''}</div>
                    </td>
                    {/* Van / Seat */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isChange && originalBooking ? (
                        <div className="space-y-1">
                          {/* From seat (original) */}
                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              <Bus className="w-2.5 h-2.5" /> คันที่ {b.vanNumber}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-400">จาก</span>
                            <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-mono line-through">
                              {originalBooking.seatLabel}
                            </span>
                            <ArrowRight className="w-3 h-3 text-amber-400" />
                            <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-mono">
                              {b.seatLabel}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            <Bus className="w-2.5 h-2.5" /> คันที่ {b.vanNumber}
                          </span>
                          <span className="inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-mono">
                            {b.seatLabel}
                          </span>
                        </div>
                      )}
                    </td>
                    {/* Phone */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <a href={`tel:${b.phone}`} className="font-mono text-[11px] text-slate-600 hover:text-violet-600 transition flex items-center gap-1">
                        <Phone className="w-3 h-3" />{b.phone}
                      </a>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-0.5">
                        {statusBadge(b.status)}
                        <div className="text-[9px] text-slate-400">
                          {new Date(b.createdAt).toLocaleDateString('th-TH', {day:'numeric',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </div>
                    </td>
                    {/* Payment placeholder */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {b.status === 'approved'
                        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><BadgeCheck className="w-3 h-3" />ชำระแล้ว</span>
                        : <span className="text-[10px] text-slate-400 font-semibold">รอชำระ</span>}
                    </td>
                    {/* Checkin */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {b.status === 'approved' ? (
                        <div>
                          <button onClick={() => onCheckIn(b.id, b.checkedIn)}
                            className={cn('flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition',
                              b.checkedIn ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100')}>
                            {b.checkedIn ? <><Check className="w-3 h-3" />เช็คแล้ว</> : 'ยังไม่เช็ค'}
                          </button>
                          {b.checkedInAt && <div className="text-[9px] text-slate-400 mt-0.5">{new Date(b.checkedInAt).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>}
                        </div>
                      ) : <span className="text-[10px] text-slate-300">-</span>}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {/* Warning when target seat is already booked */}
                        {isChange && targetSeatAlreadyBooked && (
                          <div className="flex items-start gap-1 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1.5 mb-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                            <p className="text-[9px] font-bold text-rose-700 leading-tight">ที่นั่งเป้าหมายถูกจองแล้ว ไม่สามารถอนุมัติได้</p>
                          </div>
                        )}
                        <div className="flex items-center gap-1 flex-wrap">
                          {b.status === 'cancel_pending' && (
                            <>
                              <button
                                onClick={() => onDelete(b.id)}
                                title="อนุมัติการยกเลิก"
                                className="w-auto px-2 h-7 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition shadow-sm font-bold text-[9px]"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" /> ยืนยันยกเลิก
                              </button>
                              <button
                                onClick={() => onApprove(b.id)}
                                title="ไม่อนุมัติการยกเลิก (กลับเป็นจองปกติ)"
                                className="w-auto px-2 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 flex items-center justify-center transition font-bold text-[9px]"
                              >
                                <X className="w-3.5 h-3.5 mr-1" /> ปฏิเสธ
                              </button>
                            </>
                          )}
                          {b.status === 'pending' && (
                            <button
                              onClick={() => onApprove(b.id)}
                              title="อนุมัติ"
                              disabled={isChange && targetSeatAlreadyBooked}
                              className="w-7 h-7 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {b.status === 'pending' && (
                            <button onClick={() => onReject(b.id)} title="ปฏิเสธ"
                              className="w-7 h-7 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button title="แก้ไข"
                            className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-violet-50 hover:border-violet-200 text-slate-400 hover:text-violet-600 flex items-center justify-center transition">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {b.status !== 'cancel_pending' && (
                            <button onClick={() => onDelete(b.id)} title="ลบ"
                              className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-500 flex items-center justify-center transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>แสดง {filtered.length} จาก {bookings.length} รายการ</span>
          <div className="flex items-center gap-2">
            <select className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white">
              <option>แสดงหน้าละ 10</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
