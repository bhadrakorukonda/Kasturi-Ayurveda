# Kasturi Ayurveda: Booking, Payments, Online Consultations

This file is the source of truth for the booking/payments build. Follow it exactly. If a task conflicts with this file, stop and ask instead of improvising.

## Current status
Phase 1 (security fixes) is **DONE as of 2026-11-08**. Phase 1b (cookie auth) is **DEFERRED** — see "Phases" below. Phase 2 (Doctor + Settings models, seed script, public API) is **DONE as of 2026-11-08**. Phase 3 (new Appointment schema, `isActiveSlot` index, availability endpoint, hold expiry) is **DONE as of 2026-11-08**. Phase 4 (Booking UI rework, patient token page, cancel flow, admin dashboard fix) is **DONE as of 2026-11-08** — `Booking.tsx` and `Dashboard.tsx` now both speak the live API correctly end to end with `PAYMENTS_ENABLED=false`. Phase 5 (Razorpay orders, webhook, idempotency, refunds, behind the flag) is **DONE as of 2026-11-08**, verified against a mocked Razorpay; a run with real Razorpay TEST keys is still owed before Phase 8. Phase 6 (Google Meet links, transactional email, scheduled reminders) is **DONE as of 2026-11-08**, verified against mocked Resend/Google; **production needs the new env vars set before it is deployed** (see `docs/SETUP_PHASE6.md`). Phase 7 (automated tests, structured logging) is **DONE as of 2026-11-09**: `cd backend && npm test` runs 109 tests, also in CI on every backend push. The always-on paid instance was **deliberately deferred** (see Phases). Phase 8 (go-live) needs the clinic owner.

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
- Never log secrets, tokens, or patient symptoms. Use `logger` from `backend/src/utils/logger.ts` (not `console`) in server code: pass ids as fields, never patient data. Request logs record the path only, never the query string (patient links carry `?token=`).
- Every change to booking/payment/notification behaviour comes with tests in `backend/tests/` (`npm test`).
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
- `refundLockedAt` (internal, Phase 5: set only while a Razorpay refund call is in flight; prevents double refunds)
- `additionalAccessTokenHashes` (Phase 6: hashes of per-email tokens), `googleEventId` (Phase 6: calendar event id, equals the appointment id)
- `confirmationPending`, `notifyLockedAt`, `reminderSentAt` (internal, Phase 6: notification bookkeeping so confirmations/reminders are retried and never double-sent)
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
- Do NOT use Gmail SMTP / App Passwords. Use a transactional email provider with a proper sender address. **Decided (Phase 6): both Resend and Brevo are supported, selected by `EMAIL_PROVIDER`; which one is used is a deployment choice** (see `docs/SETUP_PHASE6.md`). `EMAIL_PROVIDER=log` exists for local dev only and is refused in production.
- Emails: booking confirmation (with Meet link if online), 24h reminder, cancellation, refund notice. Minimal PII, no symptoms in email bodies. Also: no phone/age in any email; clinic notifications (`CLINIC_NOTIFY_EMAIL`) say only "see the dashboard"; contact-form emails don't echo the message.
- Reminders require a scheduler. **Decided (Phase 6): GitHub Actions** (`.github/workflows/scheduled-jobs.yml`) calls `POST /api/jobs/run` every 15 min with `CRON_SECRET`. The free web tier sleeps, so do not rely on in-process timers.
- Each email that needs the manage link mints a fresh token (only its hash is stored, in `additionalAccessTokenHashes`, last 10 kept). The raw token is never stored.

## Patient access (no patient accounts)
- No patient login. On booking, generate a random token, store only its hash, include the raw token in links: `/booking/:id?token=...`.
- That page shows booking status, the Meet link, and the cancel action (when allowed). Rate-limit it.

## API surface (target)
- `GET /api/doctors` (public, active only) — **LIVE (Phase 2)**.
- `GET /api/config` (public: consultation price, modes available given PAYMENTS_ENABLED, notice/advance window) — **LIVE (Phase 2)**.
- `GET /api/availability?doctorId&date` returns free 30-minute slots — **LIVE (Phase 3)**.
- `POST /api/appointments` (public, zod-validated) — **LIVE (Phase 3)**; `Booking.tsx` sends the correct payload as of Phase 4.
- `GET /api/appointments`, `GET /api/appointments/:id` (admin), `PUT /api/appointments/:id` (admin) — **LIVE (Phase 3)**. `PUT` supports `status` transitions plus `refund: boolean` (required when cancelling a paid booking, admin-only when true) as of Phase 5. `GET` list has a `paymentStatus` filter.
- `POST /api/appointments/:id/refund` (admin, full refund, idempotent) — **LIVE (Phase 5)**.
- `GET /api/appointments/:id?token=` (dual-mode: patient via token, or admin via JWT — same route) and `POST /api/appointments/:id/cancel?token=` (patient, token-gated, rate-limited) — **LIVE (Phase 4)**. Patient-facing page at `/booking/:id?token=...` (`BookingStatus.tsx`) consumes both.
- `POST /api/payments/webhook` (only when PAYMENTS_ENABLED) — **LIVE (Phase 5)**: handles `payment.captured`, `payment.failed`, `refund.failed`.
- `POST /api/jobs/run` (scheduler only, `Authorization: Bearer <CRON_SECRET>`) — **LIVE (Phase 6)**: expires holds, retries pending confirmations and Meet links, sends 24h reminders.
- Admin `therapy_session` creation — not built (not assigned to a phase yet, raise it if needed).
- `PUT /api/doctors/:id/schedule`, `PUT /api/settings`, `GET /api/doctors/admin` — **LIVE (Phase 2)**.

## Known bugs to fix (Phase 1)
- JWT in localStorage; move to an HTTP-only secure cookie with CSRF consideration — **DEFERRED to Phase 1b** (see "Phases" below): the cookie would be cross-site today and browsers block it.

## Cleanup backlog
- Unused `CORS_ORIGIN` env var in both `.env.example` files (root and `backend/`) — `server.ts` only reads `FRONTEND_URL` for CORS; `CORS_ORIGIN` is dead and can be removed.
- `Dashboard.tsx` keeps its own ad-hoc login/session state instead of relying solely on `ProtectedRoute`.
- 2 pre-existing ESLint warnings in `Dashboard.tsx` (unused `User` import, missing `fetchData` dependency in a `useEffect`).
- ~~The login rate limiter is only verified by manual curl testing~~ — covered by `tests/auth.test.ts` since Phase 7.
- ~~3 old-shape test documents in `appointments`~~ — deleted during Phase 4 verification; they were crashing `Dashboard.tsx` (reading `.name` off a missing `patient` sub-object on legacy docs). `Dashboard.tsx` is now defensive against missing/legacy fields regardless (falls back to `"—"`), so this class of issue can't recur even if old-shape data shows up again.
- ~~Security rule violation: `contact.controller.ts` did `Contact.create(req.body)`, raw body into Mongoose~~ — fixed in a hygiene pass (2026-11-09): now zod `.strict()` like the rest. `auth.controller.ts` (`register`/`login`/`updatepassword`) was also migrated from `express-validator` to zod `.strict()` in the same pass, for the same reason.
- ~~Root-level docs (`STATUS.md`, `README.md`, `DEPLOYMENT.md`, `DEPLOY_CHECKLIST.md`) were stale~~ — fixed (2026-11-09): `STATUS.md` (dev scratch notes containing a committed admin credential) deleted; the other three rewritten to match the current stack/env vars/deploy target (Vercel + Render) instead of the pre-rebuild Gmail/Railway/VPS instructions, and now point to `CLAUDE.md`/`docs/` for anything that duplicates them.

## Phases
1. Security fixes and bug list above. No schema changes. — **DONE (2026-11-08)**.
   - **Phase 1b (cookie auth) — DEFERRED.** The frontend is on `vercel.app` and the backend on `onrender.com`, so an auth cookie is cross-site and gets blocked by browsers (SameSite/third-party cookie restrictions). Revisit only once the API is same-site — either a Vercel rewrite proxying `/api` to the Render backend, or a shared custom domain for both. Until then, keep using the JWT-in-localStorage approach and mitigate by shortening JWT expiry.
2. Doctor + Settings models, seed script, public API; remove hardcoded doctor/service booking lists from the frontend. — **DONE (2026-11-08)**.
3. New Appointment schema (including the service/doctor enum and lists currently still hardcoded on the old model), `isActiveSlot` partial unique index, availability endpoint, hold expiry. — **DONE (2026-11-08)**. Backend only — `Booking.tsx`/`Dashboard.tsx` are not updated and will not work correctly until Phase 4.
4. Booking UI rework (mode, real slots, consent, patient token page, cancel flow). Works end to end with `PAYMENTS_ENABLED=false`. — **DONE (2026-11-08)**. Also fixed `Dashboard.tsx` (left broken in Phase 3) so the admin can see/manage the new-shape bookings.
5. Razorpay order, webhook, idempotency, refunds, in TEST mode, behind the flag. — **DONE (2026-11-08)** (mocked Razorpay; real TEST-key run still owed).
6. Google Meet link + transactional email + scheduled reminders. — **DONE (2026-11-08)**; setup steps in `docs/SETUP_PHASE6.md`.
7. Tests (below), move backend to an always-on paid instance, structured logging. — **DONE (2026-11-09)** except the paid instance: **deferred by decision** (the 15-min GitHub Actions job keeps the free instance mostly awake; Razorpay retries webhooks to a sleeping server for 24h, so no payment is lost). Revisit if cold starts bother real patients after go-live (Render "Starter", ~$7/month).
8. Go-live checklist (needs the clinic owner): Phase 6 env vars + GitHub secrets set (`docs/SETUP_PHASE6.md`); real Razorpay TEST-key run (Checkout, webhook, refund); Google OAuth app published and `google-auth` done as the clinic account; Razorpay KYC and live keys; flip `PAYMENTS_ENABLED=true`; one real small-value payment and refund as a smoke test; optionally the paid Render instance.

## Tests (required before go-live)
Vitest + mongodb-memory-server + supertest, in `backend/tests/` (`npm test`; CI: `.github/workflows/backend-tests.yml`). Outbound Razorpay/email/Google calls are faked in `tests/helpers/fakeProviders.ts`; nothing touches the network or a real DB. **All required items are covered:**
- Two concurrent bookings for the same slot: exactly one succeeds — `booking.test.ts` (10 concurrent)
- Slot outside working hours / on a blocked date / inside min notice is rejected — `booking.test.ts` (+ off-grid, Sunday, beyond max advance)
- Webhook with invalid signature is rejected — `payments.test.ts` (+ missing signature, body modified after signing)
- Duplicate webhook delivery does not double-confirm — `payments.test.ts` (5 concurrent duplicates, no second email)
- Webhook for an expired hold sets `needs_manual_refund` and is not lost — `payments.test.ts`
- Client-supplied price/status/amount is ignored — `booking.test.ts` (rejected outright by `.strict()`, nothing created)
- Online booking without consent is rejected — `payments.test.ts`
- Pay-at-clinic is rejected for online mode — `payments.test.ts`
- Online mode and payment routes are rejected when `PAYMENTS_ENABLED=false` — `booking.test.ts`
- Patient cancel at 24h+ refunds once; inside 24h is rejected; double cancel does not double refund — `payments.test.ts` (+ 6 concurrent cancels → one refund)
- Token page rejects a wrong or missing token — `booking.test.ts` (+ another booking's token, rate limit)

Also covered: admin refunds (idempotent, concurrent, staff forbidden, retry after failure, `refund.failed`), all Phase 6 emails/Meet/reminders/jobs (`notifications.test.ts`), startup env rules (`env.test.ts`), log redaction and no tokens in logs (`logging.test.ts`), login brute-force limiter (`auth.test.ts`). The suite was checked by deliberately breaking the signature check, the double-booking index, the refund lock and the log redaction: each break made the relevant test fail.

## Open decisions (values to fill in, ask before building)
- Doctor name is confirmed real: **Dr. Saraswathi Sharma**, seeded as the single active doctor. Her specialization (seeded as placeholder `"General Ayurvedic Physician"`) still needs a real value.
- Her actual working windows and weekly days off — seeded as placeholders: Mon–Sat (`workingDays: [1,2,3,4,5,6]`), windows `10:00–14:00` and `17:00–21:00` IST. Awaiting her real schedule.
- The consultation price (paise, set via Settings, not hardcoded) — seeded as a placeholder (`INR: 50000` = ₹500). Awaiting the clinic owner's real number.
- `minNoticeMins` and `maxAdvanceDays` — seeded as placeholders (120 mins, 30 days).
- Which transactional email provider to actually sign up for (code supports both; depends on whether we can add DNS records for the clinic's domain; see `docs/SETUP_PHASE6.md`).
- The clinic's Google account for Meet (a regular Gmail account was chosen; it must do the one-time `npm run google-auth` sign-in).
- Razorpay account type / KYC path (deferred to Phase 8)
