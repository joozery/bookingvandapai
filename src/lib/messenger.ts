import { createHmac, timingSafeEqual } from 'node:crypto';
import { formatThaiDate } from './dateFormat';

export function verifyMessengerSignature(body: string, signature: string | null, secret: string): boolean {
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature || '')) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature!.slice(7), 'hex'));
}

export interface MessengerEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { is_echo?: boolean };
  referral?: { ref?: string };
  postback?: { referral?: { ref?: string } };
}

export function referralTripId(event: MessengerEvent): string | null {
  if (event.message?.is_echo) return null;
  const ref = event.referral?.ref || event.postback?.referral?.ref;
  if (typeof ref !== 'string' || !ref.startsWith('trip:')) return null;
  const id = ref.slice(5);
  return id.length > 0 && id.length <= 200 && id.trim() === id ? id : null;
}

export function tripReply(trip: { name: string; departureDate: string; departureTime?: string; pickupPoint?: string; status: string } | null): string {
  if (!trip) return 'ไม่พบข้อมูลทริปนี้แล้ว กรุณาสอบถามแอดมินครับ';
  if (trip.status === 'completed') return [
    `ทริป ${trip.name} จบไปแล้วครับ`,
    `วันที่ออกเดินทาง ${formatThaiDate(trip.departureDate)}`,
    'กรุณาสอบถามแอดมินเกี่ยวกับทริปรอบถัดไป',
  ].join('\n').slice(0, 1900);
  return [
    `สนใจทริป ${trip.name} ใช่ไหมครับ?`,
    `วันที่ออกเดินทาง ${formatThaiDate(trip.departureDate)}`,
    trip.departureTime ? `เวลา ${trip.departureTime} น.` : '',
    trip.pickupPoint ? `สถานที่ขึ้นรถ: ${trip.pickupPoint}` : '',
    'แจ้งจำนวนผู้เดินทางในแชทนี้ได้เลยครับ แอดมินจะช่วยตรวจสอบและส่งลิงก์จองให้',
  ].filter(Boolean).join('\n').slice(0, 1900);
}
