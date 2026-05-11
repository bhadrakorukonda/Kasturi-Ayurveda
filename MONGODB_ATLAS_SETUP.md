# MongoDB Atlas Setup Guide

## Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with:
   - Your email
   - Or Google/GitHub account (easier)
3. Choose **FREE** tier (M0 Sandbox - perfect for development)

## Step 2: Create a New Cluster

1. After login, click **"Build a Database"** or **"Create"**
2. Choose **FREE** tier (M0 - 512MB storage)
3. Select **AWS** as provider
4. Choose a region closest to you (e.g., Mumbai for India)
5. Cluster Name: Leave default or name it "KasturiAyurveda"
6. Click **"Create Cluster"** (takes 3-5 minutes)

## Step 3: Create Database User

While cluster is being created:

1. Click **"Database Access"** in left sidebar (under Security)
2. Click **"Add New Database User"**
3. Authentication Method: **Password**
4. Username: `kasturi_admin` (or your choice)
5. Password: Click **"Autogenerate Secure Password"** and **COPY IT IMMEDIATELY**
   - Or create your own strong password
   - **SAVE THIS PASSWORD** - you'll need it in .env file
6. Database User Privileges: **"Read and write to any database"**
7. Click **"Add User"**

## Step 4: Configure Network Access

1. Click **"Network Access"** in left sidebar (under Security)
2. Click **"Add IP Address"**
3. For development, choose one of:
   - **"Allow Access from Anywhere"** - Enter: `0.0.0.0/0` (easiest for testing)
   - Or add your current IP address (more secure)
4. Click **"Confirm"**

⚠️ **Note**: For production, restrict to specific IPs or use cloud provider IPs

## Step 5: Get Connection String

1. Go back to **"Database"** in left sidebar
2. Your cluster should be ready (green dot)
3. Click **"Connect"** button
4. Choose **"Connect your application"**
5. Driver: **Node.js**, Version: **5.5 or later**
6. Copy the connection string - looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
7. **IMPORTANT**: Replace `<username>` and `<password>` with your actual credentials

### Example Connection String:
```
mongodb+srv://kasturi_admin:YourPassword123@cluster0.abc123.mongodb.net/kasturi-ayurveda?retryWrites=true&w=majority
```

**Note**: Add `/kasturi-ayurveda` before the `?` to specify your database name

## Step 6: Update Backend .env File

Replace the local MongoDB URI with Atlas URI:

```env
# Old (local):
MONGODB_URI=mongodb://localhost:27017/kasturi-ayurveda

# New (Atlas):
MONGODB_URI=mongodb+srv://kasturi_admin:YourPassword123@cluster0.abc123.mongodb.net/kasturi-ayurveda?retryWrites=true&w=majority
```

## Step 7: Test Connection

1. Stop your backend server (Ctrl+C in PowerShell)
2. Restart backend:
   ```powershell
   cd "h:\Random projects\Kasturi Ayurveda\backend"
   node dist/server.js
   ```
3. You should see: **"✓ MongoDB connected successfully"**
4. Test booking form - data will now save to Atlas!

## Step 8: View Data in Atlas

1. Go to **"Database"** → **"Browse Collections"**
2. You should see your database: `kasturi-ayurveda`
3. Collections: `appointments`, `contacts`, `users`
4. You can view, edit, delete data directly from here

---

## 🎯 Quick Checklist

- [ ] Created MongoDB Atlas account
- [ ] Created M0 FREE cluster
- [ ] Created database user with password
- [ ] Allowed network access (0.0.0.0/0 for now)
- [ ] Copied connection string
- [ ] Updated backend/.env with new MONGODB_URI
- [ ] Restarted backend server
- [ ] Tested connection (booking form works)
- [ ] Verified data appears in Atlas dashboard

---

## 🔒 Security Tips for Production

1. **IP Whitelist**: Restrict to your hosting provider's IPs
2. **Strong Passwords**: Use complex passwords for database users
3. **Environment Variables**: Never commit .env files to Git
4. **Separate Clusters**: Use different clusters for dev/staging/production
5. **Backup**: Enable automated backups (paid feature)

---

## 📞 Need Help?

- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Connection Issues: Check username, password, and network access
- Cluster Status: Should show green dot when ready

---

**Created**: Dec 24, 2025
**For**: Kasturi Ayurveda Backend Migration
