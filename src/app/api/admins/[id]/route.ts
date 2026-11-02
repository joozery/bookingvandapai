import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';
import { getMongoDb } from '@/lib/mongodb';
import { applyPermissionChange, describePermission, SENSITIVE_PERMISSIONS } from '@/lib/permissions';

type RouteParams = { params: Promise<{ id: string }> };
type AdminDoc = { id: string; username: string; name: string; permissions?: string[]; isBlocked?: boolean; avatar_url?: string | null };
const PUBLIC_FIELDS = { _id: 0, id: 1, username: 1, name: 1, avatar_url: 1, permissions: 1, isBlocked: 1, createdAt: 1 };

/**
 * Staff with the "staff" permission manage ordinary accounts. Only the main
 * admin may change the main account, accounts holding sensitive access
 * (payments, accounting, payment/QR settings, staff management) or grant it.
 */
function protectedTarget(target: AdminDoc, actorIsMain: boolean) {
  if (actorIsMain) return null;
  if (target.username === 'admin') return 'แก้ไขบัญชีแอดมินหลักได้เฉพาะแอดมินหลัก';
  if ((target.permissions || []).some(p => SENSITIVE_PERMISSIONS.has(p))) return 'บัญชีนี้มีสิทธิ์ระบบการเงินหรือจัดการทีมงาน แก้ไขได้เฉพาะแอดมินหลัก';
  return null;
}

export async function PUT(request: Request, props: RouteParams) {
  const admin = await requireAdmin(['staff']);
  if (admin instanceof Response) return admin;
  try {
    const { id } = await props.params;
    const body = await request.json();
    const admins = (await getMongoDb()).collection<AdminDoc>('admins');
    const target = await admins.findOne({ id }, { projection: PUBLIC_FIELDS });
    if (!target) return NextResponse.json({ success: false, error: 'ไม่พบบัญชี' }, { status: 404 });
    const denied = protectedTarget(target, admin.isMain);
    if (denied) return NextResponse.json({ success: false, error: denied }, { status: 403 });
    if (target.username === 'admin' && body.isBlocked) return NextResponse.json({ success: false, error: 'ระงับบัญชีแอดมินหลักไม่ได้' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim().slice(0, 100);
    // The main admin always has full access; its permission list is not edited.
    if (body.permissions !== undefined && target.username !== 'admin') updates.permissions = applyPermissionChange(body.permissions, target.permissions || [], admin.isMain);
    if (body.isBlocked !== undefined) updates.isBlocked = !!body.isBlocked;
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
    if (body.password) updates.password = await bcrypt.hash(String(body.password), 10);

    const data = await admins.findOneAndUpdate({ id }, { $set: updates }, { returnDocument: 'after', projection: PUBLIC_FIELDS });

    const before = target.permissions || [], after = (updates.permissions as string[] | undefined) || before;
    const added = after.filter(p => !before.includes(p)).map(describePermission);
    const removed = before.filter(p => !after.includes(p)).map(describePermission);
    const changes = [
      ...(updates.name !== undefined && updates.name !== target.name ? [{ field: 'ชื่อ', before: target.name, after: updates.name }] : []),
      ...(added.length || removed.length ? [{ field: 'สิทธิ์', before: before.map(describePermission), after: after.map(describePermission) }] : []),
      ...(updates.isBlocked !== undefined && !!target.isBlocked !== updates.isBlocked ? [{ field: 'ระงับการใช้งาน', before: !!target.isBlocked, after: updates.isBlocked }] : []),
      ...(updates.password ? [{ field: 'รหัสผ่าน', before: '•••', after: 'เปลี่ยนใหม่ (ซ่อน)' }] : []),
      ...(updates.avatar_url !== undefined && updates.avatar_url !== target.avatar_url ? [{ field: 'รูปโปรไฟล์', before: target.avatar_url || '', after: updates.avatar_url }] : []),
    ];
    if (changes.length) {
      const parts = [added.length && `เพิ่มสิทธิ์ ${added.join(', ')}`, removed.length && `ถอนสิทธิ์ ${removed.join(', ')}`, changes.some(c => c.field === 'ระงับการใช้งาน') && (updates.isBlocked ? 'ระงับการใช้งาน' : 'ยกเลิกการระงับ'), updates.password && 'เปลี่ยนรหัสผ่าน'].filter(Boolean);
      await recordAudit(admin, { action: 'update', resource: 'admin', resourceId: id, request, changes,
        summary: `แก้ไขบัญชีผู้ดูแล ${target.username}${parts.length ? `: ${parts.join(' · ')}` : ''}` });
    }
    return NextResponse.json({ success: true, admin: data });
  } catch (error) {
    console.error('[admins:PUT]', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'บันทึกไม่สำเร็จ' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: RouteParams) {
  const admin = await requireAdmin(['staff']);
  if (admin instanceof Response) return admin;
  try {
    const { id } = await props.params;
    const admins = (await getMongoDb()).collection<AdminDoc>('admins');
    const target = await admins.findOne({ id }, { projection: PUBLIC_FIELDS });
    if (!target) return NextResponse.json({ success: false, error: 'ไม่พบบัญชี' }, { status: 404 });
    if (target.username === 'admin') return NextResponse.json({ success: false, error: 'ลบบัญชีแอดมินหลักไม่ได้' }, { status: 400 });
    if (target.id === admin.id) return NextResponse.json({ success: false, error: 'ลบบัญชีของตัวเองไม่ได้' }, { status: 400 });
    const denied = protectedTarget(target, admin.isMain);
    if (denied) return NextResponse.json({ success: false, error: denied }, { status: 403 });
    await admins.deleteOne({ id });
    await recordAudit(admin, { action: 'delete', resource: 'admin', resourceId: id, request,
      summary: `ลบบัญชีผู้ดูแล ${target.username} (${target.name})`, before: { ชื่อผู้ใช้: target.username, ชื่อ: target.name, สิทธิ์: (target.permissions || []).map(describePermission) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admins:DELETE]', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: 'ลบไม่สำเร็จ' }, { status: 500 });
  }
}
