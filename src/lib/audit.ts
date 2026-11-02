import { randomUUID } from 'node:crypto';
import { getMongoDb } from './mongodb';

export type AuditChange = { field: string; before: unknown; after: unknown };
export type AuditLog = {
  id: string; at: number;
  actorId: string; actorName: string; actorUsername: string;
  action: 'create' | 'update' | 'delete' | 'other';
  resource: string; resourceId: string; summary: string;
  changes: AuditChange[];
  ip?: string;
};
type Actor = { id: string; name: string; username: string };

const SECRET_FIELDS = /password|secret|token|apikey|api_key/i;
const IGNORED_FIELDS = new Set(['_id', 'updatedAt', 'updatedBy', 'createdAt', 'createdBy']);

/** Shortens values for storage; secrets are never written to the log. */
function clean(field: string, value: unknown): unknown {
  if (SECRET_FIELDS.test(field)) return value === undefined || value === null || value === '' ? value : '••• (ซ่อน)';
  if (typeof value === 'string') return value.length > 300 ? `${value.slice(0, 300)}…` : value;
  if (value === undefined || value === null || typeof value !== 'object') return value;
  const json = JSON.stringify(value);
  return json.length > 1000 ? `${json.slice(0, 1000)}…` : JSON.parse(json);
}

/** Field-by-field differences between two plain records (shallow). */
export function diffRecords(before: Record<string, unknown> | null | undefined, after: Record<string, unknown> | null | undefined, fields?: string[]): AuditChange[] {
  const keys = fields || [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  const changes: AuditChange[] = [];
  for (const field of keys) {
    if (IGNORED_FIELDS.has(field)) continue;
    const a = before?.[field], b = after?.[field];
    if (JSON.stringify(a ?? null) === JSON.stringify(b ?? null)) continue;
    changes.push({ field, before: clean(field, a), after: clean(field, b) });
  }
  return changes;
}

/**
 * Appends one audit record. Never throws: a logging failure must not undo or
 * block the change it describes (the error is reported to the server log).
 */
export async function recordAudit(actor: Actor, entry: { action: AuditLog['action']; resource: string; resourceId?: string; summary: string; before?: Record<string, unknown> | null; after?: Record<string, unknown> | null; fields?: string[]; changes?: AuditChange[]; request?: Request }) {
  try {
    const log: AuditLog = {
      id: randomUUID(), at: Date.now(),
      actorId: actor.id, actorName: actor.name, actorUsername: actor.username,
      action: entry.action, resource: entry.resource, resourceId: entry.resourceId || '',
      summary: entry.summary.slice(0, 500),
      changes: entry.changes || (entry.before || entry.after ? diffRecords(entry.before, entry.after, entry.fields) : []),
      ...(entry.request ? { ip: (entry.request.headers.get('x-forwarded-for') || '').split(',')[0].trim().slice(0, 64) || undefined } : {}),
    };
    const collection = (await getMongoDb()).collection<AuditLog>('auditLogs');
    await collection.insertOne({ ...log });
  } catch (error) {
    console.error('[audit] failed to record', entry.resource, entry.action, error instanceof Error ? error.message : error);
  }
}

export type AuditQuery = { q?: string; actor?: string; resource?: string; action?: string; from?: string; to?: string; page?: number };

/** Newest first, 50 per page; dates are Bangkok calendar days (YYYY-MM-DD). */
export async function listAuditLogs(query: AuditQuery) {
  const filter: Record<string, unknown> = {};
  if (query.actor) filter.actorId = query.actor;
  if (query.resource) filter.resource = query.resource;
  if (query.action) filter.action = query.action;
  const range: Record<string, number> = {};
  if (query.from && /^\d{4}-\d{2}-\d{2}$/.test(query.from)) range.$gte = Date.parse(`${query.from}T00:00:00+07:00`);
  if (query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to)) range.$lt = Date.parse(`${query.to}T00:00:00+07:00`) + 86_400_000;
  if (Object.keys(range).length) filter.at = range;
  if (query.q?.trim()) {
    const pattern = { $regex: query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100), $options: 'i' };
    filter.$or = [{ summary: pattern }, { resourceId: pattern }, { actorName: pattern }, { 'changes.field': pattern }];
  }
  const page = Math.max(1, Math.floor(query.page || 1));
  const collection = (await getMongoDb()).collection<AuditLog>('auditLogs');
  const [logs, total, actors] = await Promise.all([
    collection.find(filter, { projection: { _id: 0 } }).sort({ at: -1 }).skip((page - 1) * 50).limit(50).toArray(),
    collection.countDocuments(filter),
    collection.aggregate<{ _id: string; name: string }>([{ $group: { _id: '$actorId', name: { $last: '$actorName' } } }, { $sort: { name: 1 } }]).toArray(),
  ]);
  return { logs, total, page, pageCount: Math.max(1, Math.ceil(total / 50)), actors: actors.map(a => ({ id: a._id, name: a.name })) };
}
