import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ไม่พบหน้า - ด่าไป เดินไป",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-slate-500">404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">ไม่พบหน้านี้</h1>
        <p className="mt-2 text-slate-600">ขออภัย ไม่พบหน้าที่คุณกำลังค้นหา</p>
      </div>
    </main>
  );
}
