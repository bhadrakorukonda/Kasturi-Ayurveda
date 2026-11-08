# Kasturi Ayurveda: Booking, Payments, Online Consultations

This file is the source of truth for the booking/payments build. Follow it exactly. If a task conflicts with this file, stop and ask instead of improvising.

## Current status
Phase 1 (security fixes) is **DONE as of 2026-11-08**. Phase 1b (cookie auth) is **DEFERRED** — see "Phases" below. Phase 2 (Doctor + Settings models, seed script, public API) is **DONE as of 2026-11-08**. Phase 3 has not been started.

## Product scope (decided)
- ONE bookable, payable product: a **Consultation**, 30 minutes, **in-person or online**, fixed price (INR).
- **Therapies / Panchakarma are NOT bookable or payable online.** They are informational pages. Patients book a consultation first; therapies are planned and priced there. Staff may create therapy-session appointments from the admin dashboard (pay at clinic, no online payment).
- **One doctor today**, model must support more. UI hides the doctor picker while only one active doctor exists and auto-assigns her.
- **INR only for v1.** USD / international patients are deferred. Store `currency` on prices and appointments so USD can be added later without a rewrite. Do NOT build USD flows now.
- **Email-only notifications** for v1 (confirmation, reminder, cancellation, refund).
- Same working hours every working day (one weekly template), editable days off.

## Stack (do not change)
- Frontend: React 18 + Vite + TypeScript + Tailwind + shadcn/ui (`src/`)
- Backend: Express + Node + TypeScript + Mongoose (`backend/src/`)
- DB: MongoDB Atlas. Frontend on Vercel, backend on Render.

## Working rules
- One phase at a time. Do not start a later phase unless asked.
- Never modify files outside the scope of the current phase.
- No new dependency without stating why. Prefer what's already installed.
- Validate every request body server-side with zod. No raw `req.body` into Mongoose.
- Never trust the client for price, payment status, or slot availability.
- Never log secrets, tokens, or patient symptoms.
- After each phase: list files changed, how to test manually, and anything left undone.

## Feature flag: PAYMENTS_ENABLED
- Env var, default `false`. Real Razorpay KYC is not done yet, so production runs with it off until go-live.
- When `false`: online mode is rejected server-side AND hidden in the UI; only `in_person` + `pay_at_clinic` bookings work; payment routes return 404; Razorpay env vars are NOT required at startup.
- When `true`: all Razorpay env vars become required at startup.
- Build and test everything with Razorpay TEST-mode keys. Never put live keys in the repo or in test fixtures.

## Hard security rules
- Server must crash on startup if any always-required env var is missing (`JWT_SECRET`, `MONGODB_URI`, `FRONTEND_URL`, email provider key). Razorpay vars (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) are required only when `PAYMENTS_ENABLED=true`. No `|| ''` fallbacks.
- No default credentials anywhere.
- Card/UPI data never touches our server. Use Razorpay Checkout only.
- Verify Razorpay webhook signatures on the RAW request body (use `express.raw` for the webhook route only).
- Patient data is health data (India DPDP Act): collect the minimum, no unnecessary PII in logs or emails.

## Data model

### Doctor
`name`, `specialization`, `isActive`, `slotDurationMins` (30),
`weeklySchedule`: `{ workingDays: number[], windows: [{ start: 'HH:mm', end: 'HH:mm' }] }` (same windows on every working day),
`blockedDates`: `Date[]` (days off / leave, admin-editable),
`supportsOnline` (bool).
All schedule times are interpreted in `Asia/Kolkata`; stored instants are UTC.

### Settings (singleton document)
`consultationPrice: { INR: number, USD: number }` (paise/cents, integer; actual value set by admin, not hardcoded), `usdEnabled` (default false — USD is stored but never exposed by the public API while disabled),
`minNoticeMins`, `maxAdvanceDays`, `holdMinutes` (default 10), `refundWindowHours` (default 24).
There is NO Service model. Remove the hardcoded service enum and lists used for booking. Therapy descriptions remain static content pages.

### Appointment
**(Target schema — this is Phase 3 work. The live `Appointment` model is still the old flat schema from before this file existed; it is untouched until Phase 3 migrates it.)**
- `doctorId` (ref), `slotStart` (Date, UTC), `slotEnd`
- `kind`: `consultation` | `therapy_session` (therapy_session is admin-created only)
- `title` (string, therapy_session only, free text set by staff)
- `mode`: `in_person` | `online`
- `paymentMode`: `pay_now` | `pay_at_clinic`
- `currency` ('INR'), `amountDue`, `amountPaid`, `amountRefunded` (paise)
- `paymentStatus`: `unpaid` | `paid` | `refunded` | `failed` | `needs_manual_refund`
- `status`: `pending_payment` | `confirmed` | `completed` | `cancelled` | `no_show`
- `isActiveSlot` (boolean, true while status is `pending_payment` or `confirmed`, otherwise unset)
- `holdExpiresAt` (Date, only while `pending_payment`)
- `razorpayOrderId`, `razorpayPaymentId`, `razorpayRefundId`
- `meetLink` (string, online only)
- `patient: { name, phone, email, age, symptoms }`
- `consentAcceptedAt` (Date, required for online mode)
- `accessTokenHash` (see Patient access)
- `cancelledAt`, `cancelledBy` (`patient` | `admin` | `system`)
- timestamps

### Indexes (critical)
- UNIQUE index on `(doctorId, slotStart)` with `partialFilterExpression: { isActiveSlot: true }`. This is the double-booking guard. Maintain `isActiveSlot` on every status change. Catch duplicate-key error 11000 and return a clean "slot taken" response.
- Index on `holdExpiresAt` for expiry cleanup.
- Unique sparse indexes on `razorpayPaymentId` and `razorpayOrderId`.

## Booking rules
- `pay_at_clinic`: allowed ONLY for `in_person`. Created directly as `confirmed`, `paymentStatus: unpaid`.
- `online` mode: requires `pay_now`, requires `consentAcceptedAt`, requires `PAYMENTS_ENABLED=true`.
- `pay_now`: created as `pending_payment` with `holdExpiresAt = now + holdMinutes`, `isActiveSlot: true`, then a Razorpay order is created. Confirmed ONLY by a verified webhook (`payment.captured`), never by the frontend redirect.
- Expired holds: a scheduled job (and a lazy check on slot reads) sets status `cancelled`, `cancelledBy: system`, unsets `isActiveSlot`, freeing the slot.
- Slot validity is checked on the server: inside a working window, on a working day, not in `blockedDates`, respects `minNoticeMins` and `maxAdvanceDays`, not already taken.

## Cancellation and refunds (decided)
- Patient cancels from their tokenized link.
- If `slotStart - now >= refundWindowHours` (24h): cancel and issue a full Razorpay refund automatically (paid bookings). Pay-at-clinic bookings just cancel.
- Inside the 24h window: the patient cancel action is disabled in the UI AND rejected by the API. Exceptions are handled manually by an admin.
- Admin can cancel and refund at any time from the dashboard.
- Refund is idempotent: never refund twice; record `razorpayRefundId` and `amountRefunded`.
- Rescheduling is NOT built in v1 (cancel and rebook).

## Payments (Razorpay, INR only)
- Order creation is server-side. Amount comes from `Settings.consultationPrice`, never from the client.
- Webhook endpoint: `POST /api/payments/webhook`
  - Verify signature on the raw body.
  - Idempotent: if `razorpayPaymentId` is already processed, return 200 and do nothing.
  - `payment.captured`: set `amountPaid`, `paymentStatus: paid`, `status: confirmed`; then trigger Meet link creation (online) and the confirmation email.
  - `payment.failed`: set `paymentStatus: failed`; let the hold expire.
  - Return 200 quickly for handled or ignored events; do slow work (email, Meet) so a retry is safe.
- If a payment is captured for an appointment whose hold already expired and the slot is now taken or inactive: set `paymentStatus: needs_manual_refund`, surface it prominently in the admin dashboard. Never silently lose a payment.

## Online consultations
- Do not build video. Create a Google Meet link via the Google Calendar API (conferenceData) when an online booking is confirmed. Store `meetLink`.
- Do not record sessions. Consent checkbox is mandatory at booking.
- The link is sent by email and shown on the tokenized booking page.

## Email
- Do NOT use Gmail SMTP / App Passwords. Use a transactional email provider (Resend or Brevo; pick one in Phase 6) with a proper sender address.
- Emails: booking confirmation (with Meet link if online), 24h reminder, cancellation, refund notice. Minimal PII, no symptoms in email bodies.
- Reminders require a scheduler: use a Render cron job or equivalent. The free web tier sleeps, so do not rely on in-process timers.

## Patient access (no patient accounts)
- No patient login. On booking, generate a random token, store only its hash, include the raw token in links: `/booking/:id?token=...`.
- That page shows booking status, the Meet link, and the cancel action (when allowed). Rate-limit it.

## API surface (target)
- `GET /api/doctors` (public, active only)
- `GET /api/config` (public: consultation price, modes available given PAYMENTS_ENABLED, notice/advance window)
- `GET /api/availability?doctorId&date` returns free 30-minute slots
- `POST /api/appointments` (public, zod-validated)
- `POST /api/payments/webhook` (only when PAYMENTS_ENABLED)
- `GET /api/appointments/:id?token=` and `POST /api/appointments/:id/cancel?token=` (patient, token-gated)
- Admin (JWT, role-checked, whitelisted-field schemas): list/update appointments, create `therapy_session`, cancel/refund, edit doctor schedule and `blockedDates`, edit Settings, view `needs_manual_refund` items

## Known bugs to fix (Phase 1)
- JWT in localStorage; move to an HTTP-only secure cookie with CSRF consideration — **DEFERRED to Phase 1b** (see "Phases" below): the cookie would be cross-site today and browsers block it.

## Cleanup backlog
- Unused `CORS_ORIGIN` env var in both `.env.example` files (root and `backend/`) — `server.ts` only reads `FRONTEND_URL` for CORS; `CORS_ORIGIN` is dead and can be removed.
- `Dashboard.tsx` keeps its own ad-hoc login/session state instead of relying solely on `ProtectedRoute`.
- 4 pre-existing ESLint warnings in `Dashboard.tsx` (unused `User` import, missing `fetchData` dependency in a `useEffect`, two unused `error` catch bindings).
- The login rate limiter (5 failed attempts / 15 min / IP) is only verified by manual curl testing; no automated test yet.

## Phases
1. Security fixes and bug list above. No schema changes. — **DONE (2026-11-08)**.
   - **Phase 1b (cookie auth) — DEFERRED.** The frontend is on `vercel.app` and the backend on `onrender.com`, so an auth cookie is cross-site and gets blocked by browsers (SameSite/third-party cookie restrictions). Revisit only once the API is same-site — either a Vercel rewrite proxying `/api` to the Render backend, or a shared custom domain for both. Until then, keep using the JWT-in-localStorage approach and mitigate by shortening JWT expiry.
2. Doctor + Settings models, seed script, public API; remove hardcoded doctor/service booking lists from the frontend. — **DONE (2026-11-08)**.
3. New Appointment schema (including the service/doctor enum and lists currently still hardcoded on the old model), `isActiveSlot` partial unique index, availability endpoint, hold expiry.
4. Booking UI rework (mode, real slots, consent, patient token page, cancel flow). Works end to end with `PAYMENTS_ENABLED=false`.
5. Razorpay order, webhook, idempotency, refunds, in TEST mode, behind the flag.
6. Google Meet link + transactional email + scheduled reminders.
7. Tests (below), move backend to an always-on paid instance, structured logging.
8. Go-live checklist (needs the clinic owner): Razorpay KYC and live keys, flip `PAYMENTS_ENABLED=true`, one real small-value payment and refund as a smoke test.

## Tests (required before go-live)
Use Vitest/Jest with mongodb-memory-server. Must cover:
- Two concurrent bookings for the same slot: exactly one succeeds
- Slot outside working hours / on a blocked date / inside min notice is rejected
- Webhook with invalid signature is rejected
- Duplicate webhook delivery does not double-confirm
- Webhook for an expired hold sets `needs_manual_refund` and is not lost
- Client-supplied price/status/amount is ignored
- Online booking without consent is rejected
- Pay-at-clinic is rejected for online mode
- Online mode and payment routes are rejected when `PAYMENTS_ENABLED=false`
- Patient cancel at 24h+ refunds once; inside 24h is rejected; double cancel does not double refund
- Token page rejects a wrong or missing token

## Open decisions (values to fill in, ask before building)
- Doctor name is confirmed real: **Dr. Saraswathi Sharma**, seeded as the single active doctor. Her specialization (seeded as placeholder `"General Ayurvedic Physician"`) still needs a real value.
- Her actual working windows and weekly days off — seeded as placeholders: Mon–Sat (`workingDays: [1,2,3,4,5,6]`), windows `10:00–14:00` and `17:00–21:00` IST. Awaiting her real schedule.
- The consultation price (paise, set via Settings, not hardcoded) — seeded as a placeholder (`INR: 50000` = ₹500). Awaiting the clinic owner's real number.
- `minNoticeMins` and `maxAdvanceDays` — seeded as placeholders (120 mins, 30 days).
- Which transactional email provider (Resend or Brevo)
- Razorpay account type / KYC path (deferred to Phase 8)
