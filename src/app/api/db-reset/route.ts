import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/dataStore';
import { requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';

export async function POST(request: Request) {
  // Destructive maintenance endpoint: main admin only, and never in production.
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  const admin = await requireAdmin([]);
  if (admin instanceof Response) return admin;
  if (admin.username !== 'admin') return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์' }, { status: 403 });
  try {
    // Delete all trips. Because of ON DELETE CASCADE, this will also wipe out vans and bookings.
    const { error } = await dataStore.from('trips').delete().neq('id', 'dummy');
    if (error) throw error;
    
    await recordAudit(admin, { action: 'delete', resource: 'database', resourceId: 'trips', request, summary: 'รีเซ็ตฐานข้อมูล: ลบทริปทั้งหมด' });
    return NextResponse.json({ success: true, message: 'Database reset successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
