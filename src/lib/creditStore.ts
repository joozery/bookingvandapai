import { randomUUID } from 'node:crypto';
import { getMongoDb } from './mongodb';

const CREDIT_VALID_MS = 365 * 24 * 60 * 60 * 1000;

export type CreditEntry = {
  id: string;
  userId: string;
  type: 'grant' | 'use';
  amountSatang: number;
  remainingSatang?: number;
  sourceKey: string;
  sourceTripId?: string;
  appliedTripId?: string;
  paymentOrderId?: string;
  reason: string;
  createdAt: number;
  expiresAt?: number;
};

let indexes: Promise<unknown> | undefined;
async function collection() {
  const db = await getMongoDb();
  indexes ??= Promise.all([
    db.collection<CreditEntry>('creditLedger').createIndex({ id: 1 }, { unique: true }),
    db.collection<CreditEntry>('creditLedger').createIndex({ sourceKey: 1 }, { unique: true }),
    db.collection<CreditEntry>('creditLedger').createIndex({ userId: 1, createdAt: -1 }),
  ]).catch(error => { indexes = undefined; throw error; });
  await indexes;
  return db.collection<CreditEntry>('creditLedger');
}

export async function creditBalance(userId: string) {
  const now = Date.now();
  const rows = await (await collection()).find({ userId, type: 'grant', expiresAt: { $gt: now }, remainingSatang: { $gt: 0 } }).toArray();
  return rows.reduce((sum, row) => sum + Number(row.remainingSatang || 0), 0);
}

export async function creditHistory(userId: string) {
  return (await collection()).find({ userId }).sort({ createdAt: -1 }).limit(200).toArray();
}

export async function grantCredit(input: { userId: string; amountSatang: number; sourceKey: string; sourceTripId?: string; reason: string }) {
  if (!Number.isInteger(input.amountSatang) || input.amountSatang <= 0) return null;
  const credits = await collection();
  const existing = await credits.findOne({ sourceKey: input.sourceKey });
  if (existing) return existing;
  const now = Date.now();
  const entry: CreditEntry = {
    id: randomUUID(), userId: input.userId, type: 'grant', amountSatang: input.amountSatang,
    remainingSatang: input.amountSatang, sourceKey: input.sourceKey, sourceTripId: input.sourceTripId,
    reason: input.reason, createdAt: now, expiresAt: now + CREDIT_VALID_MS,
  };
  try { await credits.insertOne(entry); } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error;
  }
  return credits.findOne({ sourceKey: input.sourceKey });
}

export async function consumeCredit(input: { userId: string; amountSatang: number; appliedTripId: string; paymentOrderId: string; reason: string }) {
  if (!Number.isInteger(input.amountSatang) || input.amountSatang <= 0) return 0;
  const credits = await collection();
  let remaining = input.amountSatang;
  const now = Date.now();
  const grants = await credits.find({ userId: input.userId, type: 'grant', expiresAt: { $gt: now }, remainingSatang: { $gt: 0 } }).sort({ expiresAt: 1, createdAt: 1 }).toArray();
  const allocations: { grantId: string; amount: number }[] = [];
  for (const grant of grants) {
    if (remaining <= 0) break;
    const available = Number(grant.remainingSatang || 0);
    const amount = Math.min(available, remaining);
    const updated = await credits.updateOne({ id: grant.id, remainingSatang: available }, { $inc: { remainingSatang: -amount } });
    if (updated.modifiedCount !== 1) continue;
    allocations.push({ grantId: grant.id, amount });
    remaining -= amount;
  }
  if (remaining > 0) {
    for (const allocation of allocations) await credits.updateOne({ id: allocation.grantId }, { $inc: { remainingSatang: allocation.amount } });
    throw new Error('เครดิตคงเหลือไม่เพียงพอ กรุณาลองใหม่อีกครั้ง');
  }
  for (const allocation of allocations) {
    await credits.insertOne({ id: randomUUID(), userId: input.userId, type: 'use', amountSatang: allocation.amount, sourceKey: `use:${input.paymentOrderId}:${allocation.grantId}`, sourceTripId: allocation.grantId, appliedTripId: input.appliedTripId, paymentOrderId: input.paymentOrderId, reason: input.reason, createdAt: now });
  }
  return input.amountSatang;
}

