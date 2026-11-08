# Kasturi Ayurveda Backend API

RESTful API for Kasturi Ayurveda clinic management system built with Node.js, Express, TypeScript, and MongoDB.

## 🚀 Features

- ✅ **Authentication & Authorization** - JWT-based auth with role-based access control
- ✅ **Appointment Management** - Create, read, update, delete appointments
- ✅ **Contact Form** - Handle contact inquiries
- ✅ **Email Notifications** - Automated email confirmations
- ✅ **Input Validation** - Request validation using express-validator
- ✅ **Security** - Helmet, CORS, rate limiting
- ✅ **Error Handling** - Centralized error handling
- ✅ **TypeScript** - Full type safety
- ✅ **MongoDB** - NoSQL database with Mongoose ODM

## 📋 Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

## 🛠️ Installation

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Fill in `.env`. Every variable is documented in `.env.example`; the server refuses to start if a required one is missing. For local development, `EMAIL_PROVIDER=log` sends no real email. Production setup (email provider, scheduler, Google Meet) is in `../docs/SETUP_PHASE6.md`.

## 🏃 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Tests
```bash
npm test                 # 109 tests, ~20s; in-memory MongoDB, all external services faked
npm run type-check       # source
npm run type-check:tests # tests
```
No `.env`, database or network access needed: each test file starts its own in-memory MongoDB database and fakes Razorpay, email and Google. The first run downloads a MongoDB binary (~100 MB). CI runs the same on every push touching `backend/` (`.github/workflows/backend-tests.yml`).

## 📚 API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user (Admin only)
- `GET /api/auth/me` - Get current user (Protected)
- `PUT /api/auth/updatepassword` - Update password (Protected)

### Appointments
- `POST /api/appointments` - Create appointment (Public)
- `GET /api/appointments` - Get all appointments (Protected)
- `GET /api/appointments/:id` - Get single appointment (Protected)
- `PUT /api/appointments/:id` - Update appointment (Admin/Staff)
- `DELETE /api/appointments/:id` - Delete appointment (Admin)

### Contact
- `POST /api/contact` - Submit contact form (Public)
- `GET /api/contact` - Get all messages (Admin/Staff)
- `PUT /api/contact/:id` - Update message status (Admin/Staff)
- `DELETE /api/contact/:id` - Delete message (Admin)

## 🔐 Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

### User Roles
- **admin** - Full access to all endpoints
- **staff** - Can view and manage appointments/contacts

## 📝 Request Examples

### Create Appointment
```bash
POST /api/appointments
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "date": "2025-12-01",
  "time": "10:00 AM",
  "service": "Consultation",
  "message": "First visit for back pain"
}
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@kasturiayurveda.com",
  "password": "your-password"
}
```

## 🗄️ Database Models

### User
- name, email, password (hashed)
- role (admin/staff)
- isActive

### Appointment
- name, email, phone
- date, time, service
- message (optional)
- status (pending/confirmed/cancelled/completed)

### Contact
- name, email, phone (optional)
- subject, message
- status (new/read/responded)

## 🔒 Security Features

- Helmet.js for HTTP headers security
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Password hashing with bcrypt
- JWT token expiration
- Input validation and sanitization
- MongoDB injection prevention

## 📧 Email Configuration

For Gmail, you need to:
1. Enable 2-Factor Authentication
2. Generate an App Password
3. Use the App Password in EMAIL_PASSWORD

## 🐛 Error Handling

All errors are handled centrally and return consistent JSON responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

## 📊 Response Format

Success responses follow this format:

```json
{
  "status": "success",
  "message": "Operation description",
  "data": { ... }
}
```

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:5000/health
```

## 🚀 Deployment

1. Build the TypeScript code:
```bash
npm run build
```

2. Set NODE_ENV to production
3. Use a process manager like PM2:
```bash
pm2 start dist/server.js --name kasturi-backend
```

## 📝 Environment Variables

`.env.example` is the authoritative list, with comments. Summary:

| Variable | Description | Required |
|----------|-------------|----------|
| NODE_ENV | development / production / test | default development |
| PORT | Server port | default 5000 |
| LOG_LEVEL | debug / info / warn / error / silent | default info |
| MONGODB_URI | MongoDB connection string | Yes |
| JWT_SECRET | JWT signing secret (32+ chars) | Yes |
| JWT_EXPIRE | JWT expiration time | default |
| FRONTEND_URL | Frontend origin (CORS + links in emails) | Yes |
| EMAIL_PROVIDER | resend / brevo / log (log = dev only) | Yes |
| EMAIL_API_KEY | Provider API key | Yes (unless log) |
| EMAIL_FROM | `Name <address>`, verified with the provider | Yes |
| CLINIC_NOTIFY_EMAIL | Clinic inbox for new-booking notices | No |
| CRON_SECRET | Shared with the GitHub Actions scheduler (32+ chars) | Yes |
| PAYMENTS_ENABLED | `true` / `false` | default false |
| RAZORPAY_KEY_ID / _KEY_SECRET / _WEBHOOK_SECRET | Razorpay (test keys outside production) | When payments on |
| GOOGLE_CLIENT_ID / _CLIENT_SECRET / _REFRESH_TOKEN | Google Meet links | When payments on |
| GOOGLE_CALENDAR_ID | Calendar for Meet events | default primary |

## 📄 License

Copyright © 2025 Kasturi Ayurveda. All rights reserved.
