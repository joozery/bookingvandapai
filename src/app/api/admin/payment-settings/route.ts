import { adminWith } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';
import { hasPermission } from '@/lib/permissions';
import { checkPaymentOrigin, paymentError } from '@/lib/paymentAuth';
import { getPaymentSettings, savePaymentSettings } from '@/lib/paymentSettings';
import { testSlip2GoConnection } from '@/lib/slip2go';

export const dynamic = 'force-dynamic';
/** Payment/QR settings use their own permission; viewing never reveals the API key. */
const authorized = (mode: 'view' | 'edit') => adminWith(['payment-settings'], mode);
const denied = () => Response.json({ success: false, error: 'ไม่มีสิทธิ์ตั้งค่าการชำระเงิน' }, { status: 403 });
async function view(canEdit: boolean) {
  const { settings, secret, updatedAt } = await getPaymentSettings();
  return Response.json({ success: true, settings, hasSecret: !!secret, updatedAt, canEdit }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function GET() {
  try {
    const admin = await authorized('view');
    if (!admin) return denied();
    return await view(admin.isMain || hasPermission(admin.permissions, 'payment-settings', 'edit'));
  } catch (error) { return paymentError(error); }
}
export async function PUT(request: Request) {
  try {
    const admin = await authorized('edit');
    if (!admin) return denied();
    checkPaymentOrigin(request);
    if (Number(request.headers.get('content-length') || 0) > 8000) throw new Error('ข้อมูลตั้งค่ายาวเกินไป');
    const body = await request.json();
    const before = (await getPaymentSettings()).settings as unknown as Record<string, unknown>;
    await savePaymentSettings(body.settings, body.secret);
    const after = (await getPaymentSettings()).settings as unknown as Record<string, unknown>;
    const changes = diffSettings(before, after, typeof body.secret === 'string' && body.secret.trim() !== '');
    await recordAudit(admin, { action: 'update', resource: 'payment-settings', resourceId: 'payment', request, changes,
      summary: changes.length ? `แก้ไขตั้งค่าการรับเงิน/QR: ${changes.map(c => c.field).join(', ')}` : 'บันทึกตั้งค่าการรับเงิน (ไม่มีการเปลี่ยนแปลง)' });
    return await view(true);
  } catch (error) {
    // Log only our Thai validation messages, never provider keys, request
    // bodies or raw database errors which may contain connection details.
    const message = error instanceof Error ? error.message : '';
    console.error('[payment-settings:PUT]', /[ก-๙]/.test(message) ? message : 'ไม่สามารถบันทึกข้อมูลได้');
    return paymentError(error);
  }
}
export async function POST(request: Request) {
  try {
    if (!await authorized('edit')) return denied();
    checkPaymentOrigin(request);
    const connection = await testSlip2GoConnection();
    return Response.json({ success: true, connection }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return paymentError(error); }
}

const SETTING_LABELS: Record<string, string> = {
  enabled: 'เปิดระบบรับชำระเงิน', baseUrl: 'API URL', promptPayType: 'ประเภทพร้อมเพย์', promptPayCode: 'เลขพร้อมเพย์ (QR)',
  accountName: 'ชื่อบัญชีผู้รับ', receiverType: 'ประเภทบัญชีตรวจสลิป', receiverNumber: 'บัญชีตรวจสลิป',
};
function diffSettings(before: Record<string, unknown>, after: Record<string, unknown>, secretChanged: boolean) {
  const changes = Object.keys({ ...before, ...after })
    .filter(key => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null))
    .map(key => ({ field: SETTING_LABELS[key] || key, before: before[key], after: after[key] }));
  if (secretChanged) changes.push({ field: 'Secret Key ตรวจสลิป', before: '••• (ซ่อน)', after: '••• เปลี่ยนใหม่ (ซ่อน)' });
  return changes;
}
