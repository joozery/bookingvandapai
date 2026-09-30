import type { Metadata } from "next";
import { loadShareMetadata } from "@/lib/shareMetadata";
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

const baseMetadata: Metadata = {
  metadataBase: new URL('https://dapaidernpai.com'),
  title: "ระบบจองที่นั่งรถตู้ท่องเที่ยว - ด่าไป เดินไป",
  description: "จองที่นั่งรถตู้ท่องเที่ยวสายแคมป์ปิ้ง เดินป่า ธรรมชาติ แบบเรียลไทม์ผ่าน LINE สะดวก รวดเร็ว พร้อมระบบตั๋วเดินทาง QR Check-in",
  keywords: ["จองรถตู้", "รถตู้ท่องเที่ยว", "เดินป่า", "แคมป์ปิ้ง", "ด่าไปเดินไป", "รถตู้เหมา", "จองที่นั่งรถตู้"],
  authors: [{ name: "ด่าไป เดินไป" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: "/logo/logo.jpg",
    apple: "/logo/logo.jpg",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  return { ...baseMetadata, ...await loadShareMetadata() };
}

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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "TravelAgency",
              name: "ด่าไป เดินไป",
              description: "บริการจองรถตู้ท่องเที่ยว สายแคมป์ปิ้ง เดินป่า ขึ้นดอย ธรรมชาติ",
              url: "https://dapaidernpai.com",
              logo: "https://dapaidernpai.com/logo/logo.jpg",
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                availableLanguage: ["Thai"]
              }
            })
          }}
        />
      </head>
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
