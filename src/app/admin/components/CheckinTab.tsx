'use client';

import React, { useState } from 'react';
import { QrCode, Check, X, Clock, UserCheck, ArrowRight, ScanLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Trip, Booking } from './types';

interface Props {
  trips: Trip[];
  bookings: Booking[];
  onCheckIn: (id: string, current: boolean) => Promise<void>;
}

export default function CheckinTab({ trips, bookings, onCheckIn }: Props) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualId, setManualId] = useState('');
  const [scanned, setScanned] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const waitingList = bookings.filter(b => b.status === 'approved' && !b.checkedIn);

  const handleScan = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`);
      const data = await res.json();
      if (data.success) { setScanned(data.booking); setScannerOpen(false); setManualId(''); }
      else { alert('ไม่พบตั๋วนี้ในระบบ'); }
    } catch { alert('ข้อผิดพลาดในการสแกน'); }
    finally { setLoading(false); }
  };

  const handleCheckIn = async (id: string, current: boolean) => {
    await onCheckIn(id, current);
    if (scanned?.id === id) setScanned({ ...scanned, checkedIn: !current, checkedInAt: !current ? new Date().toISOString() : null });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ===== Scanner Panel ===== */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center">
              <ScanLine className="w-3.5 h-3.5 text-white" />
            </div>
            QR Scanner Console
          </CardTitle>
          <CardDescription className="text-xs">สแกนตั๋ว QR Code เพื่อยืนยันการขึ้นรถ</CardDescription>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Toggle scanner */}
          <button
            onClick={() => setScannerOpen(!scannerOpen)}
            className={cn('w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition',
              scannerOpen
                ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100'
                : 'bg-violet-600 hover:bg-violet-700 text-white shadow-md'
            )}
          >
            {scannerOpen ? <><X className="w-4 h-4" /> ปิด Scanner</> : <><QrCode className="w-4 h-4" /> เปิด Scanner</>}
          </button>

          {scannerOpen && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Fake scanner viewfinder */}
              <div className="bg-slate-900 rounded-xl p-6 text-center relative overflow-hidden">
                <div className="w-32 h-32 border-2 border-violet-500 rounded-xl mx-auto relative flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-slate-600" />
                  <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-violet-400 rounded-tl-sm" />
                  <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-violet-400 rounded-tr-sm" />
                  <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-violet-400 rounded-bl-sm" />
                  <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-violet-400 rounded-br-sm" />
                </div>
                <p className="text-slate-400 text-xs mt-3 font-semibold">กำลังรอสแกน QR Code...</p>
              </div>
              {/* Manual ID input */}
              <div className="flex gap-2">
                <Input
                  value={manualId}
                  onChange={e => setManualId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScan(manualId)}
                  placeholder="พิมพ์ Booking ID..."
                  className="h-9 text-xs flex-1 font-mono"
                />
                <Button size="sm" onClick={() => handleScan(manualId)} disabled={loading} className="h-9 text-xs bg-violet-600 hover:bg-violet-700 text-white px-3">
                  สแกน
                </Button>
              </div>
            </div>
          )}

          {/* Waiting list */}
          {waitingList.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                รายการรอเช็คอิน ({waitingList.length})
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {waitingList.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleScan(b.id)}
                    className="w-full flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50/50 transition text-left group"
                  >
                    <img src={b.lineUserProfilePic} alt="" className="w-7 h-7 rounded-full border border-slate-100 object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-700 truncate">{b.fullName} ({b.nickname})</div>
                      <div className="text-[9px] text-slate-400 truncate">{b.tripName} · เบาะ {b.seatLabel}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500 transition shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Boarding HUD ===== */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5 text-white" />
            </div>
            Boarding Console
          </CardTitle>
          <CardDescription className="text-xs">ผลการตรวจสอบตั๋ว</CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          {scanned ? (
            <div className="space-y-4">
              {/* Status banner */}
              <div className={cn('rounded-xl p-3 flex items-center gap-2 border',
                scanned.status === 'approved'
                  ? (scanned.checkedIn ? 'bg-emerald-50 border-emerald-200' : 'bg-violet-50 border-violet-200')
                  : 'bg-amber-50 border-amber-200'
              )}>
                {scanned.status === 'approved' ? (
                  scanned.checkedIn
                    ? <><UserCheck className="w-5 h-5 text-emerald-600 shrink-0" /><span className="font-bold text-emerald-700 text-sm">ขึ้นรถแล้ว</span></>
                    : <><Check className="w-5 h-5 text-violet-600 shrink-0" /><span className="font-bold text-violet-700 text-sm">ตั๋วถูกต้อง · อนุมัติแล้ว</span></>
                ) : (
                  <><Clock className="w-5 h-5 text-amber-600 shrink-0" /><span className="font-bold text-amber-700 text-sm">รออนุมัติ — ยังขึ้นรถไม่ได้</span></>
                )}
              </div>

              {/* Passenger info */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <img src={scanned.lineUserProfilePic} alt="" className="w-12 h-12 rounded-full border-2 border-violet-200 object-cover" />
                  <div>
                    <div className="font-bold text-slate-800">{scanned.fullName}</div>
                    <div className="text-xs text-slate-500">({scanned.nickname}) · {scanned.phone}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'ทริป', value: scanned.tripName || trips.find(t => t.id === scanned.tripId)?.name || '?' },
                    { label: 'เบาะที่นั่ง', value: `เบาะ ${scanned.seatLabel}`, big: true },
                    { label: 'หมายเหตุ', value: scanned.note || '-' },
                    { label: 'สถานะ', value: scanned.checkedIn ? 'เช็คอินแล้ว ✓' : 'ยังไม่ได้เช็คอิน' },
                  ].map(item => (
                    <div key={item.label}>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{item.label}</span>
                      <span className={cn('font-bold', item.big ? 'text-violet-700 text-xl font-black font-mono' : 'text-slate-700 text-xs')}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action button */}
              {scanned.status === 'approved' ? (
                <button
                  onClick={() => handleCheckIn(scanned.id, scanned.checkedIn)}
                  className={cn('w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition',
                    scanned.checkedIn
                      ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'
                  )}
                >
                  {scanned.checkedIn
                    ? <><X className="w-4 h-4" /> ยกเลิกเช็คอิน</>
                    : <><Check className="w-4 h-4" /> ยืนยันขึ้นรถ</>
                  }
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" /> ตั๋วยังไม่ได้รับอนุมัติ
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <QrCode className="w-16 h-16 mb-3" />
              <p className="text-sm font-semibold text-slate-400">ยังไม่มีการสแกนตั๋ว</p>
              <p className="text-xs text-slate-300 mt-1">เปิด Scanner และสแกน QR Code</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
