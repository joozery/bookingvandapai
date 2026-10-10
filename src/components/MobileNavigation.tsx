import Link from 'next/link';
import { Armchair, Check, Compass, User } from 'lucide-react';

type MobileTab = 'explore' | 'completed' | 'tickets' | 'profile';

interface MobileNavigationProps {
  activeTab: MobileTab;
  hasBooking: boolean;
  onTabChange: (tab: MobileTab) => void;
}

export default function MobileNavigation({ activeTab, hasBooking, onTabChange }: MobileNavigationProps) {
  const itemClass = (tab: MobileTab) => `flex flex-col items-center gap-0.5 transition-colors duration-200 ${activeTab === tab ? 'text-brand-700' : 'text-slate-400 hover:text-slate-600'}`;
  return (
    <div className="2xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 py-2 px-2 grid grid-cols-4 items-center shadow-lg">
      <button onClick={() => onTabChange('explore')} className={itemClass('explore')}>
        <Compass className="w-5 h-5" />
        <span className="text-[9.5px] font-bold">ทริปที่เปิดอยู่</span>
        {activeTab === 'explore' && <span className="w-1 h-1 bg-brand-700 rounded-full mt-0.5" />}
      </button>
      <button type="button" onClick={() => onTabChange('completed')} aria-pressed={activeTab === 'completed'} className={itemClass('completed')}>
        <Check className="w-5 h-5" />
        <span className="text-[9.5px] font-bold whitespace-nowrap">ทริปที่จบไปแล้ว</span>
        {activeTab === 'completed' && <span className="w-1 h-1 bg-brand-700 rounded-full mt-0.5" />}
      </button>
      <Link href="/tickets" className="flex flex-col items-center gap-0.5 transition-colors duration-200 text-slate-400 hover:text-slate-600">
        <div className="relative">
          <Armchair className="w-5 h-5" />
          {hasBooking && <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white" />}
        </div>
        <span className="text-[9.5px] font-bold">ตั๋วของฉัน</span>
      </Link>
      <button onClick={() => onTabChange('profile')} className={itemClass('profile')}>
        <User className="w-5 h-5" />
        <span className="text-[9.5px] font-bold">โปรไฟล์</span>
        {activeTab === 'profile' && <span className="w-1 h-1 bg-brand-700 rounded-full mt-0.5" />}
      </button>
    </div>
  );
}
