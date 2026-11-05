import { NextResponse } from "next/server";

export function proxy() {
  return NextResponse.next();
}

export const config = {
  // ข้าม /api, static assets และไฟล์ที่มีนามสกุล (รูป, favicon ฯลฯ)
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
