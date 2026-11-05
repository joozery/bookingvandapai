import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ปิดเว็บชั่วคราว: ทุกหน้า (รวมหลังบ้าน /admin และหน้า login) จะแสดงหน้า "กำลังปรับปรุงระบบ"
// เปิดเว็บกลับ: ลบไฟล์นี้ทิ้ง
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/maintenance") return NextResponse.next();

  return NextResponse.rewrite(new URL("/maintenance", request.url));
}

export const config = {
  // ข้าม /api (webhook LINE/การชำระเงินยังทำงาน), static assets และไฟล์ที่มีนามสกุล (รูป, favicon ฯลฯ)
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
