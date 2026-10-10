import { User } from 'lucide-react';

export default function LoginPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 py-12 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white max-w-sm w-full rounded-3xl shadow-xl border border-slate-200 p-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><User className="w-8 h-8 text-slate-300" /></div>
        <h2 className="text-lg font-black text-slate-800 mb-2">เข้าสู่ระบบเพื่อดำเนินการต่อ</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">กรุณาเข้าสู่ระบบด้วย LINE เพื่อทำการจองที่นั่งและดูข้อมูลตั๋วของคุณ</p>
        <button onClick={onLogin} className="w-full bg-line hover:bg-line-hover text-white py-3.5 px-4 rounded-xl font-black text-xs transition-all duration-300 shadow-md shadow-line/20 flex items-center justify-center gap-2 active:scale-95">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0"><path d="M24 10.3c0-4.7-4.8-8.5-10.7-8.5S2.7 5.6 2.7 10.3c0 4.2 3.8 7.7 8.9 8.4.3.1.8.2.9.5.1.2 0 .6-.1.8l-.4 2.6c0 .3-.2 1.1 1 0l7.2-7.2h.1c2.7-1.1 3.9-3.1 3.9-5.1z" /></svg>
          <span>เข้าสู่ระบบด้วย LINE</span>
        </button>
      </div>
    </div>
  );
}
