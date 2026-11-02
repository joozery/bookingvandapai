import { randomUUID } from 'node:crypto';
import { getMongoDb } from './mongodb';
import { toSatang } from './paymentRules';

// ── Types ──────────────────────────────────────────────────────────────────
export type EntryType = 'income' | 'expense';
export type AccountCategory = { id: string; type: EntryType; name: string; order: number; system?: 'other' | 'partner_compensation' };
export type AccountEntry = {
  id: string; type: EntryType; categoryId: string; tripId: string | null;
  amountSatang: number; date: string; description: string;
  /** Expense paid out of a partner's own pocket (an advance to be reimbursed). */
  paidByPartnerId?: string | null;
  /** Partner who received this payment (partner compensation). */
  payeePartnerId?: string | null;
  createdAt: number; createdBy: string; updatedAt?: number; updatedBy?: string;
};
export type Partner = { id: string; name: string; phone: string; sharePercent: number; note: string; createdAt: number };
export type PartnerTransaction = { id: string; partnerId: string; kind: 'reimbursement'; amountSatang: number; date: string; description: string; createdAt: number; createdBy: string };

type TripRow = { id: string; name: string; departureDate?: string; durationDays?: number; status?: string; cost?: number };
type OrderRow = { id: string; tripId: string; totalSatang: number; paidSatang: number; status: string; reviewRequired?: boolean };
type BookingRow = { tripId: string; status: string };

export const PAYMENT_INCOME_CATEGORY = { id: 'customer-payments', name: 'ค่าทริปจากลูกทริป (ระบบชำระเงิน)' };

const DEFAULT_CATEGORIES: Omit<AccountCategory, 'id'>[] = [
  ...['ค่ารถ', 'ค่าไกด์', 'ค่าลูกหาบ', 'ค่าธรรมเนียม', 'ค่าอาหาร', 'ค่าอุปกรณ์', 'ค่ารถตู้', 'ค่าน้ำมัน'].map((name, order) => ({ type: 'expense' as const, name, order })),
  { type: 'expense', name: 'ค่าตอบแทนหุ้นส่วน', order: 90, system: 'partner_compensation' },
  { type: 'expense', name: 'อื่น ๆ', order: 99, system: 'other' },
  { type: 'income', name: 'ค่าทริป (รับนอกระบบ)', order: 0 },
  { type: 'income', name: 'ค่าบริการเสริม', order: 1 },
  { type: 'income', name: 'อื่น ๆ', order: 99, system: 'other' },
];

// ── Pure calculations (unit-tested) ────────────────────────────────────────
export type TripAccount = {
  tripId: string; name: string; departureDate: string; status: string; passengers: number;
  paymentIncomeSatang: number; otherIncomeSatang: number; incomeSatang: number;
  expenseSatang: number; profitSatang: number; outstandingSatang: number; reviewOrders: number;
  costPerPassengerSatang: number | null;
  incomeByCategory: Record<string, number>; expenseByCategory: Record<string, number>;
};
export type PartnerAccount = Partner & {
  advancedSatang: number; reimbursedSatang: number; owedSatang: number; compensationSatang: number; profitShareSatang: number;
};
export type AccountingSummary = {
  overview: {
    openTrips: number; closedTrips: number; incomeSatang: number; paymentIncomeSatang: number; otherIncomeSatang: number;
    expenseSatang: number; tripExpenseSatang: number; overheadExpenseSatang: number;
    profitSatang: number; outstandingSatang: number; owedToPartnersSatang: number;
  };
  trips: TripAccount[];
  overhead: { incomeSatang: number; expenseSatang: number; expenseByCategory: Record<string, number>; incomeByCategory: Record<string, number> };
  partners: PartnerAccount[];
};

/** Money actually received for an order (all verified slips, incl. ones awaiting review). */
const received = (order: OrderRow) => Math.max(0, order.paidSatang || 0);
/** Still owed on an order that has started paying (abandoned checkouts are not debts). */
const outstanding = (order: OrderRow) => (order.status === 'deposit_paid' || (order.status === 'paid' && order.totalSatang > order.paidSatang)) ? Math.max(0, order.totalSatang - order.paidSatang) : 0;

export function summarizeAccounts(input: { trips: TripRow[]; orders: OrderRow[]; bookings: BookingRow[]; entries: AccountEntry[]; partners: Partner[]; partnerTransactions: PartnerTransaction[] }): AccountingSummary {
  const tripMap = new Map<string, TripAccount>();
  const blank = (trip: TripRow): TripAccount => ({
    tripId: trip.id, name: trip.name, departureDate: trip.departureDate || '', status: trip.status || 'active', passengers: 0,
    paymentIncomeSatang: 0, otherIncomeSatang: 0, incomeSatang: 0, expenseSatang: 0, profitSatang: 0, outstandingSatang: 0, reviewOrders: 0,
    costPerPassengerSatang: null, incomeByCategory: {}, expenseByCategory: {},
  });
  for (const trip of input.trips) tripMap.set(trip.id, blank(trip));
  const tripFor = (id: string) => {
    let account = tripMap.get(id);
    if (!account) { account = blank({ id, name: 'ทริปที่ถูกลบ', status: 'completed' }); tripMap.set(id, account); }
    return account;
  };
  const add = (bucket: Record<string, number>, key: string, satang: number) => { bucket[key] = (bucket[key] || 0) + satang; };

  for (const booking of input.bookings) if (booking.status === 'approved' && tripMap.has(booking.tripId)) tripFor(booking.tripId).passengers += 1;
  for (const order of input.orders) {
    if (!received(order) && !outstanding(order)) continue;
    const trip = tripFor(order.tripId);
    trip.paymentIncomeSatang += received(order);
    if (received(order)) add(trip.incomeByCategory, PAYMENT_INCOME_CATEGORY.id, received(order));
    trip.outstandingSatang += outstanding(order);
    if (order.status === 'expired' || order.reviewRequired) trip.reviewOrders += 1;
  }

  const overhead = { incomeSatang: 0, expenseSatang: 0, expenseByCategory: {} as Record<string, number>, incomeByCategory: {} as Record<string, number> };
  for (const entry of input.entries) {
    const target = entry.tripId ? tripFor(entry.tripId) : null;
    if (entry.type === 'income') {
      if (target) { target.otherIncomeSatang += entry.amountSatang; add(target.incomeByCategory, entry.categoryId, entry.amountSatang); }
      else { overhead.incomeSatang += entry.amountSatang; add(overhead.incomeByCategory, entry.categoryId, entry.amountSatang); }
    } else if (target) { target.expenseSatang += entry.amountSatang; add(target.expenseByCategory, entry.categoryId, entry.amountSatang); }
    else { overhead.expenseSatang += entry.amountSatang; add(overhead.expenseByCategory, entry.categoryId, entry.amountSatang); }
  }

  const trips = [...tripMap.values()].map(trip => {
    const incomeSatang = trip.paymentIncomeSatang + trip.otherIncomeSatang;
    return { ...trip, incomeSatang, profitSatang: incomeSatang - trip.expenseSatang, costPerPassengerSatang: trip.passengers ? Math.round(trip.expenseSatang / trip.passengers) : null };
  }).sort((a, b) => (b.departureDate || '').localeCompare(a.departureDate || ''));

  const paymentIncomeSatang = trips.reduce((s, t) => s + t.paymentIncomeSatang, 0);
  const otherIncomeSatang = trips.reduce((s, t) => s + t.otherIncomeSatang, 0) + overhead.incomeSatang;
  const tripExpenseSatang = trips.reduce((s, t) => s + t.expenseSatang, 0);
  const incomeSatang = paymentIncomeSatang + otherIncomeSatang;
  const expenseSatang = tripExpenseSatang + overhead.expenseSatang;
  const profitSatang = incomeSatang - expenseSatang;

  const partners = input.partners.map(partner => {
    const advancedSatang = input.entries.filter(e => e.type === 'expense' && e.paidByPartnerId === partner.id).reduce((s, e) => s + e.amountSatang, 0);
    const reimbursedSatang = input.partnerTransactions.filter(t => t.partnerId === partner.id && t.kind === 'reimbursement').reduce((s, t) => s + t.amountSatang, 0);
    const compensationSatang = input.entries.filter(e => e.type === 'expense' && e.payeePartnerId === partner.id).reduce((s, e) => s + e.amountSatang, 0);
    return {
      ...partner, advancedSatang, reimbursedSatang, owedSatang: advancedSatang - reimbursedSatang, compensationSatang,
      profitShareSatang: Math.round(profitSatang * (partner.sharePercent || 0) / 100),
    };
  });

  const known = trips.filter(t => input.trips.some(trip => trip.id === t.tripId));
  return {
    overview: {
      openTrips: known.filter(t => t.status !== 'completed').length, closedTrips: known.filter(t => t.status === 'completed').length,
      incomeSatang, paymentIncomeSatang, otherIncomeSatang, expenseSatang, tripExpenseSatang, overheadExpenseSatang: overhead.expenseSatang,
      profitSatang, outstandingSatang: trips.reduce((s, t) => s + t.outstandingSatang, 0),
      owedToPartnersSatang: partners.reduce((s, p) => s + Math.max(0, p.owedSatang), 0),
    },
    trips, overhead, partners,
  };
}

// ── Validation ─────────────────────────────────────────────────────────────
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const isoDate = (value: unknown) => {
  const date = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new Error('วันที่ไม่ถูกต้อง');
  return date;
};
const money = (value: unknown) => {
  try { return toSatang(value); } catch { throw new Error('จำนวนเงินต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง'); }
};

// ── Storage ────────────────────────────────────────────────────────────────
const col = async <T extends object>(name: string) => (await getMongoDb()).collection<T>(name);

export async function listCategories(): Promise<AccountCategory[]> {
  const categories = await col<AccountCategory>('accountCategories');
  if (await categories.countDocuments({}, { limit: 1 }) === 0) {
    // First use: seed the default categories once (upsert by name keeps it idempotent).
    for (const category of DEFAULT_CATEGORIES) {
      await categories.updateOne({ type: category.type, name: category.name }, { $setOnInsert: { ...category, id: randomUUID() } }, { upsert: true });
    }
  }
  return categories.find({}, { projection: { _id: 0 } }).sort({ type: 1, order: 1, name: 1 }).toArray() as Promise<AccountCategory[]>;
}

export async function saveCategory(input: { id?: string; type?: unknown; name?: unknown }) {
  const categories = await col<AccountCategory>('accountCategories');
  const name = text(input.name, 80);
  if (!name) throw new Error('กรุณาระบุชื่อหมวดหมู่');
  if (input.id) {
    const current = await categories.findOne({ id: input.id });
    if (!current) throw new Error('ไม่พบหมวดหมู่');
    if (await categories.findOne({ type: current.type, name, id: { $ne: input.id } })) throw new Error('มีหมวดหมู่ชื่อนี้แล้ว');
    await categories.updateOne({ id: input.id }, { $set: { name } });
    return { ...current, name };
  }
  const type = input.type === 'income' ? 'income' : input.type === 'expense' ? 'expense' : null;
  if (!type) throw new Error('ประเภทหมวดหมู่ไม่ถูกต้อง');
  if (await categories.findOne({ type, name })) throw new Error('มีหมวดหมู่ชื่อนี้แล้ว');
  const last = await categories.find({ type, system: { $exists: false } }).sort({ order: -1 }).limit(1).toArray();
  const category: AccountCategory = { id: randomUUID(), type, name, order: (last[0]?.order ?? -1) + 1 };
  await categories.insertOne({ ...category });
  return category;
}

/** Deleting a category moves its entries to that type's "อื่น ๆ" category. */
export async function deleteCategory(id: string) {
  const categories = await col<AccountCategory>('accountCategories');
  const category = await categories.findOne({ id });
  if (!category) throw new Error('ไม่พบหมวดหมู่');
  if (category.system) throw new Error('หมวดหมู่ของระบบลบไม่ได้');
  const other = await categories.findOne({ type: category.type, system: 'other' });
  if (!other) throw new Error('ไม่พบหมวดหมู่ "อื่น ๆ" สำหรับย้ายรายการ');
  const moved = await (await col<AccountEntry>('accountEntries')).updateMany({ categoryId: id }, { $set: { categoryId: other.id } });
  await categories.deleteOne({ id });
  return { moved: moved.modifiedCount, to: other.name };
}

export async function saveEntry(input: Record<string, unknown>, by: string, id?: string) {
  const [categories, entries, partners, trips] = await Promise.all([col<AccountCategory>('accountCategories'), col<AccountEntry>('accountEntries'), col<Partner>('partners'), col<TripRow>('trips')]);
  const category = await categories.findOne({ id: text(input.categoryId, 64) });
  if (!category) throw new Error('กรุณาเลือกหมวดหมู่');
  const tripId = text(input.tripId, 100) || null;
  if (tripId && !await trips.findOne({ id: tripId })) throw new Error('ไม่พบทริปที่เลือก');
  const partnerRef = async (value: unknown) => {
    const partnerId = text(value, 64) || null;
    if (partnerId && !await partners.findOne({ id: partnerId })) throw new Error('ไม่พบหุ้นส่วนที่เลือก');
    return partnerId;
  };
  const paidByPartnerId = category.type === 'expense' ? await partnerRef(input.paidByPartnerId) : null;
  const payeePartnerId = category.type === 'expense' ? await partnerRef(input.payeePartnerId) : null;
  if (category.system === 'partner_compensation' && !payeePartnerId) throw new Error('ค่าตอบแทนหุ้นส่วนต้องระบุหุ้นส่วนผู้รับ');
  const fields = {
    type: category.type, categoryId: category.id, tripId, amountSatang: money(input.amount), date: isoDate(input.date),
    description: text(input.description, 300), paidByPartnerId, payeePartnerId,
  };
  if (id) {
    const result = await entries.findOneAndUpdate({ id }, { $set: { ...fields, updatedAt: Date.now(), updatedBy: by } }, { returnDocument: 'after', projection: { _id: 0 } });
    if (!result) throw new Error('ไม่พบรายการ');
    return result;
  }
  const entry: AccountEntry = { id: randomUUID(), ...fields, createdAt: Date.now(), createdBy: by };
  await entries.insertOne({ ...entry });
  return entry;
}

export async function deleteEntry(id: string) {
  const result = await (await col<AccountEntry>('accountEntries')).deleteOne({ id });
  if (!result.deletedCount) throw new Error('ไม่พบรายการ');
}

export async function savePartner(input: Record<string, unknown>, id?: string) {
  const partners = await col<Partner>('partners');
  const name = text(input.name, 100);
  if (!name) throw new Error('กรุณาระบุชื่อหุ้นส่วน');
  const share = input.sharePercent === '' || input.sharePercent === undefined ? 0 : Number(input.sharePercent);
  if (!Number.isFinite(share) || share < 0 || share > 100) throw new Error('สัดส่วนหุ้นต้องอยู่ระหว่าง 0–100%');
  const others = await partners.find(id ? { id: { $ne: id } } : {}).toArray();
  if (others.reduce((s, p) => s + (p.sharePercent || 0), 0) + share > 100.0001) throw new Error('สัดส่วนหุ้นรวมทุกคนเกิน 100%');
  const fields = { name, phone: text(input.phone, 30), sharePercent: Math.round(share * 100) / 100, note: text(input.note, 300) };
  if (id) {
    const result = await partners.findOneAndUpdate({ id }, { $set: fields }, { returnDocument: 'after', projection: { _id: 0 } });
    if (!result) throw new Error('ไม่พบหุ้นส่วน');
    return result;
  }
  const partner: Partner = { id: randomUUID(), ...fields, createdAt: Date.now() };
  await partners.insertOne({ ...partner });
  return partner;
}

export async function deletePartner(id: string) {
  const [entries, transactions, partners] = await Promise.all([col<AccountEntry>('accountEntries'), col<PartnerTransaction>('partnerTransactions'), col<Partner>('partners')]);
  if (await entries.findOne({ $or: [{ paidByPartnerId: id }, { payeePartnerId: id }] }) || await transactions.findOne({ partnerId: id })) {
    throw new Error('หุ้นส่วนนี้มีรายการบัญชีอยู่ ลบไม่ได้ (แก้ไขข้อมูลแทนได้)');
  }
  const result = await partners.deleteOne({ id });
  if (!result.deletedCount) throw new Error('ไม่พบหุ้นส่วน');
}

export async function addReimbursement(input: Record<string, unknown>, by: string) {
  const partnerId = text(input.partnerId, 64);
  if (!await (await col<Partner>('partners')).findOne({ id: partnerId })) throw new Error('ไม่พบหุ้นส่วน');
  const transaction: PartnerTransaction = { id: randomUUID(), partnerId, kind: 'reimbursement', amountSatang: money(input.amount), date: isoDate(input.date), description: text(input.description, 300), createdAt: Date.now(), createdBy: by };
  await (await col<PartnerTransaction>('partnerTransactions')).insertOne({ ...transaction });
  return transaction;
}

export async function deletePartnerTransaction(id: string) {
  const result = await (await col<PartnerTransaction>('partnerTransactions')).deleteOne({ id });
  if (!result.deletedCount) throw new Error('ไม่พบรายการ');
}

/** Everything the accounting screens need, in one read. */
export async function loadAccounting() {
  const db = await getMongoDb();
  const [categories, trips, orders, bookings, entries, partners, partnerTransactions] = await Promise.all([
    listCategories(),
    db.collection<TripRow>('trips').find({}, { projection: { _id: 0, id: 1, name: 1, departureDate: 1, durationDays: 1, status: 1, cost: 1 } }).toArray(),
    db.collection<OrderRow>('paymentOrders').find({}, { projection: { _id: 0, id: 1, tripId: 1, totalSatang: 1, paidSatang: 1, status: 1, reviewRequired: 1 } }).toArray(),
    db.collection<BookingRow>('bookings').find({ status: 'approved' }, { projection: { _id: 0, tripId: 1, status: 1 } }).toArray(),
    db.collection<AccountEntry>('accountEntries').find({}, { projection: { _id: 0 } }).sort({ date: -1, createdAt: -1 }).toArray(),
    db.collection<Partner>('partners').find({}, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray(),
    db.collection<PartnerTransaction>('partnerTransactions').find({}, { projection: { _id: 0 } }).sort({ date: -1, createdAt: -1 }).toArray(),
  ]);
  const summary = summarizeAccounts({ trips, orders, bookings, entries, partners, partnerTransactions });
  return { categories, entries, partnerTransactions, ...summary };
}
