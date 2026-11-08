# Progress log

Phase-by-phase history of the booking/payments build. See [CLAUDE.md](../CLAUDE.md) for the current spec and rules; this file is the record of what was actually done and when. Newest entry on top.

---

## Phase 5 — Razorpay orders, webhook, idempotency, refunds (TEST mode, behind the flag)
**Done: 2026-11-08** · Branch: `phase-5-razorpay`

**What was built**
- **No new dependency.** Razorpay is called through its REST API with Node's built-in `fetch` + `crypto` (`backend/src/utils/razorpay.util.ts`): create order, create refund, verify webhook HMAC. The official SDK would only have wrapped those three calls.
- **Env:** `PAYMENTS_ENABLED` is now strictly `"true"`/`"false"` (a typo crashes startup instead of silently meaning "off"). With it `true`, `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` are required. Extra guard: an `rzp_live_` key outside `NODE_ENV=production` refuses to start.
- **`pay_now` booking:** created `pending_payment` + `isActiveSlot` + `holdExpiresAt`, then a server-side Razorpay order for `Settings.consultationPrice.INR`. If order creation fails the hold is released at once and the API returns `502`.
- **Webhook** `POST /api/payments/webhook`: raw body (`express.raw` on this route only), mounted before `express.json()` and the general rate limiter, only when the flag is on. Handles `payment.captured` (the ONLY path to `confirmed` for `pay_now`), `payment.failed`, `refund.failed`; ignores the rest with `200`. Idempotent on `razorpayPaymentId`. A payment landing after its hold expired is recorded and flagged `needs_manual_refund`.
- **Refunds** (`backend/src/utils/refund.util.ts`): one helper used by patient cancel, admin cancel, and the new admin `POST /api/appointments/:id/refund`. Claims the appointment atomically before calling Razorpay, so it can never refund twice. Razorpay failure → `needs_manual_refund`, never lost.
- **Patient cancel** is now a single atomic claim (status + 24h rule in one query), then auto-refund if paid.
- **Admin `PUT`**: cancelling a paid booking requires an explicit `refund: true|false`; `refund: true` is admin-only. `confirmed` now re-claims the slot (see bug below). List endpoint gained a zod-validated `paymentStatus` filter.
- **Model:** added internal `refundLockedAt` (refund in-flight lock, not in the CLAUDE.md data model; it's bookkeeping only), plus indexes on `razorpayRefundId` and `paymentStatus`.
- **Frontend:** `src/lib/razorpay.ts` loads hosted Checkout on demand. `Booking.tsx` offers pay-now/pay-at-clinic for in-person (when payments are on), always pay-now for online, opens Checkout, and has a "complete your payment / slot held until…" screen with retry if Checkout is closed. `BookingStatus.tsx` polls while `pending_payment` (3s, up to ~2 min), shows real payment/refund state, and mentions the refund in the cancel dialog. `Dashboard.tsx` has a red "payments need a refund" banner (fetched separately so pagination can't hide one), a Refund button, a cancel-a-paid-booking dialog (refund / no refund), and now shows errors on failed status changes instead of failing silently.

**Bug fixed on the way (from Phase 3):** admin setting a cancelled appointment back to `confirmed` didn't set `isActiveSlot`, so the slot could be double-booked. Now it re-claims the slot, with `409` if it's been taken.

**How this was verified:** an end-to-end script against the real backend + local MongoDB, with a test-only fetch preload (kept outside the repo) standing in for `api.razorpay.com`. **52/52 checks passed**, covering: signature rejection; confirm-by-webhook only; duplicate deliveries are no-ops; `payment.failed` then a retry still confirms; expired hold + late payment → `needs_manual_refund` and recorded; patient cancel 24h+ refunds exactly once; 5 concurrent cancels → one `200`, one Razorpay refund call; inside 24h rejected; admin cancel requires refund choice; double refund → `409`; Razorpay refund failure → flagged, admin retry works; `refund.failed` webhook reverts and allows retry; order failure releases the slot; client-supplied amount rejected; online without consent / online + pay-at-clinic rejected. Separately confirmed: missing Razorpay vars, a live key in dev, and a typo'd flag all crash startup; with the flag off, online/pay_now → `400`, webhook and refund routes → `404`, pay-at-clinic still `201`. Server log checked: ids only, no patient data or secrets. Frontend `vite build` passes. Test data deleted afterwards.

**Not verified yet (needs real Razorpay TEST keys):** the actual Checkout popup in a browser, a real `payment.captured` from Razorpay's servers to a public webhook URL, and a real refund. See the testing steps in the handoff.

**Left undone (by design):** confirmation email for `pay_now` bookings and Meet links (Phase 6 — see the open question about the access token below); automated test suite (Phase 7). Open question for Phase 6: the confirmation email needs the patient's manage link, but only the token's hash is stored, so the webhook can't rebuild the link.

---

## Phase 4 — Booking UI rework, patient token page, cancel flow
**Done: 2026-11-08** · Branch: `phase-4-booking-ui`

**What was built**
- `Booking.tsx` fully reworked to match the Phase 3 API: real slots from `/api/availability` (replacing the hardcoded `timeSlots`), doctor selection now carries `doctorId` (not name), a mode selector + consent checkbox that only render when `config.modes.length > 1` (today `PAYMENTS_ENABLED=false` so only `in_person` shows, matching CLAUDE.md's "hidden in the UI" rule), calendar bounds derived from `config.maxAdvanceDays`, and a working confirmation screen with a link to the new patient page.
- New `backend` dual-mode route: `GET /api/appointments/:id` now serves either an admin (JWT) or a patient (`?token=`) depending on which is presented, via `patientAccess.middleware.ts` (`optionalPatientToken` → `maybeAdminAuth`, composed from the existing `protect`/`authorize` as plain function calls since they already send their own response and skip `next()` on failure).
- New `POST /api/appointments/:id/cancel?token=` (patient-only, rate-limited 30 req/15min/IP): enforces `status === 'confirmed'` and the `refundWindowHours` rule server-side: inside the window, the API itself rejects with `400`, not just the UI.
- New `src/pages/BookingStatus.tsx` at route `/booking/:id` — shows live status/time/doctor/payment info, a Cancel button gated by a server-computed `cancellable` flag (never trust the client to compute this), with an `AlertDialog` confirmation.
- `token.util.ts` gained `verifyPatientAccessToken` (constant-time compare via `crypto.timingSafeEqual`).
- Confirmation emails now include a "View or cancel your booking" link with the raw token.
- `Dashboard.tsx` fixed to the new schema (patient sub-object, populated doctor name, new status enum) — this had been left broken since Phase 3 by deliberate prior agreement; fixing it was explicitly brought into Phase 4's scope after confirming with the user.

**Files touched:** `backend/src/utils/token.util.ts`, new `backend/src/middleware/patientAccess.middleware.ts`, `backend/src/controllers/appointment.controller.ts`, `backend/src/routes/appointment.routes.ts`, `backend/src/utils/email.util.ts`; `src/pages/Booking.tsx` (rework), new `src/pages/BookingStatus.tsx`, `src/App.tsx`, `src/pages/Dashboard.tsx` (fix).

**Caught during verification — a real bug, not a test artifact:** the 3 old pre-Phase-3 test documents still sitting in the `appointments` collection had no `patient` sub-object, and `Dashboard.tsx`'s row rendering did `apt.patient.name` unconditionally — it crashed the whole admin dashboard (`TypeError: Cannot read properties of undefined`) the moment a legacy document appeared in the list. Fixed two ways: made the table defensive against missing/legacy fields (`apt.patient?.name ?? "—"`, etc., can't recur), and deleted those 3 confirmed-disposable test documents (per the user's Phase 3 confirmation that the collection held no real bookings).

**How this was verified:** full browser-driven run via Playwright (no project run-skill existed yet, so one was improvised with the project's actual dev servers — `npm run dev` on both sides — rather than curl alone, since this was a UI-heavy phase). Confirmed: real-slot booking end to end → `201`; the resulting manage link renders correct status/doctor/time; a near-term booking (<24h out) correctly hides the Cancel button and shows the "too close to cancel online" message; a far-future booking's Cancel button works and actually cancels (slot freed); a tampered token on the manage link gets a clean `403`; the admin dashboard renders all of the above with the right fields after the bug fix above.

**Left undone (by design):** Razorpay (Phase 5) — the `online`/`consentAccepted` code path is built and will take effect once `PAYMENTS_ENABLED=true`, but isn't end-to-end testable until Phase 5 adds order creation; Google Meet link, Resend/Brevo email provider switch, scheduled reminders (Phase 6); admin `therapy_session` creation UI; automated test suite (Phase 7).

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
