# BulkXQR — Professional QR Code Platform

## Quick Start (Local Development)

### Windows
```
Double-click setup.bat
```

### Mac / Linux
```bash
bash setup.sh
```

### Manual Steps
```bash
# 1. Copy env file
cp .env.example .env

# 2. Edit .env — fill in ALL values (see below)

# 3. Install dependencies
npm install

# 4. Generate Prisma client + push DB schema  ← REQUIRED before first run
./node_modules/.bin/prisma generate
npx prisma db push

# 5. Start dev server
npm run dev
```

## ⚠️ Most Common Error Fix

**"The table public.Account does not exist"**

This means you skipped the database setup step. Run:
```bash
npx prisma db push
```

## Environment Variables (.env)

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | PostgreSQL URL: `postgresql://user:pass@localhost:5432/BulkXQR_db` |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` (dev) or `https://yourdomain.com` (prod) |
| `GOOGLE_CLIENT_ID` | console.cloud.google.com → Credentials |
| `GOOGLE_CLIENT_SECRET` | console.cloud.google.com → Credentials |
| `RAZORPAY_KEY_ID` | dashboard.razorpay.com → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | dashboard.razorpay.com → Settings → API Keys |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Same as RAZORPAY_KEY_ID |
| `SMTP_HOST` | e.g., `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your email address |
| `SMTP_PASS` | Gmail App Password (16 chars) |
| `SMTP_FROM` | `BulkXQR <you@gmail.com>` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (dev) |

## Google OAuth Redirect URI

Add this to Google Cloud Console → Credentials → OAuth client:
```
http://localhost:3000/api/auth/callback/google   (development)
https://yourdomain.com/api/auth/callback/google  (production)
```

## Production Deployment (Azure VPS)

See the Installation Guide PDF/DOCX for full step-by-step Azure + GitHub CI/CD instructions.

```bash
# On your VPS as root:
bash scripts/setup-vps.sh yourdomain.com admin@yourdomain.com
```
