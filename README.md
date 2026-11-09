# 🌿 Kasturi Ayurveda — Full Stack Web Application

A booking/payments web application for **Kasturi Ayurveda** clinic in Hyderabad: online consultation booking (in-person or online), Razorpay payments behind a feature flag, Google Meet links, transactional email, and an admin dashboard.

![React](https://img.shields.io/badge/React-18.3-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue) ![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

> **This file covers local setup and a feature overview.** For the full product spec, data model, business rules, and phase-by-phase history, see [CLAUDE.md](CLAUDE.md) and [docs/PROGRESS.md](docs/PROGRESS.md). For the current API surface, see [docs/API.md](docs/API.md). For production deployment, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## ✨ Features

### Frontend
- Multi-step booking flow with real availability (`/api/availability`), consent for online consultations, and a patient token page (`/booking/:id?token=...`) for viewing/cancelling a booking without an account
- Contact form
- Admin dashboard: appointments (status, payment, refund), contact messages
- Lazy-loaded routes, responsive, accessible (ARIA), SEO meta tags

### Backend
- One doctor, one bookable product (30-min Consultation, in-person or online), real server-computed pricing and slot validity — see CLAUDE.md's "Product scope" and "Booking rules"
- Double-booking-safe appointment creation (partial unique index + idempotent concurrency handling)
- Razorpay payments (order, webhook, idempotent refunds) — gated behind `PAYMENTS_ENABLED`, off by default
- Google Meet link creation for online consultations
- Transactional email (Resend or Brevo) for confirmations, reminders, cancellations, refunds
- A scheduler-driven jobs endpoint (`POST /api/jobs/run`, called by GitHub Actions every 15 min) handles hold expiry, reminders, and retries — Render's free tier sleeps, so nothing relies on in-process timers
- JWT admin auth, rate limiting, Helmet, structured JSON logging with secret/PII redaction
- 109 automated tests (Vitest + mongodb-memory-server + supertest), run in CI on every backend push

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18.3, TypeScript 5.8, Vite 5.4, TailwindCSS, shadcn/ui, React Query, React Router |
| **Backend** | Node.js, Express 5, TypeScript, Mongoose, JWT, zod |
| **Database** | MongoDB Atlas |
| **Payments** | Razorpay (TEST mode until go-live) |
| **Email** | Resend or Brevo (provider is a deployment choice) |
| **Video** | Google Meet via Google Calendar API |
| **Testing** | Vitest, mongodb-memory-server, supertest |
| **Deploy** | Vercel (frontend), Render (backend) |

---

## 🚀 Quick Start (local development)

### Prerequisites
- Node.js 18+
- A MongoDB instance (local, or an Atlas cluster)

### 1. Install
```bash
npm install
cd backend && npm install && cd ..
```

### 2. Configure environment
**Frontend** — `.env` in the repo root:
```env
VITE_API_URL=http://localhost:5000/api
```

**Backend** — `.env` in `backend/`, based on `backend/.env.example`. Minimum to boot locally:
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/kasturi-ayurveda
JWT_SECRET=<64+ random characters>
FRONTEND_URL=http://localhost:8080
CRON_SECRET=<64+ random characters>
EMAIL_PROVIDER=log
EMAIL_FROM=Kasturi Ayurveda <dev@example.com>
```
`EMAIL_PROVIDER=log` only logs emails instead of sending — fine for local dev, refused in production. See [docs/SETUP_PHASE6.md](docs/SETUP_PHASE6.md) for a real email provider, Google Meet, and the reminder scheduler. Razorpay/Google vars are only required once `PAYMENTS_ENABLED=true`.

### 3. Seed data and create an admin
```bash
cd backend
npm run seed
npx ts-node src/scripts/createAdmin.ts <email> <password>
cd ..
```

### 4. Run
```bash
npm run dev:all
```
- Website: http://localhost:8080
- API: http://localhost:5000/api
- Health check: http://localhost:5000/health
- Admin dashboard: http://localhost:8080/dashboard

### 5. Run tests
```bash
cd backend && npm test
```

---

## 📁 Project Structure

```
kasturi-ayurveda/
├── backend/src/
│   ├── app.ts / server.ts       # Express app factory / HTTP server entry (split for testability)
│   ├── config/                  # env validation (zod), DB connection
│   ├── controllers/             # appointment, doctor, settings, public, auth, contact, payment, jobs
│   ├── middleware/               # auth (JWT), patient token access, error handling, request logging
│   ├── models/                  # Appointment, Doctor, Settings, Contact, User (Mongoose)
│   ├── routes/
│   ├── scripts/                 # seed, createAdmin, googleAuth (one-off CLI tools)
│   └── utils/                   # slots/availability math, email, mailer transport, Google Meet,
│                                 # Razorpay, refunds, holds, logger, patient access tokens
├── backend/tests/                # Vitest + mongodb-memory-server + supertest
│
├── src/
│   ├── pages/                   # Index, Booking, BookingStatus, Doctors, Services, Expertise,
│                                 # Blogs, About, Contact, Dashboard, NotFound
│   ├── components/ui/           # shadcn/ui
│   ├── components/              # Navbar, Footer, ErrorBoundary, ProtectedRoute
│   ├── hooks/, lib/
│   └── App.tsx
│
├── docs/                        # PROGRESS.md (phase changelog), API.md (live API reference),
│                                 # SETUP_PHASE6.md (email/Google/scheduler setup)
├── CLAUDE.md                     # Full product spec, data model, rules, phase history — source of truth
├── DEPLOYMENT.md
└── DEPLOY_CHECKLIST.md
```

---

## 🧪 Testing

Automated: `cd backend && npm test` (109 tests, also runs in CI on every backend push — see `.github/workflows/backend-tests.yml`). Covers concurrent booking safety, payment webhook idempotency/signature verification, refund idempotency, cancellation windows, notification retries, env validation, log redaction, and the login rate limiter. See CLAUDE.md's "Tests" section for the full list.

Manual smoke test after any change: book an appointment end to end, confirm the email, log into `/dashboard`, confirm the booking is visible, update its status.

---

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full Vercel + Render deployment walkthrough, and [DEPLOY_CHECKLIST.md](DEPLOY_CHECKLIST.md) for the exact environment variable checklist.

---

## 📞 Contact & Support

**Kasturi Ayurveda**
- 📧 Email: kasturiayurvedahyd@gmail.com
- 📱 Phone: 8247736253
- 💬 WhatsApp: [Click to chat](https://wa.me/918247736253)
- 📍 Location: Hyderabad, Telangana, India

---

## 📄 License

**Proprietary** — © 2026 Kasturi Ayurveda. All rights reserved. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.
