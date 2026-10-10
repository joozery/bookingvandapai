import { Clock, X } from 'lucide-react';
import { formatThaiDate } from '@/lib/dateFormat';

interface BookingHistoryItem {
  id: string;
  tripName?: string;
  status?: string;
  seatLabel?: string;
  seatId?: string;
  departureDate?: string;
  departureTime?: string;
  cost?: number;
}

interface BookingHistoryModalProps {
  open: boolean;
  bookings: BookingHistoryItem[];
  onClose: () => void;
}

export default function BookingHistoryModal({ open, bookings, onClose }: BookingHistoryModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-700" />
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2"><Clock className="w-4.5 h-4.5 text-brand-700" /><span>ประวัติการจองทริปทั้งหมด</span></h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition"><X className="w-4.5 h-4.5" /></button>
        </div>
        <div className="max-h-[360px] overflow-y-auto pr-1 space-y-3.5 scrollbar-thin">
          {bookings.length === 0 ? <p className="text-xs text-slate-400 text-center py-6">ยังไม่เคยมีประวัติการจองทริป</p> : bookings.map(booking => (
            <div key={booking.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 leading-tight">ทริปที่จอง: {booking.tripName || 'ไม่ระบุชื่อทริป'}</span>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border ${booking.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : booking.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : booking.status === 'cancel_pending' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {booking.status === 'approved' ? 'อนุมัติแล้ว' : booking.status === 'cancel_pending' ? 'รออนุมัติยกเลิก' : booking.status === 'pending' ? 'รออนุมัติ' : 'ยกเลิก'}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 font-semibold"><span>เบาะ: {booking.seatLabel || booking.seatId}</span><span>วันที่ออกเดินทาง: {formatThaiDate(booking.departureDate)} เวลา {booking.departureTime || ''} น.</span></div>
              <div className="border-t border-slate-200/50 pt-2 flex items-center justify-between text-[10px] font-black text-brand-700"><span>ราคาทริป</span><span>฿{booking.cost?.toLocaleString('th-TH') || '0'}</span></div>
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-slate-100 pt-3 flex justify-end"><button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl transition">ปิดหน้าต่าง</button></div>
      </div>
    </div>
  );
}
