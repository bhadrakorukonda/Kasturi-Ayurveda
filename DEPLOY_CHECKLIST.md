## Frontend (Vercel)
- [ ] VITE_API_URL=https://YOUR_RENDER_APP.onrender.com/api

## Backend (Render)
Always required:
- [ ] MONGODB_URI=
- [ ] JWT_SECRET= (64+ random chars)
- [ ] FRONTEND_URL=https://YOUR_VERCEL_APP.vercel.app
- [ ] EMAIL_PROVIDER=resend | brevo
- [ ] EMAIL_API_KEY=
- [ ] EMAIL_FROM=Kasturi Ayurveda <verified-sender@yourdomain.com>
- [ ] CRON_SECRET= (64+ random chars; also set as a GitHub Actions secret, see docs/SETUP_PHASE6.md)
- [ ] CLINIC_NOTIFY_EMAIL= (optional — clinic inbox for new-booking/new-message notifications)
- [ ] NODE_ENV=production
- [ ] ADMIN_EMAIL= / ADMIN_PASSWORD= (only needed to run `createAdmin.ts` once)

Required only once `PAYMENTS_ENABLED=true` (go-live, Phase 8 — see CLAUDE.md):
- [ ] PAYMENTS_ENABLED=true
- [ ] RAZORPAY_KEY_ID= / RAZORPAY_KEY_SECRET= / RAZORPAY_WEBHOOK_SECRET=
- [ ] GOOGLE_CLIENT_ID= / GOOGLE_CLIENT_SECRET= / GOOGLE_REFRESH_TOKEN= (run `npm run google-auth` once to get the refresh token)

Full setup walkthrough for the above: docs/SETUP_PHASE6.md.

## Post-deploy
- [ ] Test /health endpoint
- [ ] Test booking form end to end (in-person, pay at clinic)
- [ ] Test admin dashboard login
- [ ] Test contact form email delivery
- [ ] GitHub Actions scheduled job (`.github/workflows/scheduled-jobs.yml`) is running and hitting `POST /api/jobs/run` successfully
