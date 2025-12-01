# Kasturi Ayurveda - Deployment Guide

## 🎯 Application Overview

**Kasturi Ayurveda** is a full-stack web application for an Ayurvedic clinic with:
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript + MongoDB
- **Features**: Appointment booking, contact forms, admin dashboard, email notifications

---

## 📋 Prerequisites

- Node.js 18+ installed
- MongoDB installed and running
- Gmail account with App Password enabled
- Git installed

---

## 🚀 Local Development Setup

### 1. Clone and Install

```bash
# Navigate to project
cd "h:\Random projects\Kasturi Ayurveda"

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Environment Variables

#### Frontend (.env in root)
```env
VITE_API_URL=http://localhost:5000/api
```

#### Backend (.env in backend/)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kasturi-ayurveda
JWT_SECRET=your-super-secret-jwt-key-change-this
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=kasturiayurvedahyd@gmail.com
EMAIL_PASSWORD=your-app-password-here
CORS_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@kasturiayurveda.com
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Admin
```

### 3. Start MongoDB (if not running)

```powershell
# Check if MongoDB is running
Get-Service -Name MongoDB*

# If not running, start it
Start-Service MongoDB
```

### 4. Create Admin User

```bash
cd backend
npx ts-node src/scripts/createAdmin.ts
cd ..
```

### 5. Run Application

**Option A: Run Both Servers Separately**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend (new terminal)
npm run dev
```

**Option B: Create Concurrent Script**

Add to root `package.json`:
```json
"scripts": {
  "dev:all": "concurrently \"cd backend && npm run dev\" \"npm run dev\"",
  "build:all": "npm run build && cd backend && npm run build"
}
```

Then install concurrently: `npm install -D concurrently`

Run both: `npm run dev:all`

### 6. Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Admin Dashboard**: http://localhost:5173/dashboard
  - Email: admin@kasturiayurveda.com
  - Password: (from .env ADMIN_PASSWORD)

---

## 🌐 Production Deployment

### Option 1: Vercel (Frontend) + Railway (Backend)

#### **Deploy Backend to Railway**

1. **Create Railway Account**: https://railway.app
2. **Create New Project** → Deploy from GitHub
3. **Add MongoDB Database**: 
   - Click "New" → Database → MongoDB
   - Copy the `MONGODB_URL` connection string
4. **Add Environment Variables**:
   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=<your-railway-mongodb-url>
   JWT_SECRET=<generate-random-64-char-string>
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=kasturiayurvedahyd@gmail.com
   EMAIL_PASSWORD=<your-gmail-app-password>
   CORS_ORIGIN=https://your-vercel-domain.vercel.app
   ADMIN_EMAIL=admin@kasturiayurveda.com
   ADMIN_PASSWORD=<strong-password>
   ADMIN_NAME=Admin
   ```
5. **Deploy Settings**:
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Start Command: `npm start`
6. **Get Backend URL**: e.g., `https://kasturi-ayurveda-backend.up.railway.app`
7. **Create Admin**: Run command in Railway terminal:
   ```bash
   npx ts-node src/scripts/createAdmin.ts
   ```

#### **Deploy Frontend to Vercel**

1. **Create Vercel Account**: https://vercel.com
2. **Import GitHub Repository**
3. **Configure Build Settings**:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Add Environment Variables**:
   ```
   VITE_API_URL=https://kasturi-ayurveda-backend.up.railway.app/api
   ```
5. **Deploy**: Click "Deploy"
6. **Update Backend CORS**: Go back to Railway and update `CORS_ORIGIN` to your Vercel URL

---

### Option 2: Netlify (Frontend) + Render (Backend)

#### **Deploy Backend to Render**

1. **Create Render Account**: https://render.com
2. **New Web Service** → Connect GitHub repo
3. **Configure**:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. **Add MongoDB**:
   - Use MongoDB Atlas (free tier)
   - Get connection string from atlas.mongodb.com
5. **Environment Variables**: Same as Railway above
6. **Deploy** and get backend URL

#### **Deploy Frontend to Netlify**

1. **Create Netlify Account**: https://netlify.com
2. **New Site from Git** → Connect repo
3. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Environment Variables**:
   ```
   VITE_API_URL=https://your-render-backend.onrender.com/api
   ```
5. **Deploy**

---

### Option 3: Single VPS (DigitalOcean/AWS/Hetzner)

#### **1. Server Setup**

```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org

# Start MongoDB
systemctl start mongod
systemctl enable mongod

# Install Nginx
apt install -y nginx

# Install PM2 globally
npm install -g pm2
```

#### **2. Deploy Application**

```bash
# Create app directory
mkdir -p /var/www/kasturi-ayurveda
cd /var/www/kasturi-ayurveda

# Clone repository (or upload via SCP)
git clone <your-repo-url> .

# Install dependencies
npm install
cd backend && npm install && cd ..

# Create .env files (use .env.example as template)
nano backend/.env  # Fill in production values

# Build both
npm run build
cd backend && npm run build && cd ..

# Start backend with PM2
cd backend
pm2 start dist/server.js --name kasturi-backend
pm2 save
pm2 startup

# Create admin user
npx ts-node src/scripts/createAdmin.ts
cd ..
```

#### **3. Configure Nginx**

```bash
nano /etc/nginx/sites-available/kasturi-ayurveda
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend
    location / {
        root /var/www/kasturi-ayurveda/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/kasturi-ayurveda /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### **4. SSL Certificate (Let's Encrypt)**

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 🔒 Production Security Checklist

- [ ] Change `JWT_SECRET` to strong random string (64+ characters)
- [ ] Change `ADMIN_PASSWORD` to strong password
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS (SSL certificate)
- [ ] Update `CORS_ORIGIN` to production domain only
- [ ] Set `NODE_ENV=production` in backend
- [ ] Enable MongoDB authentication
- [ ] Use Gmail App Password (16 characters, not regular password)
- [ ] Set up firewall rules (UFW or cloud provider firewall)
- [ ] Regular backups of MongoDB database
- [ ] Rate limiting enabled (already configured in backend)
- [ ] Helmet security headers enabled (already configured)

---

## 📊 MongoDB Backup

### Manual Backup
```bash
mongodump --uri="mongodb://localhost:27017/kasturi-ayurveda" --out=/backup/$(date +%Y%m%d)
```

### Restore
```bash
mongorestore --uri="mongodb://localhost:27017/kasturi-ayurveda" /backup/20250126/kasturi-ayurveda
```

### Automated Daily Backup (Cron)
```bash
crontab -e
```
Add:
```
0 2 * * * mongodump --uri="mongodb://localhost:27017/kasturi-ayurveda" --out=/backup/$(date +\%Y\%m\%d)
```

---

## 🧪 Testing After Deployment

1. **Health Check**: Visit `https://your-domain.com/api/health`
2. **Book Appointment**: Fill form at `/booking`
3. **Check Email**: Verify confirmation email received
4. **Admin Login**: Go to `/dashboard`, login with admin credentials
5. **View Appointment**: Check dashboard shows the new appointment
6. **Update Status**: Change appointment status to "Confirmed"
7. **Test Contact Form**: Submit message at `/contact`

---

## 📝 Maintenance Commands

### Update Application
```bash
cd /var/www/kasturi-ayurveda
git pull
npm install
npm run build
cd backend && npm install && npm run build
pm2 restart kasturi-backend
```

### View Logs
```bash
# Backend logs
pm2 logs kasturi-backend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

### Monitor Application
```bash
pm2 monit
pm2 status
```

---

## 🆘 Troubleshooting

### Backend Won't Start
- Check MongoDB is running: `systemctl status mongod`
- Check port 5000 not in use: `netstat -tuln | grep 5000`
- Check environment variables: `cat backend/.env`
- Check logs: `pm2 logs kasturi-backend`

### Emails Not Sending
- Verify Gmail App Password (16 characters, no spaces)
- Check EMAIL_USER and EMAIL_PASSWORD in .env
- Test SMTP: Use online SMTP tester
- Check spam folder

### Database Connection Failed
- Verify MongoDB running: `mongo --eval "db.adminCommand('ping')"`
- Check MONGODB_URI format
- Check MongoDB authentication settings

### CORS Errors
- Update CORS_ORIGIN in backend .env to match frontend domain
- Restart backend after changes
- Clear browser cache

---

## 📞 Support

For issues or questions:
- Email: kasturiayurvedahyd@gmail.com
- Phone: 8247736253
- WhatsApp: https://wa.me/918247736253

---

## 📄 License

Proprietary - Kasturi Ayurveda © 2025
