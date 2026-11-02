/**
 * Admin permissions are stored as strings on the admin record. Most menus are
 * on/off (`"trips"`). Sensitive areas have three levels:
 *   none  → key absent
 *   view  → `"<key>:view"`  (read only)
 *   edit  → `"<key>"`       (read and change; also the meaning of older records)
 * Shared by the server (enforcement) and the admin UI (display).
 */
export const PERMISSIONS = [
  { id: 'dashboard', label: 'แดชบอร์ด (Dashboard)' },
  { id: 'calendar', label: 'ปฏิทินการเดินทาง (Calendar)' },
  { id: 'trips', label: 'จัดการทริป (Trips)' },
  { id: 'completed-trips', label: 'ทริปที่จบไปแล้ว (Completed Trips)' },
  { id: 'vans', label: 'จัดการรถ (Vans)' },
  { id: 'bookings', label: 'การจองและลูกทริป (Bookings)' },
  { id: 'checkin', label: 'QR Check-in (Check-in)' },
  { id: 'users', label: 'จัดการลูกทริป (Users)' },
  { id: 'staff', label: 'ทีมงาน / ผู้จัด (Admin Roles)' },
  { id: 'insurance', label: 'ประกันการเดินทาง (Insurance)' },
  { id: 'reports', label: 'รายงาน (Reports)' },
  { id: 'reviews', label: 'รีวิวและความคิดเห็น (Reviews)' },
  { id: 'leaderboard', label: 'อันดับคนจองทริป' },
  { id: 'settings', label: 'ตั้งค่าเว็บไซต์ (Settings)' },
] as const;

export const LEVELED_PERMISSIONS = [
  { id: 'payments', label: 'ระบบชำระเงิน', hint: 'ประวัติการชำระ สลิป แก้ยอด ส่งออก' },
  { id: 'accounting', label: 'ระบบบัญชีรายรับ–รายจ่าย', hint: 'รายรับ รายจ่าย หุ้นส่วน รายงาน' },
  { id: 'payment-settings', label: 'ตั้งค่าการรับเงิน / QR Code', hint: 'บัญชีพร้อมเพย์ ผู้รับเงิน คีย์ตรวจสลิป' },
] as const;

export type Level = 'none' | 'view' | 'edit';
export type LeveledKey = typeof LEVELED_PERMISSIONS[number]['id'];
export const LEVEL_LABELS: Record<Level, string> = { none: 'ไม่สามารถเข้าถึง', view: 'ดูได้อย่างเดียว', edit: 'ดูและแก้ไขได้' };

const leveled = new Set<string>(LEVELED_PERMISSIONS.map(p => p.id));
const known = new Set<string>([...PERMISSIONS.map(p => p.id), ...LEVELED_PERMISSIONS.flatMap(p => [p.id, `${p.id}:view`])]);

/** Only the main admin may grant or change these. */
export const SENSITIVE_PERMISSIONS = new Set<string>(['staff', ...LEVELED_PERMISSIONS.flatMap(p => [p.id, `${p.id}:view`])]);

export function levelOf(permissions: readonly string[] | undefined, key: string): Level {
  if (permissions?.includes(key)) return 'edit';
  if (leveled.has(key) && permissions?.includes(`${key}:view`)) return 'view';
  return 'none';
}

/** `edit` needs full access; `view` also accepts the read-only level. */
export function hasPermission(permissions: readonly string[] | undefined, key: string, mode: 'view' | 'edit' = 'edit') {
  const level = levelOf(permissions, key);
  return level === 'edit' || (mode === 'view' && level === 'view');
}

export function withLevel(permissions: readonly string[], key: string, level: Level): string[] {
  const rest = permissions.filter(p => p !== key && p !== `${key}:view`);
  return level === 'edit' ? [...rest, key] : level === 'view' ? [...rest, `${key}:view`] : rest;
}

/** Drops unknown values and duplicates; keeps at most one level per leveled key. */
export function sanitizePermissions(value: unknown): string[] {
  const list = Array.isArray(value) ? value.filter((p): p is string => typeof p === 'string' && known.has(p)) : [];
  let result = [...new Set(list)];
  for (const key of leveled) if (result.includes(key)) result = result.filter(p => p !== `${key}:view`);
  return result;
}

/**
 * Staff who manage accounts (but are not the main admin) cannot grant, remove
 * or change sensitive permissions: those are kept exactly as before.
 */
export function applyPermissionChange(requested: unknown, existing: readonly string[], canManageSensitive: boolean): string[] {
  const clean = sanitizePermissions(requested);
  if (canManageSensitive) return clean;
  return [...clean.filter(p => !SENSITIVE_PERMISSIONS.has(p)), ...existing.filter(p => SENSITIVE_PERMISSIONS.has(p))];
}

/** Human-readable permission names for audit logs and lists. */
export function describePermission(permission: string): string {
  const [key, mode] = permission.split(':');
  const levelled = LEVELED_PERMISSIONS.find(p => p.id === key);
  if (levelled) return `${levelled.label} (${mode === 'view' ? LEVEL_LABELS.view : LEVEL_LABELS.edit})`;
  return PERMISSIONS.find(p => p.id === key)?.label.split(' (')[0] || permission;
}
