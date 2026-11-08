# Phase 6 setup: email, reminders, Google Meet

What you need to configure for the Phase 6 code to run in production. The code is done; these are accounts, keys and settings.

> ⚠️ **Do this BEFORE the Phase 6 code reaches Render.** The backend now refuses to start without `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM` and `CRON_SECRET`. If Render auto-deploys `master` and these aren't set, the API goes down until they are.

| Part | Needed for | When |
|---|---|---|
| 1. Email provider | All bookings (confirmations, reminders, cancellations) | Before deploying Phase 6 |
| 2. Scheduler secret + GitHub secrets | Reminders, retries | Before deploying Phase 6 |
| 3. Google Meet | Online consultations only | Before turning `PAYMENTS_ENABLED=true` (Phase 8) |

---

## 1. Email provider (pick one; switching later is just env vars)

Both are supported. The real question is **can you add DNS records to the clinic's domain?**

### Option A: Resend (if you control the domain's DNS)
1. Sign up at resend.com.
2. **Domains → Add domain** (e.g. `kasturiayurveda.com`), add the DNS records it shows at your domain registrar, wait for "Verified".
3. **API Keys → Create** (permission: *Sending access*).
4. Env vars:
   ```
   EMAIL_PROVIDER=resend
   EMAIL_API_KEY=re_...
   EMAIL_FROM=Kasturi Ayurveda <bookings@kasturiayurveda.com>
   ```

### Option B: Brevo (no DNS access, or to start quickly)
1. Sign up at brevo.com.
2. **Senders, Domains & Dedicated IPs → Senders → Add a sender**: use an address you can receive mail at, and click the verification link.
   - Avoid a `@gmail.com` sender: Gmail's policies make mail "from gmail.com" sent by another service likely to land in spam or be rejected. Verify the clinic's domain in Brevo when you can.
3. **SMTP & API → API Keys → Generate** (a v3 API key, not the SMTP password).
4. Env vars:
   ```
   EMAIL_PROVIDER=brevo
   EMAIL_API_KEY=xkeysib-...
   EMAIL_FROM=Kasturi Ayurveda <the-address-you-verified>
   ```

### Optional: clinic notifications
`CLINIC_NOTIFY_EMAIL=kasturiayurvedahyd@gmail.com` sends the clinic a short "new booking / new contact message, see the dashboard" email. Leave unset to skip. These emails never include patient details.

---

## 2. Scheduler (GitHub Actions → `POST /api/jobs/run` every 15 min)

1. Generate a secret:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Render → the API service → **Environment**: `CRON_SECRET=<that value>`.
3. GitHub → repo **Settings → Secrets and variables → Actions → New repository secret**:
   - `CRON_SECRET` = the same value
   - `BACKEND_URL` = the Render URL, e.g. `https://kasturi-ayurveda-api.onrender.com` (no `/api`, no trailing slash)
4. Once the workflow is on GitHub: **Actions → Scheduled jobs → Run workflow** to test. A green run whose log ends in `{"status":"success",...}` means it works.

Notes: GitHub can start scheduled runs a few minutes late (fine for reminders). It pauses scheduled workflows after 60 days of no repository activity; re-enable under the Actions tab if reminders stop.

---

## 3. Google Meet (only needed before online consultations go live)

Meet links are created on the **clinic's** Google Calendar. You need a Google Cloud OAuth client and a one-time sign-in as the clinic's account.

1. console.cloud.google.com → create a project (e.g. "Kasturi Ayurveda Booking").
2. **APIs & Services → Library → Google Calendar API → Enable.**
3. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - User type **External**, app name "Kasturi Ayurveda Booking", support email = clinic's.
   - Scopes: add `https://www.googleapis.com/auth/calendar.events`.
   - **Publish the app ("In production").** Important: while it's in "Testing", Google expires the refresh token after **7 days** and Meet links silently stop working. An unverified production app is fine for this; you'll just see a "Google hasn't verified this app" screen once during step 6. Click *Advanced → Go to …*.
4. **Credentials → Create credentials → OAuth client ID → Application type: Desktop app.** Copy the client ID and secret.
5. In `backend/.env` locally:
   ```
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=...
   ```
6. Run `cd backend && npm run google-auth`, open the printed URL, **sign in as the clinic's Google account**, and allow access.
7. It prints `GOOGLE_REFRESH_TOKEN=...`. Put it, plus the client ID and secret, into Render's environment. Treat it like a password.
8. Optional: `GOOGLE_CALENDAR_ID` (default `primary`) if Meet events should go to a different calendar on that account.

If Meet ever breaks with `invalid_grant` in the logs, the token was revoked or expired: repeat steps 6–7.

---

## Checking it works (after deploy)

1. Make a pay-at-clinic booking on the live site with your own email → you get a confirmation with a "View or cancel" link that opens your booking.
2. Cancel it from that page → cancellation email.
3. GitHub Actions → run "Scheduled jobs" manually → green.
4. Reminders: make a booking 2+ days out; the reminder arrives about 24h before the slot.
