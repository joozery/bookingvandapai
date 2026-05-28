"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DigitalTicket from '@/components/DigitalTicket';
import { Armchair, Download, RefreshCw, ChevronLeft, User } from 'lucide-react';
import Link from 'next/link';
import { toPng } from 'html-to-image';

export default function TicketsPage() {
  const { data: session } = useSession();
  const [lineUser, setLineUser] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingTicketId, setDownloadingTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      setLineUser({
        userId: (session.user as any).id || session.user.email || '',
      });
    } else if (session === null) {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (lineUser?.userId) {
      fetchBookings();
    }
  }, [lineUser]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/bookings?lineUserId=${lineUser.userId}`);
      const data = await res.json();
      if (data.success) {
        const fullBookings = await Promise.all(
          data.bookings.map(async (b: any) => {
            try {
              const ticketRes = await fetch(`/api/bookings/${b.id}`);
              const ticketData = await ticketRes.json();
              return ticketData.success ? ticketData.booking : b;
            } catch (e) {
              return b;
            }
          })
        );
        fullBookings.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBookings(fullBookings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (ticketId: string, seatLabel: string) => {
    const ele = document.getElementById(`ticket-${ticketId}`);
    if (!ele) return;
    
    setDownloadingTicketId(ticketId);
    try {
      const dataUrl = await toPng(ele, {
        backgroundColor: '#ffffff',
        pixelRatio: 4
      });
      const filename = `BookingTicket-Seat${seatLabel || 'X'}.png`;

      if (navigator.share) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], filename, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'บัตรโดยสาร' });
            setDownloadingTicketId(null);
            return;
          }
        } catch (e) {}
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingTicketId(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[#4c1d95] bg-[#f8fafc]">กำลังโหลดข้อมูลตั๋ว...</div>;
  }

  if (!lineUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-600 bg-[#f8fafc] px-4 text-center">
        <Armchair className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold mb-2">กรุณาเข้าสู่ระบบก่อน</h2>
        <p className="text-sm text-slate-500 mb-6">คุณต้องเข้าสู่ระบบผ่านหน้าแรกเพื่อดูตั๋วของคุณ</p>
        <Link href="/" className="px-6 py-3 bg-[#4c1d95] text-white rounded-xl font-bold">
          ไปที่หน้าแรก
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-4 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-1 text-slate-500 hover:text-[#4c1d95] transition">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-bold">กลับ</span>
        </Link>
        <h1 className="text-base font-black text-[#2E1A47] tracking-tight uppercase flex items-center gap-2">
          <Armchair className="w-4.5 h-4.5 text-[#8B5CF6]" />
          ตั๋วของฉัน
        </h1>
        <div className="w-8"></div> {/* Spacer for centering */}
      </header>

      <main className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 mt-2">
        {bookings.length === 0 ? (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center flex flex-col items-center mt-8">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Armchair className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500">ยังไม่มีตั๋วโดยสารในระบบ</p>
            <Link href="/" className="mt-5 text-xs font-bold text-white bg-[#4c1d95] hover:bg-[#5b21b6] px-5 py-3 rounded-xl transition shadow-sm inline-block">
              ไปค้นหาทริปและจองตั๋วเลย
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {bookings.map((b) => (
              <div key={b.id} className="flex flex-col items-center bg-white p-3 sm:p-5 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
                <DigitalTicket booking={b as any} htmlId={`ticket-${b.id}`} />
                
                <div className="w-full mt-3 sm:mt-5 flex flex-col gap-2">
                  <button
                    onClick={() => handleDownload(b.id, b.seatLabel)}
                    disabled={downloadingTicketId === b.id}
                    className="w-full py-2 sm:py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[10px] sm:text-[12px] font-bold transition duration-200 flex items-center justify-center gap-1 sm:gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {downloadingTicketId === b.id ? (
                      <>
                        <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                        <span className="truncate">รอสักครู่...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                        <span className="truncate">บันทึกรูป</span>
                      </>
                    )}
                  </button>
                  <Link
                    href={`/?tripId=${b.tripId}&step=5`}
                    className="w-full py-2 sm:py-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#4c1d95] text-[10px] sm:text-[12px] font-bold transition duration-200 shadow-sm text-center flex items-center justify-center truncate px-1"
                  >
                    จัดการตั๋ว
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-2 px-6 flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
        {/* Tab 1: สำรวจ */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 transition-colors duration-200 text-slate-400 hover:text-slate-600`}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
          </div>
          <span className="text-[9.5px] font-bold">สำรวจ</span>
        </Link>

        {/* Tab 2: ตั๋วของฉัน */}
        <button
          className={`flex flex-col items-center gap-0.5 transition-colors duration-200 text-[#4c1d95]`}
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            <Armchair className="w-5 h-5" />
          </div>
          <span className="text-[9.5px] font-bold">ตั๋วของฉัน</span>
          <span className="w-1 h-1 bg-[#4c1d95] rounded-full mt-0.5" />
        </button>

        {/* Tab 3: โปรไฟล์ */}
        <Link
          href="/?tab=profile"
          className={`flex flex-col items-center gap-0.5 transition-colors duration-200 text-slate-400 hover:text-slate-600`}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <span className="text-[9.5px] font-bold">โปรไฟล์</span>
        </Link>
      </div>
    </div>
  );
}
