# API reference (live)

This documents the API **as it actually exists right now** (through Phase 5). It's a living reference — update it in place when an endpoint changes, don't append history here (that's [PROGRESS.md](PROGRESS.md)). See [CLAUDE.md](../CLAUDE.md) for the target surface and the rules behind these decisions.

Base URL: `${VITE_API_URL}` (frontend) / `http://localhost:5000/api` (local dev). All request/response bodies are JSON.

Auth: admin routes require `Authorization: Bearer <JWT>`, obtained from `POST /api/auth/login`. All admin/staff writes use zod `.strict()` — an unknown field in the body is rejected with `400`, not silently ignored.

---

## Health

### `GET /health`
Public. `{ status: 'ok' | 'degraded', timestamp }`. `degraded` (503) means MongoDB isn't connected.

---

## Doctors

### `GET /api/doctors`
Public. Active doctors only, public fields only.
```json
{ "status": "success", "data": [{ "id", "name", "specialization", "supportsOnline", "slotDurationMins" }] }
```

### `GET /api/doctors/admin`
Admin only. All doctors, all fields (including `blockedDates`, `weeklySchedule`, `isActive`).

### `PUT /api/doctors/:id/schedule`
Admin only. Body (all optional, `.strict()` — no other fields accepted):
```json
{ "weeklySchedule": { "workingDays": [1,2,3,4,5,6], "windows": [{ "start": "10:00", "end": "14:00" }] },
  "blockedDates": ["2026-12-25"], "isActive": true, "supportsOnline": true }
```
`start`/`end` must be `HH:mm`; each window's `start < end`. Days: `0`=Sunday..`6`=Saturday.

---

## Config & Settings

### `GET /api/config`
Public.
```json
{ "status": "success", "data": {
  "consultationPriceINR": 50000, "consultationPriceDisplay": "₹500.00",
  "modes": ["in_person"], "minNoticeMins": 120, "maxAdvanceDays": 30, "refundWindowHours": 24,
  "paymentsEnabled": false, "holdMinutes": 10
} }
```
`modes` includes `"online"` only when `PAYMENTS_ENABLED=true`; `paymentsEnabled` tells the UI whether to offer "pay now" for in-person bookings. USD fields are never included while `usdEnabled` is false.

### `GET /api/settings/admin`
Admin only. Full `Settings` document.

### `PUT /api/settings`
Admin only. Body (all optional, `.strict()`):
```json
{ "consultationPrice": { "INR": 50000, "USD": 5000 }, "usdEnabled": false,
  "minNoticeMins": 120, "maxAdvanceDays": 30, "holdMinutes": 10, "refundWindowHours": 24 }
```

---

## Availability

### `GET /api/availability?doctorId=<id>&date=<YYYY-MM-DD>`
Public. `date` is interpreted in Asia/Kolkata. Runs hold-expiry cleanup before computing.
```json
{ "status": "success", "data": {
  "doctorId": "...", "date": "2026-11-09",
  "slots": ["2026-11-09T04:30:00.000Z", "2026-11-09T05:00:00.000Z", "..."]
} }
```
`slots` are ISO UTC instants for each free slot's **start**; duration is `doctor.slotDurationMins` (from `/api/doctors`). Excludes slots outside working windows, on blocked dates, inside `minNoticeMins`/beyond `maxAdvanceDays`, or already booked. Empty array (not an error) if the doctor doesn't work that day.

---

## Appointments

### `POST /api/appointments`
Public. Creates a `consultation` appointment. The server derives `slotEnd` and `amountDue` itself — never trust the client for either.
```json
{ "doctorId": "...", "slotStart": "2026-11-09T04:30:00.000Z",
  "mode": "in_person", "paymentMode": "pay_at_clinic",
  "patient": { "name": "...", "phone": "9876543210", "email": "...", "age": 30, "symptoms": "..." } }
```
`consentAccepted: true` is required (and the only thing accepted) when `mode: "online"`.

While `PAYMENTS_ENABLED=false` (production today), only `mode: "in_person"` + `paymentMode: "pay_at_clinic"` can succeed.
| Condition | Response |
|---|---|
| `mode: "online"` with `paymentMode != "pay_now"` | `400` |
| `paymentMode: "pay_now"` while `PAYMENTS_ENABLED=false` | `400` |
| `mode: "online"` without `consentAccepted: true` | `400` |
| doctor not found / inactive | `404` |
| `mode: "online"` but doctor doesn't `supportsOnline` | `400` |
| `slotStart` not a legal slot (wrong grid, outside hours, blocked date, inside min-notice, beyond max-advance) | `400` |
| slot already booked (pre-check, fast path) | `409` |
| slot booked by a concurrent request (DB unique-index catch, the real guarantee) | `409` |
| `pay_now`: Razorpay order creation failed (hold is released immediately) | `502` |

Success, `pay_at_clinic` (`201`):
```json
{ "status": "success", "data": {
  "id", "doctorId", "slotStart", "slotEnd", "mode", "paymentMode", "status": "confirmed",
  "amountDue": 50000, "accessToken": "<64-char hex, shown once>"
} }
```
Success, `pay_now` (`201`): created as `status: "pending_payment"` with `isActiveSlot: true` and `holdExpiresAt = now + Settings.holdMinutes`, and a Razorpay order is created server-side for `Settings.consultationPrice.INR`:
```json
{ "status": "success", "data": {
  "id", "...same fields...", "status": "pending_payment", "holdExpiresAt": "...", "accessToken": "...",
  "payment": { "keyId": "rzp_test_...", "orderId": "order_...", "amount": 50000, "currency": "INR" }
} }
```
The frontend opens Razorpay Checkout with `payment`. The Checkout success callback is **not** trusted: the booking is confirmed only by the `payment.captured` webhook. No confirmation email is sent for `pay_now` yet (Phase 6).

`accessToken` is the one-time raw patient access token — only its SHA-256 hash is stored server-side (`accessTokenHash`). The frontend builds `/booking/<id>?token=<accessToken>` from this and shows it on the confirmation screen (and the confirmation email, when an email was given).

### `GET /api/appointments/:id` — dual-mode: patient (`?token=`) or admin/staff (JWT), same route
Rate-limited (30 req / 15 min / IP) together with the cancel route below.

**As a patient** (`?token=<accessToken>`): a wrong/missing token → `403`. A valid token returns a trimmed, patient-safe view — deliberately excludes `patient.phone`/`email`/`symptoms` and `accessTokenHash` (DPDP minimization: the token holder already has their own contact details):
```json
{ "status": "success", "data": {
  "id", "doctorName", "specialization", "slotStart", "slotEnd", "mode", "paymentMode",
  "paymentStatus", "status", "amountDue", "amountPaid", "amountRefunded", "currency", "meetLink", "patientName",
  "cancellable": true
} }
```
`cancellable` is computed server-side (`status === "confirmed"` and `slotStart - now >= Settings.refundWindowHours`) — the frontend just reads this flag rather than re-deriving the rule.

**As admin/staff** (`Authorization: Bearer <JWT>`, no `?token=`): returns the full document (all fields, `doctorId` populated to `{ _id, name, specialization }`).

### `POST /api/appointments/:id/cancel?token=<accessToken>`
Public, token-gated (no admin equivalent — admins cancel via `PUT /api/appointments/:id` with `status: "cancelled"`). Same rate limit as the GET above.
| Condition | Response |
|---|---|
| missing/invalid token | `403` |
| `status !== "confirmed"` (already cancelled/completed/etc.) | `400` |
| inside `Settings.refundWindowHours` of `slotStart` | `400`, with a message pointing the patient to call the clinic |
| success | `200`, same patient-safe shape as the GET above, `status: "cancelled"`, plus top-level `refund: "refunded" \| "needs_manual_refund" \| "none"` |

The cancel is a single atomic `findOneAndUpdate` (status `confirmed` AND `slotStart >= now + refundWindowHours`), so concurrent or repeated cancels can't both win. A `paid` booking is then refunded in full automatically. If Razorpay rejects the refund, the booking stays cancelled and `paymentStatus` becomes `needs_manual_refund` (shown in the admin dashboard).

### `GET /api/appointments` *(admin/staff)*
Query (zod-validated, bad values → `400`): `status`, `paymentStatus`, `date` (`YYYY-MM-DD`, filters by `slotStart` day), `page`, `limit` (max 200). Paginated list, sorted by `slotStart`, `doctorId` populated to `{ _id, name, specialization }`. The dashboard uses `?paymentStatus=needs_manual_refund&limit=200` for its refund banner.

### `PUT /api/appointments/:id` *(admin/staff)*
Body: `{ "status": "confirmed" | "completed" | "cancelled" | "no_show", "refund"?: boolean }`, nothing else accepted.
- `completed`/`cancelled`/`no_show` unset `isActiveSlot` (frees the slot); `cancelled` also sets `cancelledAt`/`cancelledBy: "admin"`.
- `confirmed` re-claims the slot (`isActiveSlot: true`); `409` if someone else has booked it since.
- Cancelling a `paid` booking **requires** `refund: true` or `refund: false` (`400` otherwise). `refund: true` is admin-only (`403` for staff) and issues a full refund. Response includes `refund: "refunded" | "needs_manual_refund" | "none"`.

### `POST /api/appointments/:id/refund` *(admin only)*
Full refund of `amountPaid - amountRefunded`, at any time and in any status; the booking status is not changed. `404` while `PAYMENTS_ENABLED=false`.
| Condition | Response |
|---|---|
| refunded | `200` with the updated document (`paymentStatus: "refunded"`, `razorpayRefundId`, `amountRefunded`) |
| unpaid / already refunded / refund already in flight | `409` |
| Razorpay rejected it | `502`; `paymentStatus` set to `needs_manual_refund` |

Idempotent: the appointment is claimed atomically (`paymentStatus` in `paid`/`needs_manual_refund`, no `razorpayRefundId`, no live `refundLockedAt`) before Razorpay is called, so only one request can ever issue the refund.

---

## Payments (only mounted when `PAYMENTS_ENABLED=true`; otherwise `404`)

### `POST /api/payments/webhook`
Called by Razorpay. Configure it in the Razorpay dashboard (TEST mode) with events `payment.captured`, `payment.failed`, `refund.failed`, and the same secret as `RAZORPAY_WEBHOOK_SECRET`.
- Body is read raw (`express.raw`, this route only) and the `X-Razorpay-Signature` HMAC-SHA256 is verified on those exact bytes. Missing/invalid signature → `400`.
- Not behind the general `/api` rate limiter (Razorpay retries must never be throttled).
- `payment.captured`: matched by `order_id`. If that `razorpayPaymentId` was already processed → `200`, no-op. If the hold is still active → `status: confirmed`, `paymentStatus: paid`, `amountPaid`, `razorpayPaymentId`. If the hold had already expired (or amount/currency mismatch) → `paymentStatus: needs_manual_refund` with the payment recorded. Never silently dropped.
- `payment.failed`: `paymentStatus: failed` on an unpaid pending booking; the hold is kept so the patient can retry in Checkout.
- `refund.failed`: reverts `amountRefunded`, clears `razorpayRefundId`, sets `needs_manual_refund` so an admin can retry.
- All other events → `200` and ignored. DB errors → `500`, so Razorpay retries.

### `DELETE /api/appointments/:id` *(admin only)*
Hard delete.

---

## Contact (unchanged since Phase 1)

### `POST /api/contact`
Public. `{ name, email, phone?, subject, message }`.

### `GET /api/contact` *(admin/staff)*, `PUT /api/contact/:id` *(admin/staff)*, `DELETE /api/contact/:id` *(admin only)*

---

## Auth

### `POST /api/auth/login`
Public, rate-limited (5 failed attempts / 15 min / IP). `{ email, password }` → `{ token, data: { id, name, email, role } }`.

### `GET /api/auth/me` *(any authenticated user)*

### `PUT /api/auth/updatepassword` *(any authenticated user)*
`{ currentPassword, newPassword }`.

### `POST /api/auth/register` *(admin only)*
`{ name, email, password, role? }`.

---

## Not yet built
- Admin `therapy_session` creation — not yet assigned a phase.
- Google Meet link, transactional email (incl. `pay_now` confirmation), reminders — Phase 6.
