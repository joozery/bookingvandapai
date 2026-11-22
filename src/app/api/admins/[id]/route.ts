import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dataStore } from '@/lib/dataStore';
import { requireAdmin } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';
import { applyPermissionChange, SENSITIVE_PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
type Params = { params: Promise<{ id: string }> };
const fields = 'id, username, name, avatar_url, permissions, isBlocked, createdAt';

function protectedTarget(target: { username: string; permissions?: string[] }, actorIsMain: boolean) {
  if (actorIsMain) return null;
  if (target.username === 'admin') return 'แก้ไขแอดมินหลักได้เฉพาะแอดมินหลัก';
  if ((target.permissions || []).some(permission => SENSITIVE_PERMISSIONS.has(permission))) return 'บัญชีนี้มีสิทธิ์สำคัญ แก้ไขได้เฉพาะแอดมินหลัก';
  return null;
}

export async function PUT(request: Request, { params }: Params) {
  const admin = await requireAdmin(['staff']);
  if (admin instanceof Response) return admin;
  try {
    const { id } = await params;
    const body = await request.json() as { name?: string; permissions?: string[]; isBlocked?: boolean; avatar_url?: string | null; password?: string };
    const existingResult = await dataStore.from('admins').select(fields).eq('id', id).maybeSingle();
    if (existingResult.error) throw existingResult.error;
    const target = existingResult.data as { id: string; username: string; name: string; permissions?: string[]; isBlocked?: boolean; avatar_url?: string | null } | null;
    if (!target) return NextResponse.json({ success: false, error: 'ไม่พบบัญชี' }, { status: 404 });
    const denied = protectedTarget(target, admin.isMain);
    if (denied) return NextResponse.json({ success: false, error: denied }, { status: 403 });
    if (target.username === 'admin' && body.isBlocked) return NextResponse.json({ success: false, error: 'ระงับแอดมินหลักไม่ได้' }, { status: 400 });
    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim().slice(0, 100);
    // The main admin always bypasses permission checks, but keep the selected
    // permission levels persisted so the staff editor does not appear to lose
    // changes when the main account itself is edited.
    if (body.permissions !== undefined) updates.permissions = applyPermissionChange(body.permissions, target.permissions || [], admin.isMain);
    if (body.isBlocked !== undefined) updates.isBlocked = !!body.isBlocked;
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
    if (body.password) updates.password = await bcrypt.hash(String(body.password), 10);
    if (!Object.keys(updates).length) return NextResponse.json({ success: false, error: 'ไม่มีข้อมูลที่แก้ไข' }, { status: 400 });
    const updatedResult = await dataStore.from('admins').update(updates).eq('id', id).select(fields).single();
    if (updatedResult.error) throw updatedResult.error;
    await recordAudit(admin, { action: 'update', resource: 'admin', resourceId: id, request, summary: `แก้ไขบัญชีผู้ดูแล ${target.username}`, before: target, after: updatedResult.data });
    return NextResponse.json({ success: true, admin: updatedResult.data });
  } catch (error) {
    console.error('[admins:PUT]', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await requireAdmin(['staff']);
  if (admin instanceof Response) return admin;
  try {
    const { id } = await params;
    const result = await dataStore.from('admins').select(fields).eq('id', id).maybeSingle();
    if (result.error) throw result.error;
    const target = result.data as { id: string; username: string; name: string; permissions?: string[] } | null;
    if (!target) return NextResponse.json({ success: false, error: 'ไม่พบบัญชี' }, { status: 404 });
    if (target.username === 'admin' || target.id === admin.id) return NextResponse.json({ success: false, error: 'ลบบัญชีนี้ไม่ได้' }, { status: 400 });
    const denied = protectedTarget(target, admin.isMain);
    if (denied) return NextResponse.json({ success: false, error: denied }, { status: 403 });
    const deleted = await dataStore.from('admins').delete().eq('id', id);
    if (deleted.error) throw deleted.error;
    await recordAudit(admin, { action: 'delete', resource: 'admin', resourceId: id, request, summary: `ลบบัญชีผู้ดูแล ${target.username}`, before: target });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[admins:DELETE]', error instanceof Error ? error.message : error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'ลบไม่สำเร็จ' }, { status: 500 });
  }
}
