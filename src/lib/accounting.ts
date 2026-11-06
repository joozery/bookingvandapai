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
export type Partner = { id: string; name: string; phone: string; sharePercent: number; lineUserId?: string | null; adminId?: string | null; note: string; createdAt: number };
export type PartnerTransaction = { id: string; partnerId: string; kind: 'reimbursement' | 'profit_payout'; tripId?: string | null; amountSatang: number; date: string; description: string; createdAt: number; createdBy: string };

type TripRow = { id: string; name: string; departureDate?: string; durationDays?: number; status?: string; cost?: number };
type OrderRow = { id: string; tripId: string; totalSatang: number; paidSatang: number; amountSatang?: number; creditUsedSatang?: number; status: string; reviewRequired?: boolean };
type BookingRow = { tripId: string; status: string; lineUserId?: string | null; adminPartnerId?: string | null };

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
  creditPaymentSatang: number; cashPaymentSatang: number;
  expenseSatang: number; profitSatang: number; outstandingSatang: number; reviewOrders: number;
  costPerPassengerSatang: number | null;
  incomeByCategory: Record<string, number>; expenseByCategory: Record<string, number>;
  centralReserveSatang: number; distributableProfitSatang: number;
  partnerShares: PartnerTripShare[];
};
export type PartnerTripShare = { partnerId: string; attending: boolean; percent: number; amountSatang: number; paidSatang: number; remainingSatang: number };
export type PartnerAccount = Partner & {
  advancedSatang: number; reimbursedSatang: number; owedSatang: number; compensationSatang: number; profitShareSatang: number;
};
export type AccountingSummary = {
  overview: {
    openTrips: number; closedTrips: number; incomeSatang: number; paymentIncomeSatang: number; otherIncomeSatang: number;
    expenseSatang: number; tripExpenseSatang: number; overheadExpenseSatang: number;
    profitSatang: number; outstandingSatang: number; owedToPartnersSatang: number; centralReserveSatang: number; centralFundSatang: number;
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
    creditPaymentSatang: 0, cashPaymentSatang: 0, centralReserveSatang: 0, distributableProfitSatang: 0, partnerShares: [],
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
    trip.creditPaymentSatang += Math.min(received(order), Math.max(0, order.creditUsedSatang || 0));
    trip.cashPaymentSatang += Math.max(0, received(order) - Math.max(0, order.creditUsedSatang || 0));
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

  // Partner participation is inferred from the partner's linked account and
  // an approved booking on that trip. The 20% reserve is kept centrally;
  // the remaining 80% follows the agreed 40/40/20 or 40/30/30 rule.
  for (const trip of trips) {
    const bookingUsers = new Set(input.bookings.filter(b => b.tripId === trip.tripId && b.status === 'approved' && b.lineUserId).map(b => b.lineUserId as string));
    const bookingAdminIds = new Set(input.bookings.filter(b => b.tripId === trip.tripId && b.status === 'approved' && b.adminPartnerId).map(b => b.adminPartnerId as string));
    const attending = input.partners.filter(p => (p.lineUserId && bookingUsers.has(p.lineUserId)) || (p.adminId && bookingAdminIds.has(p.adminId)));
    const profit = Math.max(0, trip.profitSatang);
    const centralReserveSatang = Math.round(profit * 0.20);
    const distributableProfitSatang = profit - centralReserveSatang;
    const allAttend = input.partners.length > 0 && attending.length === input.partners.length;
    const canUseFortyRule = attending.length > 0 && attending.length * 40 < 100 && attending.length < input.partners.length;
    const nonAttending = input.partners.filter(p => !attending.some(a => a.id === p.id));
    const partnerShares = input.partners.map(partner => {
      const isAttending = attending.some(a => a.id === partner.id);
      const percent = allAttend ? 100 / input.partners.length
        : canUseFortyRule ? (isAttending ? 40 : (100 - attending.length * 40) / Math.max(1, nonAttending.length))
        : 100 / Math.max(1, input.partners.length);
      const amountSatang = Math.round(distributableProfitSatang * percent / 100);
      const paidSatang = input.partnerTransactions.filter(t => t.kind === 'profit_payout' && t.tripId === trip.tripId && t.partnerId === partner.id).reduce((s, t) => s + t.amountSatang, 0);
      return { partnerId: partner.id, attending: isAttending, percent, amountSatang, paidSatang, remainingSatang: Math.max(0, amountSatang - paidSatang) };
    });
    trip.centralReserveSatang = centralReserveSatang;
    trip.distributableProfitSatang = distributableProfitSatang;
    trip.partnerShares = partnerShares;
  }

  const paymentIncomeSatang = trips.reduce((s, t) => s + t.paymentIncomeSatang, 0);
  const otherIncomeSatang = trips.reduce((s, t) => s + t.otherIncomeSatang, 0) + overhead.incomeSatang;
  const tripExpenseSatang = trips.reduce((s, t) => s + t.expenseSatang, 0);
  const incomeSatang = paymentIncomeSatang + otherIncomeSatang;
  const expenseSatang = tripExpenseSatang + overhead.expenseSatang;
  const profitSatang = incomeSatang - expenseSatang;
  const centralReserveSatang = trips.filter(t => t.status === 'completed').reduce((s, t) => s + t.centralReserveSatang, 0);

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
      centralReserveSatang, centralFundSatang: centralReserveSatang - overhead.expenseSatang,
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
  const lineUserId = text(input.lineUserId, 120) || null;
  const adminId = text(input.adminId, 120) || null;
  if (lineUserId && await partners.findOne({ lineUserId, ...(id ? { id: { $ne: id } } : {}) })) throw new Error('บัญชีนี้ถูกผูกกับหุ้นส่วนคนอื่นแล้ว');
  if (adminId && await partners.findOne({ adminId, ...(id ? { id: { $ne: id } } : {}) })) throw new Error('บัญชี Admin นี้ถูกผูกกับหุ้นส่วนคนอื่นแล้ว');
  const fields = { name, phone: text(input.phone, 30), sharePercent: Math.round(share * 100) / 100, lineUserId, adminId, note: text(input.note, 300) };
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

export async function addPartnerPayout(input: Record<string, unknown>, by: string) {
  const partnerId = text(input.partnerId, 64);
  const tripId = text(input.tripId, 100);
  const amountSatang = money(input.amount);
  if (!partnerId || !await (await col<Partner>('partners')).findOne({ id: partnerId })) throw new Error('ไม่พบหุ้นส่วน');
  if (!tripId || !await (await col<TripRow>('trips')).findOne({ id: tripId, status: 'completed' })) throw new Error('เลือกได้เฉพาะทริปที่จบแล้ว');
  if (amountSatang <= 0) throw new Error('จำนวนเงินไม่ถูกต้อง');
  const transaction: PartnerTransaction = { id: randomUUID(), partnerId, tripId, kind: 'profit_payout', amountSatang, date: isoDate(input.date), description: text(input.description, 300), createdAt: Date.now(), createdBy: by };
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
    db.collection<OrderRow>('paymentOrders').find({}, { projection: { _id: 0, id: 1, tripId: 1, totalSatang: 1, paidSatang: 1, creditUsedSatang: 1, status: 1, reviewRequired: 1 } }).toArray(),
    db.collection<BookingRow>('bookings').find({ status: 'approved' }, { projection: { _id: 0, tripId: 1, status: 1, lineUserId: 1, adminPartnerId: 1 } }).toArray(),
    db.collection<AccountEntry>('accountEntries').find({}, { projection: { _id: 0 } }).sort({ date: -1, createdAt: -1 }).toArray(),
    db.collection<Partner>('partners').find({}, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray(),
    db.collection<PartnerTransaction>('partnerTransactions').find({}, { projection: { _id: 0 } }).sort({ date: -1, createdAt: -1 }).toArray(),
  ]);
  const summary = summarizeAccounts({ trips, orders, bookings, entries, partners, partnerTransactions });
  const profiles = await db.collection<{ lineUserId?: string; lineUserName?: string; fullName?: string; nickname?: string }>('profiles')
    .find({ lineUserId: { $exists: true, $ne: '' } }, { projection: { _id: 0, lineUserId: 1, lineUserName: 1, fullName: 1, nickname: 1 } })
    .sort({ fullName: 1, nickname: 1 })
    .toArray();
  const adminAccounts = await db.collection<{ id: string; username: string; name: string; isBlocked?: boolean }>('admins')
    .find({ isBlocked: { $ne: true } }, { projection: { _id: 0, id: 1, username: 1, name: 1 } })
    .sort({ name: 1 })
    .toArray();
  return { categories, entries, partnerTransactions, profiles, adminAccounts, ...summary };
}

/** Small aggregate used by the accounting dashboard before detail tabs are opened. */
export async function loadAccountingOverview() {
  const db = await getMongoDb();
  const tripsCollection = db.collection<TripRow>('trips');
  const [tripCounts, orderTotals, entryTotals, tripOrderTotals, tripEntryTotals, partnerAdvances, partnerReimbursements] = await Promise.all([
    tripsCollection.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]).toArray(),
    db.collection<OrderRow>('paymentOrders').aggregate([{ $group: { _id: null, paymentIncomeSatang: { $sum: { $cond: [{ $gt: ['$paidSatang', 0] }, '$paidSatang', 0] } }, outstandingSatang: { $sum: { $cond: [{ $and: [{ $in: ['$status', ['deposit_paid', 'paid']] }, { $gt: ['$totalSatang', '$paidSatang'] }] }, { $subtract: ['$totalSatang', '$paidSatang'] }, 0] } } } }]).toArray(),
    db.collection<AccountEntry>('accountEntries').aggregate([{ $group: { _id: { type: '$type', trip: { $cond: [{ $ne: ['$tripId', null] }, 'trip', 'overhead'] } }, amountSatang: { $sum: '$amountSatang' } } }]).toArray(),
    db.collection<OrderRow>('paymentOrders').aggregate([{ $match: { paidSatang: { $gt: 0 } } }, { $group: { _id: '$tripId', incomeSatang: { $sum: '$paidSatang' } } }]).toArray(),
    db.collection<AccountEntry>('accountEntries').aggregate([{ $group: { _id: '$tripId', incomeSatang: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amountSatang', 0] } }, expenseSatang: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amountSatang', 0] } } } }]).toArray(),
    db.collection<AccountEntry>('accountEntries').aggregate([{ $match: { type: 'expense', paidByPartnerId: { $exists: true, $ne: null } } }, { $group: { _id: '$paidByPartnerId', amountSatang: { $sum: '$amountSatang' } } }]).toArray(),
    db.collection<PartnerTransaction>('partnerTransactions').aggregate([{ $match: { kind: 'reimbursement' } }, { $group: { _id: '$partnerId', amountSatang: { $sum: '$amountSatang' } } }]).toArray(),
  ]);
  const count = (status: string) => Number(tripCounts.find(row => row._id === status)?.count || 0);
  const orders = orderTotals[0] || {};
  let paymentIncomeSatang = Number(orders.paymentIncomeSatang || 0);
  let outstandingSatang = Number(orders.outstandingSatang || 0);
  let otherIncomeSatang = 0, overheadExpenseSatang = 0, tripExpenseSatang = 0;
  for (const row of entryTotals) {
    if (row._id.type === 'income') otherIncomeSatang += Number(row.amountSatang || 0);
    else if (row._id.trip === 'trip') tripExpenseSatang += Number(row.amountSatang || 0);
    else overheadExpenseSatang += Number(row.amountSatang || 0);
  }
  const completed = new Set((await tripsCollection.find({ status: 'completed' }, { projection: { _id: 0, id: 1 } }).toArray()).map(trip => trip.id));
  const tripTotals = new Map<string, { income: number; expense: number }>();
  for (const row of tripOrderTotals) if (completed.has(String(row._id))) tripTotals.set(String(row._id), { income: Number(row.incomeSatang || 0), expense: 0 });
  for (const row of tripEntryTotals) if (completed.has(String(row._id))) { const current = tripTotals.get(String(row._id)) || { income: 0, expense: 0 }; current.income += Number(row.incomeSatang || 0); current.expense += Number(row.expenseSatang || 0); tripTotals.set(String(row._id), current); }
  const centralReserveSatang = [...tripTotals.values()].reduce((sum, row) => sum + Math.round(Math.max(0, row.income - row.expense) * 0.20), 0);
  const expenseSatang = tripExpenseSatang + overheadExpenseSatang;
  const incomeSatang = paymentIncomeSatang + otherIncomeSatang;
  const advanced = new Map(partnerAdvances.map(row => [String(row._id), Number(row.amountSatang || 0)]));
  for (const row of partnerReimbursements) advanced.set(String(row._id), (advanced.get(String(row._id)) || 0) - Number(row.amountSatang || 0));
  return { openTrips: Math.max(0, tripCounts.reduce((sum, row) => sum + Number(row.count || 0), 0) - count('completed')), closedTrips: count('completed'), incomeSatang, paymentIncomeSatang, otherIncomeSatang, expenseSatang, tripExpenseSatang, overheadExpenseSatang, profitSatang: incomeSatang - expenseSatang, outstandingSatang, owedToPartnersSatang: [...advanced.values()].reduce((sum, value) => sum + Math.max(0, value), 0), centralReserveSatang, centralFundSatang: centralReserveSatang - overheadExpenseSatang };
}

/** Load only one page of completed trips for the partner distribution screen. */
export async function loadPartnerTripsPage(page = 1, pageSize = 15) {
  const db = await getMongoDb();
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(20, Math.max(1, Math.floor(pageSize)));
  const tripsCollection = db.collection<TripRow>('trips');
  const [total, trips] = await Promise.all([
    tripsCollection.countDocuments({ status: 'completed' }),
    tripsCollection.find({ status: 'completed' }, { projection: { _id: 0, id: 1, name: 1, departureDate: 1, durationDays: 1, status: 1, cost: 1 } }).sort({ departureDate: -1 }).skip((safePage - 1) * safeSize).limit(safeSize).toArray(),
  ]);
  const ids = trips.map(t => t.id);
  const [orders, bookings, entries, partners, partnerTransactions] = await Promise.all([
    db.collection<OrderRow>('paymentOrders').find({ tripId: { $in: ids } }, { projection: { _id: 0, id: 1, tripId: 1, totalSatang: 1, paidSatang: 1, creditUsedSatang: 1, status: 1, reviewRequired: 1 } }).toArray(),
    db.collection<BookingRow>('bookings').find({ tripId: { $in: ids }, status: 'approved' }, { projection: { _id: 0, tripId: 1, status: 1, lineUserId: 1, adminPartnerId: 1 } }).toArray(),
    db.collection<AccountEntry>('accountEntries').find({ tripId: { $in: ids } }, { projection: { _id: 0 } }).toArray(),
    db.collection<Partner>('partners').find({}, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray(),
    db.collection<PartnerTransaction>('partnerTransactions').find({}, { projection: { _id: 0 } }).toArray(),
  ]);
  const summary = summarizeAccounts({ trips, orders, bookings, entries, partners, partnerTransactions });
  return { trips: summary.trips, total, page: safePage, pageSize: safeSize };
}

/** Paginated accounting entries; the legacy accounting payload remains unchanged. */
export async function loadAccountingEntriesPage(input: { type: EntryType; page?: number; pageSize?: number; tripId?: string; categoryId?: string }) {
  const db = await getMongoDb();
  const page = Math.max(1, Math.floor(input.page || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(input.pageSize || 20)));
  const filter: Record<string, unknown> = { type: input.type };
  if (input.tripId === 'none') filter.tripId = null;
  else if (input.tripId && input.tripId !== 'all') filter.tripId = input.tripId;
  if (input.categoryId && input.categoryId !== 'all') filter.categoryId = input.categoryId;
  const entriesCollection = db.collection<AccountEntry>('accountEntries');
  const [total, entries] = await Promise.all([
    entriesCollection.countDocuments(filter),
    entriesCollection.find(filter, { projection: { _id: 0 } }).sort({ date: -1, createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
  ]);
  return { entries, total, page, pageSize };
}

export async function loadTripAccountsPage(input: { page?: number; pageSize?: number; status?: string; onlyPaying?: boolean }) {
  const db = await getMongoDb();
  const page = Math.max(1, Math.floor(input.page || 1));
  const pageSize = Math.min(20, Math.max(1, Math.floor(input.pageSize || 20)));
  const filter: Record<string, unknown> = input.status === 'completed' ? { status: 'completed' } : input.status === 'active' ? { status: { $ne: 'completed' } } : {};
  if (input.onlyPaying) {
    const payingOrders = await db.collection<OrderRow>('paymentOrders').find({ $or: [{ paidSatang: { $gt: 0 } }, { amountSatang: { $gt: 0 } }] }, { projection: { _id: 0, tripId: 1 } }).toArray();
    filter.id = { $in: [...new Set(payingOrders.map(order => order.tripId))] };
  }
  const tripsCollection = db.collection<TripRow>('trips');
  const [total, trips, partners] = await Promise.all([
    tripsCollection.countDocuments(filter),
    tripsCollection.find(filter, { projection: { _id: 0, id: 1, name: 1, departureDate: 1, durationDays: 1, status: 1, cost: 1 } }).sort({ departureDate: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
    db.collection<Partner>('partners').find({}, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray(),
  ]);
  const ids = trips.map(t => t.id);
  const [orders, bookings, entries, partnerTransactions] = await Promise.all([
    db.collection<OrderRow>('paymentOrders').find({ tripId: { $in: ids } }, { projection: { _id: 0, id: 1, tripId: 1, totalSatang: 1, paidSatang: 1, creditUsedSatang: 1, status: 1, reviewRequired: 1 } }).toArray(),
    db.collection<BookingRow>('bookings').find({ tripId: { $in: ids }, status: 'approved' }, { projection: { _id: 0, tripId: 1, status: 1, lineUserId: 1, adminPartnerId: 1 } }).toArray(),
    db.collection<AccountEntry>('accountEntries').find({ tripId: { $in: ids } }, { projection: { _id: 0 } }).toArray(),
    db.collection<PartnerTransaction>('partnerTransactions').find({}, { projection: { _id: 0 } }).toArray(),
  ]);
  const summary = summarizeAccounts({ trips, orders, bookings, entries, partners, partnerTransactions });
  return { trips: summary.trips, total, page, pageSize };
}
