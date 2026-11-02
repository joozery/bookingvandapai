import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function paymentUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string; name?: string | null; image?: string | null } | undefined;
  if (!user?.id || user.role === 'admin') throw new Error('กรุณาเข้าสู่ระบบด้วย LINE ก่อนชำระเงิน');
  return { ...user, id: user.id };
}

export function paymentError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  const isPublic = /[ก-๙]/.test(message);
  return Response.json({ success: false, error: isPublic ? message : 'ระบบชำระเงินขัดข้อง กรุณาลองใหม่หรือติดต่อแอดมิน' }, { status: message.includes('เข้าสู่ระบบ') ? 401 : 400 });
}

export function checkPaymentOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const requestUrl = new URL(request.url);
  const allowed = new Set([requestUrl.origin]);
  // Next can construct an internal URL with 0.0.0.0 or localhost even though
  // the browser uses the public Host header. Preserve the scheme and port.
  const host = request.headers.get('host');
  if (host && !/[\s/@\\?#]/.test(host)) {
    try { allowed.add(new URL(`${requestUrl.protocol}//${host}`).origin); }
    catch { /* malformed hosts are never trusted */ }
  }
  if (process.env.NEXTAUTH_URL) {
    try { allowed.add(new URL(process.env.NEXTAUTH_URL).origin); }
    catch { /* a malformed configured URL does not weaken origin checks */ }
  }
  if (!allowed.has(origin)) throw new Error('ไม่อนุญาตให้ทำรายการจากเว็บไซต์อื่น');
}
