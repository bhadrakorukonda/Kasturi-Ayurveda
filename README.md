# 🌿 Kasturi Ayurveda - Full Stack Web Application

A modern, full-stack web application for **Kasturi Ayurveda** clinic in Hyderabad, featuring online appointment booking, contact forms, and an admin dashboard.

![React](https://img.shields.io/badge/React-18.3-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue) ![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green)

---

## ✨ Features

### 🎨 Frontend
- **Modern Landing Page** - Beautiful UI showcasing clinic services
- **Multi-Step Booking** - Interactive 5-step appointment form
- **Contact Form** - Direct messaging to clinic
- **Fully Responsive** - Perfect on all devices
- **Fast & Optimized** - Vite, lazy loading, React Query
- **Accessible** - WCAG compliant with ARIA labels
- **SEO Ready** - Meta tags, Open Graph, Twitter Cards

### 🔐 Backend
- **JWT Authentication** - Secure admin access
- **Admin Dashboard** - Manage appointments & messages
- **Email Notifications** - Auto-confirmation via Gmail
- **Security** - Helmet, CORS, rate limiting
- **MongoDB** - Persistent data storage
- **RESTful API** - Clean, documented endpoints

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18.3, TypeScript 5.8, Vite 5.4, TailwindCSS, shadcn/ui |
| **Backend** | Node.js, Express 4.21, TypeScript, JWT, Nodemailer |
| **Database** | MongoDB 7.0 with Mongoose |
| **Tools** | React Query, React Router, Zod, bcrypt |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- MongoDB 7.0+ ([Download](https://www.mongodb.com/try/download/community))
- Gmail with App Password ([Setup Guide](https://support.google.com/accounts/answer/185833))

### 1️⃣ Install Dependencies
```powershell
npm install
cd backend
npm install
cd ..
```

### 2️⃣ Configure Environment

**Frontend** - Create `.env` in root:
```env
VITE_API_URL=http://localhost:5000/api
```

**Backend** - Create `.env` in `backend/`:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kasturi-ayurveda
JWT_SECRET=your-super-secret-key-min-32-chars
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=kasturiayurvedahyd@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
CORS_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@kasturiayurveda.com
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Admin
```

### 3️⃣ Start MongoDB
```powershell
# Check status
Get-Service -Name MongoDB*

# Start if needed
Start-Service MongoDB
```

### 4️⃣ Create Admin User
```powershell
cd backend
npx ts-node src/scripts/createAdmin.ts
cd ..
```

### 5️⃣ Run Application
```powershell
# Run both frontend & backend together
npm run dev:all
```

OR run separately in two terminals:
```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

### 6️⃣ Access Application
- **Website**: http://localhost:5173
- **API**: http://localhost:5000/api
- **Health**: http://localhost:5000/api/health
- **Admin Dashboard**: http://localhost:5173/dashboard
  - Login: `admin@kasturiayurveda.com`
  - Password: (from backend/.env)

---

## 📝 Usage Guide

### For Patients

**Book an Appointment:**
1. Visit `/booking` page
2. Select service (Consultation, Panchakarma, etc.)
3. Choose preferred doctor
4. Pick date and time slot
5. Fill personal details
6. Submit - receive email confirmation ✅

**Contact Clinic:**
1. Visit `/contact` page
2. Fill contact form
3. Submit message
4. Clinic receives notification

### For Admin

**Access Dashboard:**
1. Navigate to `/dashboard`
2. Login with admin credentials
3. View real-time stats

**Manage Appointments:**
- View all bookings with patient details
- Update status: Pending → Confirmed → Completed
- See contact info (phone, email)
- Filter by status

**Handle Messages:**
- Read contact form submissions
- Mark as read/responded
- View full message details

### Verify in Database
```powershell
# Open MongoDB shell
mongosh

# Switch to app database
use kasturi-ayurveda

# View appointments
db.appointments.find().pretty()

# View contacts
db.contacts.find().pretty()

# View admin users
db.users.find().pretty()
```

---

## 📁 Project Structure

```
kasturi-ayurveda/
├── backend/                      # Node.js + Express API
│   ├── src/
│   │   ├── config/              # Database connection
│   │   ├── controllers/         # Business logic
│   │   │   ├── appointment.controller.ts
│   │   │   ├── contact.controller.ts
│   │   │   └── auth.controller.ts
│   │   ├── middleware/          # Auth & error handling
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── models/              # MongoDB schemas
│   │   │   ├── Appointment.model.ts
│   │   │   ├── Contact.model.ts
│   │   │   └── User.model.ts
│   │   ├── routes/              # API routes
│   │   ├── scripts/             # Utility scripts
│   │   │   └── createAdmin.ts
│   │   ├── utils/               # Email service
│   │   │   └── email.util.ts
│   │   └── server.ts            # Express app entry
│   ├── .env                     # Backend config
│   ├── package.json
│   └── tsconfig.json
│
├── src/                         # React frontend
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── ErrorBoundary.tsx
│   ├── pages/                   # Routes
│   │   ├── Index.tsx            # Home
│   │   ├── Booking.tsx          # Appointment booking
│   │   ├── Contact.tsx          # Contact form
│   │   ├── Dashboard.tsx        # Admin panel
│   │   ├── About.tsx
│   │   ├── Services.tsx
│   │   └── NotFound.tsx
│   ├── constants/               # App constants
│   │   ├── navigation.ts
│   │   └── testimonials.ts
│   ├── hooks/                   # Custom hooks
│   │   ├── use-seo.tsx
│   │   └── use-toast.ts
│   ├── lib/                     # Utilities
│   ├── App.tsx
│   └── main.tsx
│
├── public/                      # Static assets
├── .env                         # Frontend config
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── README.md                    # This file
└── DEPLOYMENT.md                # Deployment guide
```

---

## 🌐 API Documentation

### Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

### Public Endpoints

#### Book Appointment
```http
POST /api/appointments
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "service": "Consultation",
  "preferredDoctor": "Dr. Meera Sharma",
  "appointmentDate": "2025-12-01",
  "appointmentTime": "10:00 AM",
  "symptoms": "Back pain",
  "age": 35
}
```

#### Submit Contact Form
```http
POST /api/contact
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "9876543210",
  "subject": "Inquiry",
  "message": "I would like to know more about Panchakarma"
}
```

### Protected Endpoints (Require JWT)

#### Admin Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@kasturiayurveda.com",
  "password": "Admin@123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "data": { "id": "...", "email": "...", "role": "admin" }
}
```

#### Get All Appointments
```http
GET /api/appointments?status=pending&limit=10
Authorization: Bearer <token>
```

#### Update Appointment Status
```http
PUT /api/appointments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "confirmed"
}
```

---

## 🔧 Available Scripts

### Root (Frontend)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview prod build |
| `npm run lint` | Check code quality |
| `npm run lint:fix` | Fix linting issues |
| `npm run type-check` | Validate TypeScript |
| `npm run dev:all` | Run both servers |
| `npm run build:all` | Build both apps |

### Backend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start with ts-node-dev |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm run type-check` | Check types |

---

## 🚀 Deployment

For comprehensive deployment instructions, see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

### Quick Deployment Options

#### 🌟 Recommended: Vercel + Railway
1. **Backend on Railway**:
   - Connect GitHub repo
   - Add MongoDB service
   - Set environment variables
   - Deploy from `backend/` directory

2. **Frontend on Vercel**:
   - Import GitHub repo
   - Add `VITE_API_URL` env var
   - Deploy automatically

#### Other Options
- **Netlify + Render** - Similar to Vercel + Railway
- **VPS** - Full control (DigitalOcean, AWS, Hetzner)
- **Docker** - Containerized deployment

---

## 📧 Email Setup (Gmail)

1. **Enable 2-Step Verification** on Google Account
2. **Generate App Password**:
   - Google Account → Security → 2-Step Verification
   - Scroll to "App passwords"
   - Select "Mail" and device
   - Copy 16-character password
3. **Add to backend/.env**:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=abcd efgh ijkl mnop  # (16 chars)
   ```

---

## 🧪 Testing

### Manual Testing Checklist

**Frontend:**
- [ ] Homepage loads correctly
- [ ] Navigation works on all pages
- [ ] Responsive on mobile/tablet/desktop
- [ ] Booking form validates inputs
- [ ] Contact form submits successfully
- [ ] Dashboard login works
- [ ] Admin can view appointments

**Backend:**
- [ ] Health endpoint responds: `/api/health`
- [ ] Can create appointment via API
- [ ] Email confirmation received
- [ ] Admin login returns JWT token
- [ ] Protected routes require auth
- [ ] Appointment status updates
- [ ] Contact messages save to DB

### Database Verification
```powershell
mongosh
use kasturi-ayurveda

# Count documents
db.appointments.countDocuments()
db.contacts.countDocuments()
db.users.countDocuments()

# View latest appointment
db.appointments.find().sort({createdAt: -1}).limit(1).pretty()
```

---

## 🐛 Troubleshooting

### Problem: Backend won't start

**Solution:**
```powershell
# 1. Check MongoDB
Get-Service -Name MongoDB*
Start-Service MongoDB  # if stopped

# 2. Check port 5000
netstat -ano | findstr :5000
# Kill process if occupied: taskkill /PID <pid> /F

# 3. Verify .env file
cd backend
type .env  # Check all variables are set
```

### Problem: Emails not sending

**Checklist:**
- ✅ Using Gmail App Password (16 chars, NOT regular password)
- ✅ No spaces in password
- ✅ EMAIL_USER matches the Gmail account
- ✅ 2-Step Verification enabled on Google Account
- ✅ Check spam folder for test emails

**Test SMTP:**
```powershell
cd backend
node -e "require('nodemailer').createTransport({host:'smtp.gmail.com',port:587,auth:{user:'YOUR_EMAIL',pass:'APP_PASSWORD'}}).verify(console.log)"
```

### Problem: Frontend can't connect to backend

**Solutions:**
```powershell
# 1. Verify backend is running
curl http://localhost:5000/api/health

# 2. Check VITE_API_URL
type .env  # Should be: http://localhost:5000/api

# 3. Check CORS settings in backend/.env
# CORS_ORIGIN should match frontend URL

# 4. Clear browser cache
# Ctrl + Shift + Delete → Clear cache

# 5. Restart both servers
```

### Problem: MongoDB connection failed

**Solutions:**
```powershell
# 1. Test MongoDB
mongosh --eval "db.adminCommand('ping')"

# 2. Check service
Get-Service MongoDB*
Restart-Service MongoDB

# 3. Verify connection string
# MONGODB_URI=mongodb://localhost:27017/kasturi-ayurveda

# 4. Check MongoDB logs
Get-Content "C:\Program Files\MongoDB\Server\7.0\log\mongod.log" -Tail 50
```

---

## 🔒 Security Best Practices

Before deploying to production:

- [ ] Change `JWT_SECRET` to 64+ character random string
- [ ] Use strong `ADMIN_PASSWORD` (12+ chars, mixed case, numbers, symbols)
- [ ] Update `CORS_ORIGIN` to production domain only
- [ ] Set `NODE_ENV=production`
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS (SSL certificate)
- [ ] Set up rate limiting (already configured)
- [ ] Enable Helmet security headers (already configured)
- [ ] Regular database backups
- [ ] Monitor logs for suspicious activity

---

## 📊 Performance Optimization

Already implemented:
- ✅ **Code Splitting** - Lazy loading all routes
- ✅ **Image Optimization** - Proper formats and lazy loading
- ✅ **Bundle Size** - Tree-shaking and minification
- ✅ **Caching** - React Query with stale-while-revalidate
- ✅ **Compression** - Gzip/Brotli enabled
- ✅ **CDN Ready** - Static assets optimized

---

## 📞 Contact & Support

**Kasturi Ayurveda**
- 📧 Email: kasturiayurvedahyd@gmail.com
- 📱 Phone: 8247736253
- 💬 WhatsApp: [Click to chat](https://wa.me/918247736253)
- 📍 Location: Hyderabad, Telangana, India
- 🕐 Hours: 10 AM – 2 PM, 6 PM – 9 PM (All Days)

---

## 📄 License

**Proprietary** - © 2025 Kasturi Ayurveda. All rights reserved.

This software is the property of Kasturi Ayurveda. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

---

## 🙏 Acknowledgments

Built with modern technologies:
- [React](https://react.dev/) - UI framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Express](https://expressjs.com/) - Backend framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Nodemailer](https://nodemailer.com/) - Email service

---

## 📝 Changelog

### Version 1.0.0 (2025-11-26)
- ✨ Initial release
- 🎨 Modern frontend with React + TypeScript
- 🔐 Secure backend with JWT authentication
- 📧 Email notification system
- 📊 Admin dashboard
- 📱 Fully responsive design
- ♿ WCAG 2.1 AA accessibility
- 🚀 Production-ready deployment

---

**Made with ❤️ for Kasturi Ayurveda, Hyderabad**

*Bringing ancient Ayurvedic wisdom to the modern web* 🌿
