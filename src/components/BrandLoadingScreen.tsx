export default function BrandLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#1e0a38] via-[#120524] to-[#0c0218] text-white select-none">
      <div className="absolute h-[500px] w-[500px] rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-600 opacity-70 blur-[130px] animate-pulse pointer-events-none" />
      <div className="absolute h-[550px] w-[550px] rounded-full bg-gradient-to-r from-indigo-700 via-purple-700 to-violet-900 opacity-60 blur-[150px] animate-pulse [animation-delay:0.7s] pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center space-y-7 px-4 text-center">
        <div className="relative flex items-center justify-center p-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500/50 via-purple-500/50 to-cyan-400/50 blur-3xl animate-ping [animation-duration:1.8s]" />
          <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 via-cyan-400 via-emerald-400 via-yellow-400 to-pink-500 p-[3px] opacity-100 blur-[3px] shadow-[0_0_30px_#ec4899] animate-[spin_2.5s_linear_infinite]"><div className="h-full w-full rounded-full bg-[#130629]/95" /></div>
          <div className="absolute -inset-4 rounded-full border-2 border-dashed border-cyan-400 drop-shadow-[0_0_15px_#06b6d4] animate-[spin_1.8s_linear_infinite]" />
          <div className="absolute -inset-1.5 rounded-full border-2 border-pink-500 border-t-yellow-300 border-l-transparent drop-shadow-[0_0_20px_#ec4899] animate-[spin_0.9s_linear_infinite_reverse]" />
          <img src="/logo/logov2.webp" alt="DAPAIDERNPAI Logo" className="relative z-10 h-24 w-24 object-contain brightness-125 drop-shadow-[0_0_35px_rgba(236,72,153,0.9)] sm:h-28 sm:w-28" />
        </div>
        <div className="flex flex-col items-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-[0_0_20px_rgba(217,70,239,0.9)] sm:text-4xl">ด่าไป เดินไป</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] sm:text-xs">DAPAI DERNPAI VAN BOOKING</p>
        </div>
      </div>
    </div>
  );
}
