# Progress log

Phase-by-phase history of the booking/payments build. See [CLAUDE.md](../CLAUDE.md) for the current spec and rules; this file is the record of what was actually done and when. Newest entry on top.

---

## Phase 3 — New Appointment schema, availability endpoint, hold expiry
**Done: 2026-11-08** · Branch: `phase-3-appointment-schema`

**What was built**
- Replaced the old flat `Appointment` schema with the target schema: `doctorId` ref, `slotStart`/`slotEnd` (UTC), `mode`/`paymentMode`, `currency`/`amountDue`/`amountPaid`/`amountRefunded`, `paymentStatus`, the new `status` enum (`pending_payment`/`confirmed`/`completed`/`cancelled`/`no_show`), `isActiveSlot`, `holdExpiresAt`, Razorpay id fields (unused until Phase 5), `patient: {...}` sub-document, `consentAcceptedAt`, `accessTokenHash`, `cancelledAt`/`cancelledBy`.
- The double-booking guard: a unique index on `(doctorId, slotStart)` with `partialFilterExpression: { isActiveSlot: true }`. Verified under real concurrency (5 simultaneous bookings for one slot → exactly one `201`, four `409`s).
- `GET /api/availability?doctorId&date` — computes free slots from the doctor's weekly schedule/blocked dates (Asia/Kolkata, fixed UTC+5:30) and `Settings.minNoticeMins`/`maxAdvanceDays`, minus already-booked slots.
- Hold expiry: `expireStaleHolds()` run as a lazy check on every availability/create request, plus a best-effort 5-minute `setInterval` in `server.ts` (Render's free tier sleeps, so the lazy check is the real guarantee).
- `POST /api/appointments` rewritten: zod `.strict()` validation, slot legality re-derived server-side (client only sends `slotStart`, never the price or a "this slot is valid" claim), a patient access token generated and only its SHA-256 hash stored.
- Admin `PUT /api/appointments/:id` now supports `status` transitions only (`confirmed`/`completed`/`cancelled`/`no_show`), correctly unsetting `isActiveSlot`.

**Files touched:** `backend/src/models/Appointment.model.ts`, `backend/src/controllers/appointment.controller.ts`, `backend/src/routes/appointment.routes.ts`, new `backend/src/controllers/availability.controller.ts` + `backend/src/routes/availability.routes.ts`, new `backend/src/utils/{slots,holdExpiry,token}.util.ts`, `backend/src/utils/email.util.ts` (updated for the new shape), `backend/src/server.ts`.

**Decided with the user before building:**
- Backend-only this phase — `Booking.tsx` and `Dashboard.tsx` were explicitly left unupdated and will error against the new API until Phase 4. Confirmed acceptable since this isn't live-traffic-critical yet.
- No data migration — the `appointments` collection held only test documents, confirmed disposable.

**Manually verified** (no automated suite yet — that's Phase 7): valid booking succeeds with server-computed price; repeat/concurrent booking of one slot is rejected safely; online mode rejected while `PAYMENTS_ENABLED=false`; online+pay_at_clinic rejected; online without consent rejected; slot outside working hours/on a blocked date/inside min-notice rejected; client-supplied `amountDue`/`status` rejected by strict validation; availability correctly excludes booked/blocked slots and includes a slot freed by admin marking it `completed`.

**Left undone (by design):** `Booking.tsx`/`Dashboard.tsx` rework (Phase 4), patient token-gated `GET`/cancel routes (Phase 4), admin `therapy_session` creation, Razorpay integration (Phase 5), automated tests (Phase 7).

---

## Phase 2 — Doctor + Settings models, seed script, public API
**Done: 2026-11-08** · Branch: `phase-2-doctors-settings` (merged to `master`)

**What was built**
- `Doctor` model: `name`, `specialization`, `isActive`, `slotDurationMins`, `weeklySchedule.{workingDays, windows}` (HH:mm, validated), `blockedDates`, `supportsOnline`.
- `Settings` singleton model (enforced via a fixed key + `findOneAndUpdate`/upsert helpers, never a second document): `consultationPrice.{INR, USD}`, `usdEnabled`, `minNoticeMins`, `maxAdvanceDays`, `holdMinutes`, `refundWindowHours`.
- Idempotent seed script (`npm run seed`, uses `$setOnInsert` so re-running never overwrites admin edits) — seeded one real doctor, **Dr. Saraswathi Sharma**, with placeholder schedule/specialization, and placeholder Settings values.
- Public API: `GET /api/doctors` (active only, public fields), `GET /api/config` (price, available modes given `PAYMENTS_ENABLED`, notice/advance window — never exposes USD fields while `usdEnabled` is false).
- Admin API: `GET /api/doctors/admin`, `PUT /api/doctors/:id/schedule`, `GET /api/settings/admin`, `PUT /api/settings` — all zod `.strict()` whitelisted, `protect` + `authorize('admin')`.
- `PAYMENTS_ENABLED` env flag added (default `false`), no Razorpay vars required yet.
- `Booking.tsx`: removed the hardcoded `doctors`/`services` arrays; now fetches `/doctors` + `/config`, auto-assigns the single active doctor, shows the real price, has a loading/error state. (`timeSlots` stayed hardcoded with a `// TODO(Phase 3)` marker — resolved in Phase 3's availability endpoint, though `Booking.tsx` itself doesn't consume it yet.)

**Files touched:** new `backend/src/models/{Doctor,Settings}.model.ts`, `backend/src/controllers/{public,doctor,settings}.controller.ts`, `backend/src/routes/{doctor,config,settings}.routes.ts`, `backend/src/scripts/seed.ts`; modified `backend/src/config/env.ts`, `backend/src/server.ts`, `backend/package.json`, `src/pages/Booking.tsx`.

**Manually verified:** seed run twice confirmed idempotent (same `_id`s, no duplicates); `/doctors` and `/config` return only intended public fields; unauthenticated admin routes `401`; an extra/unknown field on an admin write `400`s; valid admin writes `200`.

**Left undone (by design):** `Appointment` schema untouched (Phase 3), `Doctors.tsx` marketing content untouched, no admin UI for editing doctors/settings (API only).

---

## Phase 1 / 1a — Security fixes
**Done: 2026-11-08** · Branch: `phase-1a-security` (merged to `master`)

**What was built**
- zod-validated env loading (`backend/src/config/env.ts`) — server crashes on startup if any required var is missing, no `|| ''` fallbacks.
- Fixed a mass-assignment vulnerability in appointment/contact creation (raw `req.body` was being passed to Mongoose in places).
- Auth hardening in `auth.middleware.ts`/`auth.controller.ts`.
- Login rate limiting (5 failed attempts / 15 min / IP).
- Centralized `API_URL` in `src/lib/api.ts` (previously hardcoded per-call).
- `ProtectedRoute` component (`src/components/ProtectedRoute.tsx`) for the admin dashboard route.

**Known deferral:** moving the admin JWT from `localStorage` to an HTTP-only cookie was scoped as **Phase 1b** and explicitly deferred — the frontend (Vercel) and backend (Render) are cross-site today, so a cookie would be blocked by the browser. Revisit once there's a same-site setup (a Vercel rewrite proxying `/api`, or a shared custom domain). Mitigated for now by keeping JWT expiry short.

**Left undone (by design):** cookie auth (Phase 1b, blocked on infra), automated test for the rate limiter (manual curl only).
