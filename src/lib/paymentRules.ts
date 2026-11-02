export const HOLD_MS = 30 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export type PaymentReceiver = { accountType: string; accountNumber: string };
export function paymentReceivers(config: { promptPayType: string; promptPayCode: string; receiverType: string; receiverNumber: string }): PaymentReceiver[] {
  const types: Record<string, string> = { phone_number: '02001', citizen_id: '02003', e_wallet: '02004' };
  const proxyType = types[config.promptPayType];
  if (!proxyType || !config.promptPayCode) throw new Error('ข้อมูลพร้อมเพย์สำหรับตรวจผู้รับไม่ครบ');
  // The QR's configured PromptPay identity is a recipient in its own right.
  // Some bank slips return only this proxy, with no bank account details.
  const receivers = [{ accountType: proxyType, accountNumber: config.promptPayCode }];
  if (config.receiverType && config.receiverNumber && (config.receiverType !== proxyType || config.receiverNumber !== config.promptPayCode)) receivers.push({ accountType: config.receiverType, accountNumber: config.receiverNumber });
  return receivers;
}

export function toSatang(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) throw new Error('ยอดเงินไม่ถูกต้อง');
  const satang = Math.round(amount * 100);
  if (Math.abs(amount * 100 - satang) > 0.00001) throw new Error('ยอดเงินต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง');
  return satang;
}

export function departureTimestamp(date: string, time: string): number {
  const day = date?.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('ทริปยังไม่ได้กำหนดวันเวลาเดินทางที่ถูกต้อง');
  const result = Date.parse(`${day}T${time}:00+07:00`);
  if (!Number.isFinite(result) || new Date(result + 7 * 3600000).toISOString().slice(0, 10) !== day) throw new Error('วันเดินทางไม่ถูกต้อง');
  return result;
}

/**
 * Deposit for one seat. Admins can set a fixed deposit (baht) per trip; when it
 * is unset, zero or not below the price, the original 50% (rounded up) applies.
 */
export function depositSatang(trip: { cost: unknown; depositAmount?: unknown }): number {
  const totalSatang = toSatang(trip.cost);
  const configured = Number(trip.depositAmount);
  if (trip.depositAmount !== undefined && trip.depositAmount !== null && trip.depositAmount !== '' && Number.isFinite(configured) && configured > 0) {
    const satang = toSatang(configured);
    if (satang < totalSatang) return satang;
  }
  return Math.ceil(totalSatang / 2);
}

/** Validates an admin-entered deposit. Returns null for "use the default 50%". */
export function normalizeDepositAmount(value: unknown, cost: unknown): number | null {
  if (value === undefined || value === null || value === '' || Number(value) === 0) return null;
  const satang = toSatang(value);
  if (satang >= toSatang(cost)) throw new Error('ยอดมัดจำต้องน้อยกว่าราคาทริป');
  return satang / 100;
}

export function paymentQuote(trip: { cost: unknown; depositAmount?: unknown; departureDate: string; departureTime: string }, plan: 'deposit' | 'full', now = Date.now()) {
  const departureAt = departureTimestamp(trip.departureDate, trip.departureTime);
  if (departureAt <= now) throw new Error('ทริปนี้ออกเดินทางแล้ว');
  const totalSatang = toSatang(trip.cost);
  const balanceDueAt = departureAt - DAY_MS;
  if (plan === 'deposit' && now >= balanceDueAt) throw new Error('เหลือไม่ถึง 24 ชั่วโมงก่อนเดินทาง กรุณาชำระเต็มจำนวน');
  const amountSatang = plan === 'deposit' ? depositSatang(trip) : totalSatang;
  return { totalSatang, amountSatang, balanceDueAt, departureAt };
}

/** Thai label for an order's payment state, shared by admin views and exports. */
export type PaymentState = 'review' | 'paid' | 'partial' | 'unpaid' | 'lapsed';
export const PAYMENT_STATE_LABELS: Record<PaymentState, string> = {
  review: 'รอแอดมินตรวจสอบ', paid: 'ชำระครบถ้วน', partial: 'ชำระบางส่วน', unpaid: 'รอชำระ', lapsed: 'หมดเวลา (ไม่ได้ชำระ)',
};
export function paymentState(order: { status: string; paidSatang: number; totalSatang: number; expiresAt?: number; reviewRequired?: boolean }, now = Date.now()): PaymentState {
  if (order.status === 'expired' || order.reviewRequired) return 'review';
  if (order.status === 'paid' || (order.paidSatang > 0 && order.paidSatang >= order.totalSatang)) return 'paid';
  if (order.paidSatang > 0) return 'partial';
  return order.expiresAt !== undefined && order.expiresAt <= now ? 'lapsed' : 'unpaid';
}
export function paymentStatusLabel(order: Parameters<typeof paymentState>[0], now = Date.now()) {
  return PAYMENT_STATE_LABELS[paymentState(order, now)];
}

export class SlipVerificationError extends Error {
  constructor(message: string, public providerCode: string, public providerReference?: string) {
    super(message);
    this.name = 'SlipVerificationError';
  }
}
export function slipErrorMessage(code: string, expectedSatang?: number): string {
  const messages: Record<string, string> = {
    '200000': 'พบสลิปแต่ยังไม่ได้รับผลยืนยันเงื่อนไขจากผู้ให้บริการ กรุณาติดต่อแอดมิน',
    '200202': 'สลิปอยู่ระหว่างประมวลผล กรุณารอสักครู่แล้วลองตรวจใหม่',
    '200401': 'บัญชีผู้รับในสลิปไม่ตรงกับบัญชีที่ร้านตั้งค่าไว้ กรุณาตรวจบัญชีรับเงินในหลังบ้าน',
    '200402': expectedSatang ? `ยอดในสลิปไม่ตรงกับยอดที่ต้องชำระ ${(expectedSatang / 100).toFixed(2)} บาท กรุณาติดต่อแอดมินหากโอนเกิน` : 'ยอดในสลิปไม่ตรงกับรายการ',
    '200403': 'เวลาโอนในสลิปไม่ตรงเงื่อนไขของรายการ กรุณาใช้สลิปที่โอนหลังสร้างรายการนี้',
    '200404': 'ยังไม่พบสลิปในระบบธนาคาร กรุณารอสักครู่แล้วลองตรวจใหม่',
    '200500': 'รูปสลิปไม่ถูกต้องหรือไม่สามารถยืนยันกับธนาคารได้',
    '200501': 'สลิปนี้ถูกใช้ชำระเงินแล้ว กรุณาเปิดรายการเดิม',
    '200502': 'ธนาคารยังไม่พร้อมตรวจสลิป กรุณารอสักครู่แล้วลองใหม่',
    '400001': 'ไม่พบ QR ในรูปสลิป กรุณาแนบสลิปต้นฉบับที่มี QR ชัดเจน',
    '400002': 'รูปสลิปอ่านไม่ได้ กรุณาใช้รูปต้นฉบับจากแอปธนาคาร',
    '400005': 'ผู้ให้บริการไม่สามารถอ่านรูปสลิปที่ส่งไปได้ กรุณาติดต่อแอดมิน',
    '400400': 'รูปแบบคำขอตรวจสลิปไม่ถูกต้อง กรุณาติดต่อแอดมิน',
    '401001': 'คีย์ตรวจสลิปไม่ถูกต้อง กรุณาติดต่อแอดมิน',
    '401002': 'ไม่พบร้านค้าในระบบตรวจสลิป กรุณาติดต่อแอดมิน',
    '401003': 'บัญชีบริการตรวจสลิปไม่พร้อมใช้งาน กรุณาติดต่อแอดมิน',
    '401004': 'แพ็กเกจตรวจสลิปหมดอายุ กรุณาติดต่อแอดมิน',
    '401005': 'โควตาตรวจสลิปหมด กรุณาติดต่อแอดมิน',
    '401006': 'เครดิตตรวจสลิปไม่เพียงพอ กรุณาติดต่อแอดมิน',
    '401007': 'เซิร์ฟเวอร์นี้ยังไม่ได้รับอนุญาตให้ใช้คีย์ตรวจสลิป กรุณาติดต่อแอดมิน',
    '429000': 'ส่งตรวจสลิปถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',
  };
  return messages[code] || 'ตรวจสลิปไม่สำเร็จ กรุณาลองใหม่หรือติดต่อแอดมิน';
}

export function assertVerifiedSlip(result: { code?: string | number; data?: { transRef?: string; amount?: unknown; dateTime?: string; referenceId?: string } }, expectedSatang: number, createdAt: number, now = Date.now()) {
  // 200000 means found only. With checkCondition, only 200200 confirms all checks.
  const code = String(result.code || 'UNKNOWN');
  if (code !== '200200') {
    throw new SlipVerificationError(`${slipErrorMessage(code, expectedSatang)} (รหัส ${code})`, code, result.data?.referenceId);
  }
  if (!result.data?.transRef || toSatang(result.data.amount) !== expectedSatang) throw new Error('ข้อมูลธุรกรรมหรือยอดเงินไม่ถูกต้อง');
  const paidAt = Date.parse(result.data.dateTime || '');
  if (!Number.isFinite(paidAt) || paidAt < createdAt - 60_000 || paidAt > now + 60_000) throw new Error('สลิปต้องเป็นการโอนหลังสร้างรายการนี้');
  return { transRef: result.data.transRef, paidAt };
}
