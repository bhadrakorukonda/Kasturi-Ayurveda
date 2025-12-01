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

4. Update `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kasturi-ayurveda
JWT_SECRET=your-secret-key
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

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

| Variable | Description | Required |
|----------|-------------|----------|
| NODE_ENV | Environment (development/production) | Yes |
| PORT | Server port | Yes |
| MONGODB_URI | MongoDB connection string | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| JWT_EXPIRE | JWT expiration time | Yes |
| EMAIL_HOST | SMTP host | Yes |
| EMAIL_PORT | SMTP port | Yes |
| EMAIL_USER | SMTP username | Yes |
| EMAIL_PASSWORD | SMTP password | Yes |
| EMAIL_FROM | From email address | Yes |
| CORS_ORIGIN | Allowed CORS origin | Yes |

## 📄 License

Copyright © 2025 Kasturi Ayurveda. All rights reserved.
