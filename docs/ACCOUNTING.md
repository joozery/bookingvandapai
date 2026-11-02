# Accounting (บัญชีรายรับ–รายจ่าย)

**Admin → บัญชีรายรับ–รายจ่าย** (`/admin/accounting`). Requires the main admin or the `accounting` staff permission (grant it in ทีมงาน / ผู้จัด). All APIs under `/api/admin/accounting` re-check it.

## Screens

| View | Contents |
|---|---|
| ภาพรวม | Open/closed trips, total income (customer payments + other), total expenses (per trip + overhead), profit/loss, outstanding customer balances, amounts owed to partners. |
| บัญชีรายทริป | One trip: passengers, income and expense by category, profit/loss and margin, cost per passenger, outstanding balances, the trip's entries. |
| รายรับ | Customer payment income per trip (automatic), **search a customer's payment history by name or phone**, and other income entries (add / edit / delete). |
| รายจ่าย | Expense entries (add / edit / delete) per trip or overhead, with category management (add / rename / delete). |
| หุ้นส่วน | Partners, profit share %, out-of-pocket advances, reimbursements and compensation. |
| รายงาน | Overall P&L, per-trip report with totals, totals by category, Excel export. |

## Rules

- Amounts are stored in integer satang. Entries have a date, category, optional trip (none = overhead/ส่วนกลาง) and description.
- **Customer payments are linked automatically**: income per trip = verified paid amounts in `paymentOrders` (including transfers awaiting admin review); outstanding = unpaid balance of orders that have paid a deposit. Abandoned checkouts are ignored. Nothing is copied, so payment changes appear immediately.
- Trip fees received outside the payment system (e.g. bookings before it existed) should be entered as income in **ค่าทริป (รับนอกระบบ)**.
- Default expense categories: ค่ารถ, ค่าไกด์, ค่าลูกหาบ, ค่าธรรมเนียม, ค่าอาหาร, ค่าอุปกรณ์, ค่ารถตู้, ค่าน้ำมัน, ค่าตอบแทนหุ้นส่วน, อื่น ๆ (seeded on first use). Deleting a category moves its entries to that type's **อื่น ๆ**; system categories (อื่น ๆ, ค่าตอบแทนหุ้นส่วน) cannot be deleted.
- **Advance (เงินสำรองจ่าย)**: an expense whose “ผู้จ่ายเงิน” is a partner. It counts as a business expense and as money owed to that partner.
- **Reimbursement (การเบิกคืน)**: recorded per partner; reduces what is owed. It is not an expense (the expense was already counted).
- **Compensation (ค่าตอบแทน)**: an expense in ค่าตอบแทนหุ้นส่วน with the receiving partner.
- **Profit share** = overall net profit × partner share % (for reference; shares may total at most 100%). A partner with entries cannot be deleted.
- Entries for a deleted trip are kept and still counted.

Collections: `accountCategories`, `accountEntries`, `partners`, `partnerTransactions`.

## Verification

`node --test tests/accounting.test.cjs` (calculations) and `node scripts/test-accounting.cjs` (storage, validation, payment linkage and the Excel file against disposable Mongo collections dropped afterwards).

## Access control

Every API route checks the caller (`src/lib/adminAuth.ts`):

- Staff APIs use `requireAdmin([...permissions])`; the main admin (`username = admin`) always passes, blocked staff never do.
- Customer data (`/api/bookings?lineUserId=`, `/api/bookings/:id`, `/api/profile`, `/api/profile/requests`) is limited to the signed-in LINE owner or staff. A customer may only request cancellation of their own booking.
- Still public by design: trip list, homepage settings, seat maps (nickname only), public reviews, leaderboard, holidays, the Messenger webhook (signature-verified), and public files in storage. Pending profile edits in storage require staff.
- `/api/db-reset` is disabled in production and limited to the main admin elsewhere.
- `/scanner` (check-in) now needs a staff login with `checkin` or `bookings` permission.
