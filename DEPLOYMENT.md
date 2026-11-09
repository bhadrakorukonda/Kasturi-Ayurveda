# Deployment Guide

## Application overview

**Kasturi Ayurveda** — a clinic booking/payments site.
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui (`src/`), deployed on **Vercel**.
- **Backend**: Node.js + Express + TypeScript + Mongoose (`backend/src/`), deployed on **Render**.
- **Database**: MongoDB Atlas.

See [CLAUDE.md](CLAUDE.md) for the full product spec, data model, and phase history, and [docs/API.md](docs/API.md) for the current API surface. This file covers local setup and the actual production deployment path only.

---

## Local development setup

### 1. Install

```bash
cd "h:\Random projects\Kasturi Ayurveda"
npm install
cd backend
npm install
cd ..
```

### 2. Configure environment variables

**Frontend** — `.env` in the repo root:
```env
VITE_API_URL=http://localhost:5000/api
```

**Backend** — `.env` in `backend/`. See `backend/.env.example` for the full list; the minimum to boot locally:
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/kasturi-ayurveda
JWT_SECRET=<64+ random characters>
FRONTEND_URL=http://localhost:8080
CRON_SECRET=<64+ random characters>
EMAIL_PROVIDER=log
EMAIL_FROM=Kasturi Ayurveda <dev@example.com>
```
`EMAIL_PROVIDER=log` is dev/test-only — it logs instead of sending. Production requires `resend` or `brevo`; see [docs/SETUP_PHASE6.md](docs/SETUP_PHASE6.md) for picking and configuring a real provider, Google Meet, and the GitHub Actions scheduler. Razorpay/Google env vars are only required once `PAYMENTS_ENABLED=true` (Phase 8, go-live).

### 3. Seed and create an admin user

```bash
cd backend
npm run seed             # Doctor + Settings defaults
npx ts-node src/scripts/createAdmin.ts <email> <password>
cd ..
```

### 4. Run

```bash
npm run dev:all   # both servers, from the repo root
```
- Frontend: http://localhost:8080
- Backend: http://localhost:5000/api
- Health: http://localhost:5000/health

### 5. Run the backend test suite

```bash
cd backend
npm test
```

---

## Production deployment (Vercel + Render)

### Backend → Render

1. New Web Service → connect the GitHub repo.
2. Root directory: `backend`. Build command: `npm install && npm run build`. Start command: `npm start`.
3. Environment variables: see [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md) for the exact list, and [docs/SETUP_PHASE6.md](docs/SETUP_PHASE6.md) for how to obtain the email/Google/Razorpay values.
4. Database: a MongoDB Atlas cluster (not Render's own) — get the connection string from atlas.mongodb.com.
5. Deploy, then run the admin-creation script once via the Render shell:
   ```bash
   npx ts-node src/scripts/createAdmin.ts <email> <strong-password>
   ```

### Frontend → Vercel

1. Import the GitHub repo. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
2. Environment variable: `VITE_API_URL=https://<your-render-app>.onrender.com/api`.
3. Deploy.
4. Back on Render, set `FRONTEND_URL` to the deployed Vercel URL (for CORS).

### Scheduled jobs (reminders, hold expiry, retries)

Render's free tier sleeps, so reminders and retries are **not** driven by an in-process timer. `.github/workflows/scheduled-jobs.yml` calls `POST /api/jobs/run` every 15 minutes with a `CRON_SECRET` bearer token. Set `CRON_SECRET` on Render and as a GitHub Actions repository secret with the same value — see [docs/SETUP_PHASE6.md](docs/SETUP_PHASE6.md).

---

## Post-deploy verification

1. `GET /health` on the Render URL → `{"status":"ok"}`.
2. Book an appointment end to end on the live site (in-person, pay at clinic).
3. Confirm the booking confirmation email arrives (check the configured email provider's dashboard if not).
4. Log into `/dashboard` with the admin account and confirm the booking is visible.
5. Submit the contact form and confirm the clinic notification arrives.
6. Confirm the GitHub Actions workflow run (Actions tab) is succeeding on schedule.

---

## Troubleshooting

**Backend won't start / crashes immediately**
Check the Render logs — `backend/src/config/env.ts` crashes on startup with a clear message naming every missing/invalid env var. There are no silent fallbacks; a crash here always means an env var problem.

**CORS errors in the browser**
`FRONTEND_URL` on Render must exactly match the deployed Vercel origin (scheme + host, no trailing slash).

**Emails not sending**
Check `EMAIL_PROVIDER`/`EMAIL_API_KEY`/`EMAIL_FROM` are set correctly and the sender is verified with the provider — see [docs/SETUP_PHASE6.md](docs/SETUP_PHASE6.md). `backend/tests/notifications.test.ts` covers the email-sending logic itself if you suspect a code bug rather than a config one.

**MongoDB connection failed**
Verify `MONGODB_URI` and that the Atlas cluster's network access list allows Render's IPs (or is set to allow from anywhere, if that's your Atlas tier's only option).

---

## Backups

MongoDB Atlas handles automated backups on paid tiers; check your cluster's backup settings in the Atlas console. For a manual snapshot:
```bash
mongodump --uri="<your MONGODB_URI>" --out=./backup-$(date +%Y%m%d)
```

---

## Support

- Email: kasturiayurvedahyd@gmail.com
- Phone: 8247736253

## License

Proprietary — Kasturi Ayurveda © 2026.
