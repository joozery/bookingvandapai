# Admin permissions and audit log

## Permission levels

Permissions are stored on each admin record (`admins.permissions`). Menus such as trips or bookings are on/off. Three sensitive areas have levels, set per admin in **ทีมงาน / ผู้จัด**:

| Area | Key | ไม่สามารถเข้าถึง | ดูได้อย่างเดียว | ดูและแก้ไขได้ |
|---|---|---|---|---|
| ระบบชำระเงิน | `payments` | – | `payments:view` | `payments` |
| ระบบบัญชีรายรับ–รายจ่าย | `accounting` | – | `accounting:view` | `accounting` |
| ตั้งค่าการรับเงิน / QR Code | `payment-settings` | – | `payment-settings:view` | `payment-settings` |

- An existing record with the plain key (e.g. `payments`) keeps full access.
- View-only users see data and can export Excel. Edit buttons are hidden and every change API returns 403.
- **Payment receiver / QR settings** require `payment-settings`. The general `settings` permission (website settings) no longer includes them. The Slip2Go key is never sent to the browser.
- **Only the main admin** (`username = admin`) can grant, remove or change these levels or the `staff` permission. Staff with `staff` can manage ordinary accounts. Sensitive permissions they send are ignored, and they cannot edit, block, delete or change the password of the main admin or any account holding sensitive access. The main admin cannot be blocked or deleted.
- Permissions are re-read from the database on every API call, so changes and blocks apply immediately. The sidebar uses the login session and refreshes on the next login.

Code: `src/lib/permissions.ts` (levels, shared with the UI) and `src/lib/adminAuth.ts` (`requireAdmin(perms, 'view' | 'edit')`, `requireMainAdmin`).

## Audit log

Every admin change is appended to the `auditLogs` collection (`src/lib/audit.ts`). Each record includes:

- who made the change (name, username, id)
- the date and time
- the type (เพิ่ม / แก้ไข / ลบ) and the type of data
- a readable summary
- before/after values per field
- the IP address when available

Covered: admin accounts and permissions, own profile, payment amount edits, payment/QR settings, accounting entries/categories/partners/reimbursements, trips, vans and seats, booking approval/rejection/check-in/insurance/delete, seat moves, website settings, customer profile edits and roles, review visibility, leaderboard visibility, file uploads/deletes, and database reset.

Not logged: customers' own actions (booking, paying, profile requests).

Hidden in the log:
- passwords, keys and secrets
- national ID numbers (only the last 4 digits)

Only changes that succeed are logged. A logging failure is reported to the server log and never blocks the change.

**Admin → ประวัติการใช้งาน** (`/admin/audit`, `GET /api/admin/audit-logs`) is main-admin only. It shows the newest records first, 50 per page. Each record expands to the before/after table. Filters: person, data type, text search and date range (Bangkok dates). The log has no edit or delete function in the app.

## Verification

`node --test tests/permissions.test.cjs tests/payment-settings.test.cjs` (levels, sensitive-permission rules, secret masking, read-only QR settings) and `node scripts/test-audit-permissions.cjs`. The script runs the real admin-account route and audit log against disposable Mongo collections, which it drops afterwards.
