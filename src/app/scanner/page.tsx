'use client';

import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Check, X, Clock, UserCheck, ArrowLeft, QrCode, Camera } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ScannerPage() {
  const [scannedData, setScannedData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);

  const fetchBooking = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`);
      const data = await res.json();
      if (data.success) {
        setScannedData(data.booking);
      } else {
        alert('ไม่พบข้อมูลตั๋วนี้ในระบบ');
        setScannerActive(true);
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการตรวจสอบตั๋ว');
      setScannerActive(true);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (detectedCodes: any[]) => {
    if (detectedCodes.length > 0 && scannerActive && !loading) {
      const value = detectedCodes[0].rawValue;
      if (value) {
        setScannerActive(false);
        fetchBooking(value);
      }
    }
  };

  const handleCheckIn = async (id: string, currentStatus: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedIn: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        setScannedData({ ...scannedData, checkedIn: !currentStatus });
      } else {
        alert('อัปเดตไม่สำเร็จ');
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setScannerActive(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-slate-800 leading-tight">สแกนเช็คอิน</h1>
            <p className="text-[11px] text-slate-500">สำหรับสต๊าฟและคนขับ</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto">
        
        {/* Scanner View */}
        {scannerActive && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-black relative aspect-square w-full">
              <Scanner 
                onScan={handleScan}
                formats={['qr_code']}
              />
            </div>
            <div className="p-4 text-center">
              <p className="text-sm font-bold text-slate-700 flex items-center justify-center gap-2">
                <Camera className="w-4 h-4 text-violet-600" />
                กรุณานำกล้องส่องไปที่ QR Code
              </p>
              <p className="text-xs text-slate-500 mt-1">สแกนตั๋วจากหน้าจอมือถือของลูกทริป</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && !scannedData && !scannerActive && (
          <div className="py-12 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-500">กำลังตรวจสอบข้อมูล...</p>
          </div>
        )}

        {/* Scanned Result */}
        {scannedData && !scannerActive && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
            {/* Status Banner */}
            <div className={cn('rounded-2xl p-4 flex items-center gap-3 border shadow-sm mb-4',
              scannedData.status === 'approved'
                ? (scannedData.checkedIn ? 'bg-emerald-50 border-emerald-200' : 'bg-violet-50 border-violet-200')
                : 'bg-amber-50 border-amber-200'
            )}>
              {scannedData.status === 'approved' ? (
                scannedData.checkedIn
                  ? <><UserCheck className="w-8 h-8 text-emerald-600 shrink-0" /><div><div className="font-black text-emerald-700 text-lg">เช็คอินเรียบร้อย</div><div className="text-xs text-emerald-600 font-semibold">ผู้โดยสารขึ้นรถแล้ว</div></div></>
                  : <><Check className="w-8 h-8 text-violet-600 shrink-0" /><div><div className="font-black text-violet-700 text-lg">ตั๋วถูกต้อง</div><div className="text-xs text-violet-600 font-semibold">พร้อมทำการเช็คอินขึ้นรถ</div></div></>
              ) : (
                <><Clock className="w-8 h-8 text-amber-600 shrink-0" /><div><div className="font-black text-amber-700 text-lg">รออนุมัติ</div><div className="text-xs text-amber-600 font-semibold">ตั๋วใบนี้ยังไม่ได้รับการอนุมัติ</div></div></>
              )}
            </div>

            {/* Passenger Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 mb-6">
              <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <img src={scannedData.lineUserProfilePic || 'https://via.placeholder.com/150'} alt="" className="w-16 h-16 rounded-full border-2 border-violet-200 object-cover shadow-sm" />
                <div>
                  <div className="font-black text-slate-800 text-lg">{scannedData.fullName}</div>
                  <div className="text-sm font-semibold text-slate-500">คุณ {scannedData.nickname}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{scannedData.phone}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">เบาะที่นั่ง</span>
                  <span className="text-2xl font-black text-violet-700 font-mono bg-violet-50 px-3 py-1 rounded-lg inline-block border border-violet-100">{scannedData.seatLabel}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">สถานะตั๋ว</span>
                  <span className="text-sm font-bold text-slate-700 block mt-2">{scannedData.checkedIn ? 'เช็คอินแล้ว ✓' : 'ยังไม่ได้เช็คอิน'}</span>
                </div>
              </div>
              
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">หมายเหตุ</span>
                <p className="text-xs text-slate-600 font-medium">{scannedData.note || '-'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {scannedData.status === 'approved' ? (
                <button
                  onClick={() => handleCheckIn(scannedData.id, scannedData.checkedIn)}
                  disabled={loading}
                  className={cn('w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 transition shadow-lg',
                    scannedData.checkedIn
                      ? 'bg-white border-2 border-rose-200 text-rose-600 hover:bg-rose-50'
                      : 'bg-[#4c1d95] hover:bg-violet-800 text-white'
                  )}
                >
                  {loading ? (
                    <span className="animate-pulse">กำลังประมวลผล...</span>
                  ) : scannedData.checkedIn ? (
                    <><X className="w-5 h-5" /> ยกเลิกการเช็คอิน</>
                  ) : (
                    <><Check className="w-5 h-5" /> ยืนยันให้ผู้โดยสารขึ้นรถ</>
                  )}
                </button>
              ) : null}

              <button
                onClick={resetScanner}
                disabled={loading}
                className="w-full py-4 rounded-xl font-bold text-sm text-slate-600 bg-slate-200 hover:bg-slate-300 transition flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" /> สแกนตั๋วใบต่อไป
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
