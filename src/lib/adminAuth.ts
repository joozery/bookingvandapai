import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getMongoDb } from './mongodb';
import { hasPermission } from './permissions';

export type AuthorizedAdmin = { id: string; username: string; name: string; isMain: boolean; permissions: string[] };

/**
 * Returns the signed-in admin when they are the main admin or an active staff
 * member holding at least one of `permissions` at the required level (`view`
 * also accepts read-only access to leveled areas such as payments). Permissions
 * are re-read from the database so a blocked or downgraded account loses
 * access immediately.
 */
export async function adminWith(permissions: string[], mode: 'view' | 'edit' = 'edit'): Promise<AuthorizedAdmin | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role !== 'admin') return null;
  const admin = await (await getMongoDb()).collection('admins').findOne(
    { id: user.id, isBlocked: { $ne: true } },
    { projection: { username: 1, name: 1, permissions: 1 } },
  );
  if (!admin) return null;
  // An empty list means "any active admin or staff member".
  const granted = Array.isArray(admin.permissions) ? admin.permissions as string[] : [];
  const isMain = admin.username === 'admin';
  const allowed = isMain || permissions.length === 0 || permissions.some(permission => hasPermission(granted, permission, mode));
  return allowed ? { id: user.id, username: String(admin.username || ''), name: String(admin.name || admin.username || ''), isMain, permissions: granted } : null;
}

export const forbidden = (message = 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้') =>
  Response.json({ success: false, error: message }, { status: 403 });

/** The signed-in user (LINE customer or admin), or null. */
export async function sessionUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  return user?.id ? { id: user.id, role: user.role || 'customer' } : null;
}

/**
 * Route guard: returns the admin, or a 401/403 Response to return directly.
 *   const admin = await requireAdmin(['trips']); if (admin instanceof Response) return admin;
 */
export async function requireAdmin(permissions: string[] = [], mode: 'view' | 'edit' = 'edit'): Promise<AuthorizedAdmin | Response> {
  const admin = await adminWith(permissions, mode);
  if (admin) return admin;
  const user = await sessionUser();
  return user
    ? forbidden()
    : Response.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
}

/**
 * Allows the LINE customer who owns `lineUserId`, or an admin with one of
 * `permissions`. Returns a Response when access is denied.
 */
export async function requireOwnerOrAdmin(lineUserId: string | null | undefined, permissions: string[] = []): Promise<{ id: string; isAdmin: boolean } | Response> {
  const user = await sessionUser();
  if (!user) return Response.json({ success: false, error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  if (user.role !== 'admin' && lineUserId && user.id === lineUserId) return { id: user.id, isAdmin: false };
  const admin = await adminWith(permissions, 'view');
  return admin ? { id: admin.id, isAdmin: true } : forbidden();
}

/** Main admin only (permission management, audit log). */
export async function requireMainAdmin(): Promise<AuthorizedAdmin | Response> {
  const admin = await requireAdmin([]);
  if (admin instanceof Response) return admin;
  return admin.isMain ? admin : forbidden('เฉพาะแอดมินหลักเท่านั้น');
}
