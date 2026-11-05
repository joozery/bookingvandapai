import Image from "next/image";
import { Wrench, Clock, MessageCircle } from "lucide-react";

export default function MaintenanceScreen() {
  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50 to-emerald-50 px-4 py-12">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-purple-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl" />

      <div className="relative w-full max-w-lg rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-xl shadow-purple-900/5 backdrop-blur-md sm:p-10">
        <Image
          src="/logo/logo-png.webp"
          alt="ด่าไป เดินไป"
          width={96}
          height={96}
          priority
          className="mx-auto mb-6 h-24 w-24 rounded-2xl object-contain"
        />

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-600">
          <Wrench className="h-7 w-7 animate-[spin_3s_linear_infinite]" />
        </div>

        <p className="mb-2 text-sm font-semibold tracking-widest text-purple-500">
          404 · UNDER MAINTENANCE
        </p>
        <h1 className="mb-3 text-2xl font-bold text-slate-800 sm:text-3xl">
          กำลังปรับปรุงระบบ
        </h1>
        <p className="mb-8 leading-relaxed text-slate-600">
          ขออภัยในความไม่สะดวก ขณะนี้เรากำลังปรับปรุงระบบเพื่อให้บริการได้ดียิ่งขึ้น
          <br className="hidden sm:block" />
          กรุณากลับมาใหม่อีกครั้งในภายหลัง
        </p>

        <div className="mb-8 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Clock className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>ระบบจะกลับมาให้บริการเร็ว ๆ นี้</span>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span>ติดต่อสอบถามได้ทาง LINE Official ของ ด่าไป เดินไป</span>
        </div>
      </div>
    </main>
  );
}
