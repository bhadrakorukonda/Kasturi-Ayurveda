# API reference (live)

This documents the API **as it actually exists right now** (through Phase 3). It's a living reference — update it in place when an endpoint changes, don't append history here (that's [PROGRESS.md](PROGRESS.md)). See [CLAUDE.md](../CLAUDE.md) for the target surface and the rules behind these decisions.

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
  "modes": ["in_person"], "minNoticeMins": 120, "maxAdvanceDays": 30, "refundWindowHours": 24
} }
```
`modes` includes `"online"` only when `PAYMENTS_ENABLED=true`. USD fields are never included while `usdEnabled` is false.

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

**Currently, only `mode: "in_person"` + `paymentMode: "pay_at_clinic"` can succeed** — every other combination is rejected because `PAYMENTS_ENABLED=false`:
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

Success (`201`):
```json
{ "status": "success", "data": {
  "id", "doctorId", "slotStart", "slotEnd", "mode", "paymentMode", "status": "confirmed",
  "amountDue": 50000, "accessToken": "<64-char hex, shown once>"
} }
```
`accessToken` is the one-time raw patient access token — only its SHA-256 hash is stored server-side (`accessTokenHash`). Nothing currently consumes this token (the patient token-gated routes are Phase 4) — hang onto it if you need it for testing ahead of that.

### `GET /api/appointments` *(admin/staff)*
Query: `status`, `date` (filters by `slotStart` day), `page`, `limit`. Paginated list, sorted by `slotStart`.

### `GET /api/appointments/:id` *(admin/staff)*

### `PUT /api/appointments/:id` *(admin/staff)*
Body: `{ "status": "confirmed" | "completed" | "cancelled" | "no_show" }` — nothing else accepted. Transitioning to `completed`/`cancelled`/`no_show` unsets `isActiveSlot` (frees the slot); `cancelled` also sets `cancelledAt`/`cancelledBy: "admin"`. No refund logic yet (Phase 5).

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
- `POST /api/payments/webhook` — Phase 5.
- `GET /api/appointments/:id?token=` / `POST /api/appointments/:id/cancel?token=` (patient-facing, token-gated) — Phase 4.
- Admin `therapy_session` creation — not yet assigned a phase.
- Refund endpoints — Phase 5.
