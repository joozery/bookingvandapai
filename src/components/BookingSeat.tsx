interface BookingSeatProps {
  seat: {
    id: string;
    label: string;
    status: 'available' | 'pending' | 'booked' | 'blocked';
    passengerName?: string;
    row: number;
  };
  fitCell: boolean;
  selected: boolean;
  onClick: () => void;
}

export default function BookingSeat({ seat, fitCell, selected, onClick }: BookingSeatProps) {
  let containerStyle = '';
  let headrestStyle = '';
  let cushionStyle = '';
  if (seat.status === 'available') {
    if (selected) {
      containerStyle = 'bg-purple-400 border-purple-900 border-b-[4px] text-white shadow-purple-900/40 ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900 scale-105';
      headrestStyle = 'bg-purple-200';
      cushionStyle = 'bg-purple-600';
    } else {
      containerStyle = 'bg-green-500 border-green-600 border-b-[4px] text-white hover:bg-green-600 shadow-emerald-950/30';
      headrestStyle = 'bg-green-300';
      cushionStyle = 'bg-green-700';
    }
  } else if (seat.status === 'blocked') {
    containerStyle = 'bg-red-600 border-red-800 border-b-[4px] text-white cursor-not-allowed';
    headrestStyle = 'bg-red-300';
    cushionStyle = 'bg-red-700';
  } else if (seat.status === 'pending') {
    containerStyle = 'bg-amber-400 border-amber-700 border-b-[4px] text-amber-950 cursor-not-allowed shadow-amber-950/20';
    headrestStyle = 'bg-yellow-300';
    cushionStyle = 'bg-amber-600';
  } else {
    containerStyle = 'bg-purple-800 border-brand-700 border-b-[4px] text-purple-100 cursor-not-allowed shadow-none';
    headrestStyle = 'bg-purple-300/45';
    cushionStyle = 'bg-purple-900';
  }
  return (
    <button onClick={onClick} disabled={seat.status !== 'available'} className={`relative ${fitCell ? 'w-full min-w-0' : 'w-[58px]'} h-[64px] rounded-[14px] flex flex-col justify-between p-1.5 transition-all duration-300 shadow-md select-none hover:scale-105 active:scale-95 border ${containerStyle}`}>
      <div className={`w-[32px] max-w-full h-[10px] rounded-[4px] mx-auto transition-all duration-300 ${headrestStyle}`} />
      <div className={`flex-1 w-full rounded-[8px] mt-1 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 ${cushionStyle}`}>
        <span className="text-[11px] font-black tracking-tight leading-none scale-100">{seat.label}</span>
        {seat.status === 'blocked' && <span className="text-[8px] mt-1">ปิดรับจอง</span>}
        {seat.passengerName && <span className="text-[8.5px] font-black tracking-tight leading-none mt-0.5 max-w-[50px] truncate opacity-95 block bg-black/25 px-1 py-0.5 rounded text-white">{seat.passengerName.split(' ')[0]}</span>}
      </div>
    </button>
  );
}
