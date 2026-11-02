import { assertVerifiedSlip, SlipVerificationError, slipErrorMessage, paymentReceivers, type PaymentReceiver } from './paymentRules';
import { getPaymentSettings, validatePaymentSettings } from './paymentSettings';

export async function paymentConfig() {
  const { settings, secret } = await getPaymentSettings();
  if (!settings.enabled) throw new Error('ระบบชำระเงินยังไม่เปิดให้บริการ');
  validatePaymentSettings(settings);
  const { baseUrl, promptPayCode, accountName, promptPayType, receiverNumber, receiverType } = settings;
  if (!secret || !promptPayCode || !accountName || !receiverNumber || !receiverType) throw new Error('ร้านยังไม่ได้ตั้งค่าบัญชีรับเงินและ Slip2Go กรุณาติดต่อแอดมิน');
  return { secret, baseUrl, promptPayCode, promptPayType, accountName, receiverNumber, receiverType };
}

export async function testSlip2GoConnection() {
  const { settings, secret } = await getPaymentSettings();
  if (!secret) throw new Error('กรุณาบันทึก Secret Key ก่อนทดสอบ');
  if (settings.baseUrl !== 'https://connect.slip2go.com') throw new Error('API URL ไม่ถูกต้อง');
  const response = await fetch(`${settings.baseUrl}/api/account/info`, { headers: { Authorization: `Bearer ${secret}` }, cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error('เชื่อมต่อ Slip2Go ไม่สำเร็จ กรุณาตรวจคีย์และ IP ที่อนุญาต');
  const result = await response.json();
  if (String(result.code) !== '200001') throw new Error('Slip2Go ไม่ยืนยันคีย์ กรุณาตรวจแพ็กเกจและการตั้งค่า');
  return { connected: true, package: result.data?.package || '', tokenRemaining: Number(result.data?.tokenRemaining || 0), packageExpiredDate: result.data?.packageExpiredDate || null, checkedAt: new Date().toISOString() };
}

async function callSlip2Go(path: string, body: unknown) {
  const config = await paymentConfig();
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${config.secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(25_000),
  });
  let result;
  try { result = await response.json(); }
  catch { throw new SlipVerificationError('ผู้ให้บริการตอบกลับไม่สมบูรณ์ กรุณาลองใหม่', `HTTP_${response.status}`); }
  if (!response.ok) {
    const code = /^\d{6}$/.test(String(result.code)) ? String(result.code) : `HTTP_${response.status}`;
    throw new SlipVerificationError(`${slipErrorMessage(code)} (รหัส ${code})`, code, result.data?.referenceId);
  }
  return result;
}

export async function createPaymentQr(amountSatang: number) {
  const config = await paymentConfig();
  const result = await callSlip2Go('/api/qr-payment/generate-qr-code', {
    promptPayCode: config.promptPayCode, promptPayType: config.promptPayType,
    accountName: config.accountName, amount: (amountSatang / 100).toFixed(2),
  });
  if (String(result.code) !== '200' || typeof result.data?.qrCode !== 'string' || !result.data.qrCode) throw new Error('สร้าง QR ชำระเงินไม่สำเร็จ');
  return { qrCode: result.data.qrCode as string, accountName: config.accountName, verificationReceivers: paymentReceivers(config) };
}

export async function verifyPaymentSlip(imageBase64: string, amountSatang: number, createdAt: number, receivers?: PaymentReceiver[]) {
  const config = await paymentConfig();
  const result = await callSlip2Go('/api/verify-slip/qr-base64/info', { payload: {
    imageBase64,
    checkCondition: {
      // Mongo unique transaction reference is the deduplication authority. Keeping
      // provider deduplication off permits retry after a network/database failure.
      checkDuplicate: false,
      checkReceiver: receivers?.length ? receivers : paymentReceivers(config),
      checkAmount: { type: 'eq', amount: amountSatang / 100 },
      checkDate: { type: 'gte', date: new Date(createdAt - 60_000).toISOString() },
    },
  } });
  const checked = assertVerifiedSlip(result, amountSatang, createdAt);
  const rawBank = result.data?.sender?.bank?.id;
  if (!/^\d{1,3}$/.test(String(rawBank))) throw new Error('สลิปไม่มีรหัสธนาคารอ้างอิง');
  const bank = String(rawBank).padStart(3, '0');
  const sender = result.data?.sender;
  return {
    ...checked, transactionKey: `${bank}:${checked.transRef}`, providerReference: String(result.data.referenceId || ''),
    // Payer details printed on the slip, kept for the admin payment history.
    payerName: slipName(sender?.account?.name) || slipName(sender?.name),
    payerBank: slipName(sender?.bank?.name) || slipName(sender?.bank?.short) || bank,
  };
}

/** Slip2Go names can be a plain string or { th, en }; keep a short display value. */
function slipName(value: unknown): string {
  if (typeof value === 'string') return value.trim().slice(0, 120);
  if (value && typeof value === 'object') {
    const named = value as { th?: unknown; en?: unknown };
    return slipName(named.th) || slipName(named.en);
  }
  return '';
}
