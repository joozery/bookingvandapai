import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { dataStore } from '@/lib/dataStore';
import bcrypt from 'bcryptjs';
import { recordAudit } from '@/lib/audit';
import { applyPermissionChange, describePermission } from '@/lib/permissions';
import { requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';

export async function GET() {
  const admin = await requireAdmin(['staff']);
  if (admin instanceof Response) return admin;
  try {
    const { data: admins, error } = await dataStore
      .from('admins')
      .select('id, username, name, avatar_url, permissions, isBlocked, createdAt')
      .order('createdAt', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, admins: [] });
      }
      throw error;
    }

    return NextResponse.json({ success: true, admins });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(['staff']);
  if (admin instanceof Response) return admin;
  try {
    const body = await request.json();
    const { username, password, name, permissions, avatar_url } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await dataStore
      .from('admins')
      .insert([{
        username,
        password: hashedPassword,
        name,
        // Only the main admin may grant payment, accounting, QR or staff access.
        permissions: applyPermissionChange(permissions, [], admin.isMain),
        isBlocked: false,
        avatar_url: avatar_url || null
      }])
      .select('id, username, name, avatar_url, permissions, isBlocked, createdAt')
      .single();

    if (error) throw error;

    await recordAudit(admin, { action: 'create', resource: 'admin', resourceId: data?.id, request,
      summary: `สร้างบัญชีผู้ดูแล ${username} (${name})`,
      after: { ชื่อผู้ใช้: username, ชื่อ: name, สิทธิ์: (data?.permissions || []).map(describePermission) } });
    return NextResponse.json({ success: true, admin: data });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'Username นี้ถูกใช้งานแล้ว' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
