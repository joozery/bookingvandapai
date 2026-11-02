import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getMongoDb } from './mongodb';

export type PaymentSettings = {
  enabled: boolean; baseUrl: string; promptPayType: string; promptPayCode: string;
  accountName: string; receiverType: string; receiverNumber: string;
};
type StoredSettings = PaymentSettings & { _id: string; id: string; encryptedSecret?: string; updatedAt?: string };

function encryptionKey() {
  const value = process.env.PAYMENT_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!value || value.length < 16) throw new Error('ต้องตั้งค่า NEXTAUTH_SECRET หรือ PAYMENT_ENCRYPTION_KEY ก่อนบันทึกคีย์');
  return createHash('sha256').update(value).digest();
}
export function encryptPaymentSecret(secret: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), nonce);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [nonce, cipher.getAuthTag(), encrypted].map(value => value.toString('base64')).join('.');
}
export function decryptPaymentSecret(encrypted: string) {
  const [nonce, tag, data] = encrypted.split('.').map(value => Buffer.from(value, 'base64'));
  if (!nonce || !tag || !data) throw new Error('อ่านคีย์ชำระเงินไม่สำเร็จ');
  const cipher = createDecipheriv('aes-256-gcm', encryptionKey(), nonce);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
}
export function validatePaymentSettings(input: unknown): PaymentSettings {
  if (!input || typeof input !== 'object') throw new Error('ข้อมูลตั้งค่าไม่ถูกต้อง');
  const value = input as Record<string, unknown>;
  if (typeof value.enabled !== 'boolean') throw new Error('สถานะเปิดใช้ไม่ถูกต้อง');
  const text = (key: string, max = 200) => {
    if (typeof value[key] !== 'string' || value[key].length > max) throw new Error('ข้อมูลตั้งค่าไม่ถูกต้อง');
    return value[key].trim();
  };
  const result = { enabled: value.enabled, baseUrl: text('baseUrl'), promptPayType: text('promptPayType'), promptPayCode: text('promptPayCode'), accountName: text('accountName'), receiverType: text('receiverType'), receiverNumber: text('receiverNumber').replace(/[\s-]/g, '') };
  // Never send an API secret to an administrator-supplied arbitrary host.
  if (result.baseUrl !== 'https://connect.slip2go.com') throw new Error('API URL ต้องเป็น https://connect.slip2go.com');
  const lengths: Record<string, number> = { phone_number: 10, citizen_id: 13, e_wallet: 15 };
  if (!lengths[result.promptPayType]) throw new Error('ประเภทพร้อมเพย์ไม่ถูกต้อง');
  if (result.promptPayCode && (!/^\d+$/.test(result.promptPayCode) || result.promptPayCode.length !== lengths[result.promptPayType])) throw new Error('หมายเลขพร้อมเพย์ไม่ถูกต้อง');
  if (result.receiverType && !/^\d{5}$/.test(result.receiverType)) throw new Error('รหัสประเภทบัญชีผู้รับต้องเป็นตัวเลข 5 หลัก');
  if (result.receiverNumber && !/^[\dxX*]{4,30}$/.test(result.receiverNumber)) throw new Error('เลขบัญชีตรวจสลิปไม่ถูกต้อง ห้ามมีช่องว่างหรือขีด');
  if (result.enabled && (!result.promptPayCode || !result.accountName || !result.receiverType || !result.receiverNumber)) throw new Error('กรอกบัญชีพร้อมเพย์ ชื่อผู้รับ และบัญชีตรวจสลิปให้ครบก่อนเปิดระบบ');
  return result;
}
export async function getPaymentSettings() {
  const stored = await (await getMongoDb()).collection<StoredSettings>('privateSettings').findOne({ id: 'payments' });
  const settings: PaymentSettings = {
    enabled: stored?.enabled ?? process.env.PAYMENTS_ENABLED === 'true',
    baseUrl: stored?.baseUrl ?? process.env.SLIP2GO_API_URL ?? 'https://connect.slip2go.com',
    promptPayType: stored?.promptPayType ?? process.env.PAYMENT_PROMPTPAY_TYPE ?? 'phone_number',
    promptPayCode: stored?.promptPayCode ?? process.env.PAYMENT_PROMPTPAY_ID ?? '',
    accountName: stored?.accountName ?? process.env.PAYMENT_ACCOUNT_NAME ?? '',
    receiverType: stored?.receiverType ?? process.env.PAYMENT_RECEIVER_TYPE ?? '',
    receiverNumber: stored?.receiverNumber ?? process.env.PAYMENT_RECEIVER_ACCOUNT ?? '',
  };
  return { settings, secret: stored?.encryptedSecret ? decryptPaymentSecret(stored.encryptedSecret) : process.env.SLIP2GO_SECRET_KEY || '', updatedAt: stored?.updatedAt || null };
}
export async function paymentsEnabled() {
  return (await getPaymentSettings()).settings.enabled;
}
export async function savePaymentSettings(input: unknown, newSecret?: unknown) {
  const settings = validatePaymentSettings(input);
  if (newSecret !== undefined && (typeof newSecret !== 'string' || newSecret.length > 1000 || /[\r\n]/.test(newSecret))) throw new Error('Secret Key ไม่ถูกต้อง');
  const existing = await getPaymentSettings();
  const replacement = typeof newSecret === 'string' ? newSecret.trim() : '';
  if (settings.enabled && !replacement && !existing.secret) throw new Error('กรุณาตั้งค่า Secret Key ก่อนเปิดระบบ');
  const db = await getMongoDb();
  // A stable _id makes concurrent first saves update the same document.
  await db.collection<StoredSettings>('privateSettings').updateOne({ _id: 'payments' }, { $set: { id: 'payments', ...settings, updatedAt: new Date().toISOString(), ...(replacement ? { encryptedSecret: encryptPaymentSecret(replacement) } : {}) } }, { upsert: true });
}
