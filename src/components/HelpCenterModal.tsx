import { MessageSquare, X } from 'lucide-react';

interface HelpCenterModalProps {
  open: boolean;
  messengerUrl: string;
  onClose: () => void;
}

export default function HelpCenterModal({ open, messengerUrl, onClose }: HelpCenterModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-slate-800">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-700" />
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2"><MessageSquare className="w-4.5 h-4.5 text-brand-700" /><span>ศูนย์ช่วยเหลือ & ติดต่อแอดมิน</span></h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition"><X className="w-4.5 h-4.5" /></button>
        </div>
        <div className="space-y-4 text-xs leading-relaxed text-slate-600">
          <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3">
            <h4 className="font-bold text-brand-700 mb-1">ต้องการยกเลิกหรือขอเปลี่ยนเบาะที่นั่ง?</h4>
            <p className="text-[11px] text-slate-500 leading-normal">ลูกค้าสามารถส่งคำขอย้ายเบาะได้จากแผนผังรถตู้ ระบบจะส่งเรื่องให้แอดมินอนุมัติทันที</p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-slate-700">ช่องทางการติดต่อแอดมิน</h4>
            <p className="text-[11px]">หากมีข้อสงสัยเกี่ยวกับทริป การประกันเดินทาง หรือการจอง สามารถติดต่อแอดมินผ่าน Messenger ได้ครับ</p>
            <a href={messengerUrl} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition theme-action"><MessageSquare className="w-4.5 h-4.5" /><span>ติดต่อแอดมินผ่าน Messenger</span></a>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-3 flex justify-end"><button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-2.5 rounded-xl transition">ปิดหน้าต่าง</button></div>
      </div>
    </div>
  );
}
