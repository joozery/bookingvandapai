import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const notoSansThai = Noto_Sans_Thai({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["thai", "latin"],
  display: "swap",
  variable: "--font-noto-sans-thai",
});

import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "ระบบจองที่นั่งรถตู้ท่องเที่ยว - ด่าไป เดินไป",
  description: "จองที่นั่งรถตู้ท่องเที่ยวแบบเรียลไทม์ผ่าน LINE สะดวก รวดเร็ว พร้อมระบบตั๋วเดินทาง QR Check-in และแดชบอร์ดแอดมินครบวงจร",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={cn("h-full antialiased", notoSansThai.variable)}
    >
      <body
        suppressHydrationWarning
        className={cn(notoSansThai.className, "min-h-full flex flex-col bg-slate-50 text-slate-800 selection:bg-purple-500 selection:text-white")}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
