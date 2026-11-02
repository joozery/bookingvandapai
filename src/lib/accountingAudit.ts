import { getMongoDb } from './mongodb';
import { recordAudit } from './audit';
import type { AuthorizedAdmin } from './adminAuth';

const COLLECTIONS: Record<string, string> = { entries: 'accountEntries', categories: 'accountCategories', partners: 'partners', reimbursements: 'partnerTransactions' };
const LABELS: Record<string, string> = { entries: 'รายการบัญชี', categories: 'หมวดหมู่บัญชี', partners: 'หุ้นส่วน', reimbursements: 'การเบิกคืนหุ้นส่วน' };
const FIELD_LABELS: Record<string, string> = {
  type: 'ประเภท', categoryId: 'หมวดหมู่', tripId: 'ทริป', amountSatang: 'จำนวนเงิน (บาท)', date: 'วันที่', description: 'รายละเอียด',
  paidByPartnerId: 'สำรองจ่ายโดย', payeePartnerId: 'หุ้นส่วนผู้รับ', name: 'ชื่อ', phone: 'เบอร์โทร', sharePercent: 'สัดส่วนหุ้น (%)', note: 'หมายเหตุ', partnerId: 'หุ้นส่วน',
};

export async function accountingRecord(resource: string, id: string) {
  const name = COLLECTIONS[resource];
  return name ? (await getMongoDb()).collection(name).findOne({ id }, { projection: { _id: 0 } }) as Promise<Record<string, unknown> | null> : null;
}

/** Records an accounting change with readable names (trip, category, partner) and baht amounts. */
export async function auditAccounting(admin: AuthorizedAdmin, request: Request, resource: string, action: 'create' | 'update' | 'delete', before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const db = await getMongoDb();
  const ids = (key: string) => [before?.[key], after?.[key]].filter((v): v is string => typeof v === 'string' && !!v);
  const [trips, categories, partners] = await Promise.all([
    db.collection('trips').find({ id: { $in: ids('tripId') } }, { projection: { id: 1, name: 1 } }).toArray(),
    db.collection('accountCategories').find({ id: { $in: ids('categoryId') } }, { projection: { id: 1, name: 1 } }).toArray(),
    db.collection('partners').find({ id: { $in: [...ids('paidByPartnerId'), ...ids('payeePartnerId'), ...ids('partnerId')] } }, { projection: { id: 1, name: 1 } }).toArray(),
  ]);
  const names = new Map([...trips, ...categories, ...partners].map(r => [r.id as string, r.name as string]));
  const readable = (record: Record<string, unknown> | null) => record && Object.fromEntries(Object.entries(record)
    .filter(([key]) => key in FIELD_LABELS)
    .map(([key, value]) => [FIELD_LABELS[key],
      key === 'amountSatang' ? Number(value) / 100
        : key === 'type' ? (value === 'income' ? 'รายรับ' : value === 'expense' ? 'รายจ่าย' : value)
        : typeof value === 'string' && names.has(value) ? names.get(value)
        : key === 'tripId' && !value ? 'ส่วนกลาง' : value]));
  const subject = (after || before) as Record<string, unknown>;
  const title = typeof subject.name === 'string' ? subject.name
    : typeof subject.amountSatang === 'number' ? `฿${(subject.amountSatang / 100).toLocaleString('th-TH')}${typeof subject.categoryId === 'string' && names.has(subject.categoryId) ? ` ${names.get(subject.categoryId)}` : ''}`
    : '';
  const verb = action === 'create' ? 'เพิ่ม' : action === 'update' ? 'แก้ไข' : 'ลบ';
  await recordAudit(admin, { action, resource: `accounting:${resource}`, resourceId: String(subject.id || ''), request,
    summary: `${verb}${LABELS[resource] || resource} ${title}`.trim(), before: readable(before), after: readable(after) });
}
