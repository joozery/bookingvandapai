# Slip2Go payments

New checkout: open trip card → LINE login → deposit or full payment → PromptPay QR → upload slip → verified success modal → select seat in the existing booking flow. Sold-out trip cards open Messenger.

`/payments` lists the signed-in customer's orders, including unseated paid orders and outstanding balances. `/tickets` and the booking workspace link here. Payments are stored in integer satang; balances use the order's original price even if the trip price changes.

All shared `DigitalTicket` views display a clickable outstanding-balance overlay over the check-in QR, with a link to `/payments?orderId=<id>&pay=balance`. The link opens that owner's exact invoice and prepares a QR for the full remaining amount. When fully paid, the overlay and payment link disappear, leaving the original check-in QR visible without a paid badge. Legacy tickets without a verified order do not invent a paid/unpaid status. Booking APIs add only an authenticated owner's payment summary (or an authorized, non-blocked booking/check-in admin's summary); keys and verification receiver snapshots are excluded. Replacement seats can resolve the same payment by owner and trip. The tickets page refreshes amounts when focus returns after payment in another tab.

## Configuration

The admin UI is at **Admin → ตั้งค่าเว็บไซต์ → ตั้งค่าชำระเงิน · Slip2Go** (`/admin/settings`). Only the main admin or a currently authorized staff member with `settings` permission can read, save, or test these settings. Blocked staff cannot access them. The connection test calls `/api/account/info` only; it does not create a QR or verify a slip.

Admin settings are saved in the private Mongo `privateSettings` collection. They are separate from the public homepage settings. Replacement API keys are encrypted using AES-256-GCM with a key derived from `PAYMENT_ENCRYPTION_KEY` (or `NEXTAUTH_SECRET` as fallback). Keep that environment key stable across deployments. The browser receives only `hasSecret`, never the stored API key. A blank replacement keeps the current key. The API host is restricted to `https://connect.slip2go.com` to prevent credentials being sent to arbitrary hosts.

The following environment variables provide initial defaults until the corresponding admin settings are saved. Keep `SLIP2GO_SECRET_KEY` in the deployment environment if using the original environment key. Never prefix secrets with `NEXT_PUBLIC_` and do not send the secret in chat.

```dotenv
# Leave off until receiver configuration and a real small-value test pass.
PAYMENTS_ENABLED=false
SLIP2GO_API_URL=https://connect.slip2go.com
SLIP2GO_SECRET_KEY=<secret from API Connect>
PAYMENT_PROMPTPAY_TYPE=phone_number
PAYMENT_PROMPTPAY_ID=<10-digit phone, no separators>
PAYMENT_ACCOUNT_NAME=<actual receiver account name>
PAYMENT_RECEIVER_TYPE=02001
PAYMENT_RECEIVER_ACCOUNT=<receiver ID to validate against>
```

For citizen ID PromptPay use `citizen_id` with a 13-digit ID and receiver type `02003`. For wallet use `e_wallet` with 15 digits and receiver type `02004`. Phone PromptPay uses `02001`. The admin panel offers a button to copy the configured PromptPay identity to the receiver fields. `PAYMENT_RECEIVER_TYPE` and `PAYMENT_RECEIVER_ACCOUNT` must identify the account that actually receives the QR payment; confirm with a real slip. No receiver is accepted from customer requests.

Supports the existing standalone MongoDB deployment as well as replica sets. No sessions or multi-document transactions are used. A private `paymentCapacity` document per trip serializes reservations with revision-based compare-and-set (CAS). The application creates unique indexes on order ID, bank/transaction reference, and booking payment-order ID. No provider requests or real payments occur during unit tests.

Verified receipts are persisted before changing the order balance. The order update atomically checks the original invoice timestamp, expected paid amount, invoice amount and receipt reference. `appliedReceipts` prevents duplicate credit, including after a lost response. An extra transfer for an already consumed invoice is retained for review rather than silently counted toward another invoice. GET order/list, checkout creation and paid seat selection recover interrupted receipts automatically.

Seat selection stores a durable booking claim in the paid order before claiming the physical seat. The seat update is conditional, the ticket uses a stable ID, and the capacity hold is released only after the ticket and order binding are persisted. A failed seat choice is fenced on the van document before clearing the claim, so a delayed old worker cannot take that seat after the customer selects another. GET order/list recovers interrupted seat claims and releases completed holds. This is a recoverable multi-step workflow, not an all-or-nothing transaction; interrupted work can temporarily hold extra capacity until the owner reopens the order. Admin/manual seat operations must preserve `rejectedPaymentClaims` and honor occupied seats; arbitrary direct database changes bypass application coordination.

The UI and routes are implemented, but live QR creation/verification requires these settings. New customer bookings in `/api/bookings` always require the authenticated owner's verified payment, including while checkout is switched off. Switching off checkout cannot turn this into a free-booking route. Already paid customers can still select their seat. Existing bookings continue to use their existing transfer/approval workflow and are not charged retroactively. Database settings take precedence over environment defaults. Availability continues to subtract outstanding payment holds while checkout is off.

## Rules

- A new order reserves one unit of capacity for 30 minutes; a seat is chosen after successful payment. Concurrent checkouts use the trip capacity document revision; physical seat updates remain conditional. Pending capacity retains an initial order snapshot so an interrupted first order write can be recreated.
- A paid order without a selected seat retains its capacity. Returning to `/payments` allows seat selection without paying again.
- Deposit is the trip's `depositAmount` (baht, set per trip in **Admin → จัดการทริป**). When blank/zero, or not below the price, it is 50% rounded up to the nearest satang. Remaining balance is the order's total minus verified payments. Changing a trip's price or deposit affects new orders only.
- Balance is due **24 hours before the configured Bangkok departure time**. This interpretation is pending the owner's confirmation. Inside the final 24 hours only full payment is offered for new orders. Late balances remain payable before departure and display an overdue notice; the system does not silently cancel a paid booking or issue refunds.
- An order is bound to the authenticated LINE user, not a browser-supplied user ID. A paid order can create only one seat booking.
- Receiver validation includes the configured PromptPay identity used to generate the QR, plus the explicitly configured bank account (without duplicates). Slip2Go accepts a match to either authorized recipient. Some slips identify the recipient only as an MSISDN proxy and do not return a bank account; requiring only a bank account would reject those legitimate PromptPay payments. This does not disable receiver validation.
- Each newly generated QR stores a private `verificationReceivers` snapshot. Reopening that invoice reuses its QR and snapshot; changing shop settings cannot silently change its verification identity. Crediting the payment clears both before creating a separate balance invoice. Older invoices without a snapshot use the configured recipients.
- Only Slip2Go code `200200` is accepted when sending validation conditions. Found-only, queue, receiver mismatch, amount mismatch and invalid responses never grant booking rights. The amount and transfer time are also checked locally.
- Provider duplicate checking is deliberately disabled to allow retries after network failures. A **unique database index on sender-bank + transfer reference** prevents using a transfer for a different order. The durable receipt and atomic invoice update make a retry safe after a process/network failure.
- A verified transfer after its unpaid hold expired is recorded with `reviewRequired: true` in `paymentReceipts`; order becomes `expired` and shows a contact-admin message rather than granting capacity that may have been sold. No second payment is required or automatically requested. Such orders block a new checkout until resolved.
- Receipt records retain transaction reference, provider reference, timestamp and amount. Slip images are sent to Slip2Go for verification but are not saved in public storage.
- Verification is limited to one concurrent request per order, one attempt per 10 seconds and 20 attempts per order. Exhausted attempts require admin help.

## Verification before enabling

1. Confirm API host, secret, package quota / IP allowlist and receiver mapping with the shop owner.
2. Run `node --test tests/payments.test.cjs tests/payment-settings.test.cjs`, `npx tsc --noEmit`, then build. To test actual MongoDB behavior without touching live data, run `node scripts/test-standalone-payments.cjs`: it uses disposable prefixed collections and synthetic verification results, makes no Slip2Go calls, and removes its collections in `finally`.
3. In an isolated test trip with a small real amount, verify both full and deposit flows, receiver and amount mismatch, slip replay across accounts, balance payment, page refresh after payment, competing checkouts for the last place, and final seat selection.
4. Verify the balance deadline rule with the owner before launch. Enable payments in the admin settings only once the real flow passes.
5. Support staff can reconcile exceptional payments through the private Mongo `paymentOrders` and `paymentReceipts` collections. Automated refunds, automatic cancellation and payment reminder messages are not included.

## Admin payment tools

**Admin → การชำระเงิน** (`/admin/payments`) requires the main admin or the new `payments` staff permission (grant it in ทีมงาน / ผู้จัด). Every API re-checks the permission in the database.

- **History and status** – one row per order: amount owed, paid, balance and state (`รอชำระ`, `ชำระบางส่วน`, `ชำระครบถ้วน`, `รอแอดมินตรวจสอบ`, `หมดเวลา (ไม่ได้ชำระ)`). Expanding a row shows each verified transfer, verification errors, amount edits and seat moves.
- **Search** – customer name, nickname, phone, LINE name, seat, trip, order ID, transfer reference or the payer name on the slip; filter by trip and state.
- **Recorded per transfer** (`paymentReceipts`) – transfer reference, date/time, amount, payer name and bank from the slip, registrant name, trip name and seat at the time of payment. Older receipts recorded before this change have no payer/registrant/seat fields.
- **Edit amount owed** – `PATCH /api/admin/payments/:id` with a mandatory reason. Allowed only after a verified first payment, never below the paid amount and never while a slip is being verified. The balance and state are recalculated; any unpaid balance QR is withdrawn, so ask the customer to press ชำระยอดคงเหลือ again rather than paying the old QR. Every edit is kept in `adjustments`.
- **Excel export** – `GET /api/admin/payments/export` downloads an `.xlsx` with the current filters: sheet สรุปการชำระเงิน (one row per order + totals) and รายการโอนเงิน (one row per transfer).
- **Seat move** – the ย้ายที่นั่ง button in การจองและลูกทริป (`POST /api/admin/bookings/:id/move`, `bookings` or `vans` permission). The target seat is claimed with a conditional update, then the booking moves (same booking ID, so tickets and check-in QR keep working), the old seat is freed and the linked payment order's `seat` and `seatHistory` are updated. Approving a customer's seat-change request also moves the payment link to the replacement booking.

Verification: `node --test tests/payment-admin.test.cjs` (deposit/state rules) and `node scripts/test-admin-payments.cjs` (history, search, amount edits, seat moves and the Excel file against disposable Mongo collections that are dropped afterwards).

Official references:

- https://slip2go.com/guide/authentication
- https://slip2go.com/guide/rest-api/promptpay-qr
- https://slip2go.com/guide/rest-api/base64
- https://slip2go.com/guide/response
