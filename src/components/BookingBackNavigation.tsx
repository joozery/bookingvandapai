import { ChevronRight } from 'lucide-react';

interface BookingBackNavigationProps {
  currentStep: number;
  tripName?: string;
  vanNumber?: number;
  seatLabel?: string;
  onBack: () => void;
}

export default function BookingBackNavigation({ currentStep, tripName, vanNumber, seatLabel, onBack }: BookingBackNavigationProps) {
  if (currentStep <= 1) return null;
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-700 transition px-3 py-1.5 rounded-lg hover:bg-purple-50 border border-slate-200 bg-white shadow-sm"><ChevronRight className="w-3.5 h-3.5 rotate-180" /><span>ย้อนกลับ</span></button>
      <span className="text-[11px] text-slate-400 font-semibold">
        {currentStep === 2 && tripName && `ทริป: ${tripName}`}
        {currentStep === 3 && vanNumber && `รถตู้คันที่ ${vanNumber}`}
        {currentStep === 4 && seatLabel && `เบาะที่ ${seatLabel}`}
      </span>
    </div>
  );
}
