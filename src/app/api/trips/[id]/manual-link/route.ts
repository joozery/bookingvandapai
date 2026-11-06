import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/adminAuth';
import { getMongoDb } from '@/lib/mongodb';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const admin = await requireAdmin(['trips']);
  if (admin instanceof Response) return admin;
  const { id } = await params;
  const token = randomUUID().replaceAll('-', '');
  const db = await getMongoDb();
  await db.collection('manualBookingLinks').createIndex({ token: 1 }, { unique: true });
  await db.collection('manualBookingLinks').insertOne({ token, tripId: id, createdAt: Date.now(), createdBy: admin.id, active: true });
  return Response.json({ success: true, token });
}
