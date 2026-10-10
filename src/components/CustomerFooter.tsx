export default function CustomerFooter() {
  return (
    <footer className="theme-deep border-t border-slate-200 bg-white py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center text-[10px] sm:text-xs text-purple-200 font-bold space-y-1">
        <p>© {new Date().getFullYear()} ด่าไป เดินไป. All rights reserved.</p>
        <div className="flex justify-center items-center gap-1.5 text-slate-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] text-purple-200">ระบบซิงค์ข้อมูลเบาะรถตู้แบบเรียลไทม์ความเสถียรสูง</span></div>
      </div>
    </footer>
  );
}
