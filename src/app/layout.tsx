import type { Metadata, Viewport } from "next";
import { loadShareMetadata } from "@/lib/shareMetadata";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

import { Providers } from "@/components/Providers";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    icon: "/logo/logo-jpg.webp",
    apple: "/logo/logo-jpg.webp",
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
      className="h-full antialiased"
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
              logo: "https://dapaidernpai.com/logo/logo-jpg.webp",
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
        className="min-h-full flex flex-col bg-slate-50 text-slate-800 selection:bg-purple-500 selection:text-white"
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
