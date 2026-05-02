# Migration Guide - QRForge v2 Updates

This document outlines all the changes and how to migrate from the previous version.

## Database Migrations

You must run database migrations to add the new tables and columns:

```bash
# Generate Prisma client with new schema
npm run db:generate

# Push schema changes to your database
npm run db:push

# OR if you prefer migrations:
npx prisma migrate dev --name add-coupons-and-smtp
```

## New Dependencies

Install the new package:

```bash
npm install docx@^8.5.0
```

Or just run:

```bash
npm install
```

## Environment Variables (Optional)

The SMTP configuration is now managed via the admin panel, but you can still use `.env` as a fallback:

```env
# Existing SMTP vars (optional - can be configured via admin panel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=QRForge <noreply@qrforge.app>
SMTP_TLS_REJECT_UNAUTHORIZED=true

# Payment (existing)
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret

# Database (existing)
DATABASE_URL=postgresql://...
```

## New Features

### 1. **Word Document Export for Bulk QR Codes**
- Users can now export bulk QR codes as `.docx` files instead of just ZIP or Excel
- The Word document displays QR codes in a clean 2-column table with labels and content
- Professional formatting with headers and footers

### 2. **Email Campaign Integration**
- **Bulk QR Generation**: Added email sending option during bulk generation
  - Mandatory email column when email sending is enabled
  - Each QR code is sent to the corresponding email address
  - Customizable email subject and body
  
- **Single QR Generation**: Added "Send via Email" panel after generating
  - Send individual QR codes directly to recipients
  - Customizable subject, body, recipient name/email

### 3. **Smart File Upload Progress**
- **No more line-by-line UI rendering** for large CSV/Excel uploads
- Shows a clean summary view for files with 50+ rows
- Progress bar during QR generation instead of blocking the UI
- Column mapper only shows preview (first 5 rows)

### 4. **Discount Coupon Manager** (Admin Panel)
- Full CRUD for discount coupons
- Percentage or fixed amount discounts
- Usage limits (max uses tracking)
- Expiration dates
- Plan-specific coupons (all/starter/pro/business)
- Active/inactive toggle
- One-click code copying

### 5. **SMTP Configuration UI** (Admin Panel)
- Configure SMTP server directly from the admin panel
- Overrides `.env` variables when enabled
- Test connection button
- Support for:
  - Gmail, Mailgun, SendGrid
  - Self-hosted SMTP (Postfix, Postal, Mailcow)
  - Optional authentication (for trusted relays)
- TLS/SSL toggle
- Certificate verification toggle (for self-signed certs)

## Database Schema Changes

### New Tables

1. **DiscountCoupon**
   - `id`, `code`, `description`
   - `discountType` (percentage | fixed)
   - `discountValue`, `maxUses`, `usedCount`
   - `expiresAt`, `isActive`, `applicableTo`

2. **SmtpConfig**
   - `id`, `host`, `port`, `secure`
   - `user`, `password`, `fromEmail`, `fromName`
   - `rejectUnauthorized`, `isActive`

### Modified Tables

**Payment** table now includes:
- `couponCode` (String, optional)
- `discountAmount` (Float, optional)

## API Changes

### New Routes

1. **`/api/admin/coupons`**
   - GET: List all coupons
   - POST: Create coupon
   - PATCH: Update coupon
   - DELETE: Delete coupon

2. **`/api/admin/smtp-config`**
   - GET: Get current SMTP config
   - POST: Save SMTP config
   - DELETE: Clear SMTP config (fallback to .env)

3. **`/api/qr/send-single`**
   - POST: Send a single QR code via email

### Modified Routes

**`/api/qr/bulk`** now supports:
- `exportFormat: 'zip' | 'docx'` (previously only 'zip' | 'xlsx')
- `sendEmails: boolean`
- `emailSubject: string`
- `emailBody: string`
- Items can include `email` field

## UI Changes

### Bulk Page (`/dashboard/bulk`)
- Added export format selector (ZIP or Word)
- Added email campaign toggle with subject/body inputs
- Email column mapping support
- Smart preview for large files (50+ rows)
- Clean progress bar with percentage
- Summary card for large datasets instead of full row listing

### Generate Page (`/dashboard/generate`)
- Added "Send via Email" panel after QR generation
- Send individual QR codes directly to recipients

### Admin Page (`/dashboard/admin`)
- New "Coupons" tab with full coupon management
- New "SMTP" tab with server configuration
- Improved responsive design
- Better loading states

## Migration Steps

1. **Backup your database**
   ```bash
   pg_dump your_database > backup.sql
   ```

2. **Pull the new code**
   ```bash
   cd qrforge-v2
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Run database migrations**
   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Restart the application**
   ```bash
   npm run build
   npm start
   # OR with PM2:
   pm2 restart qrforge
   ```

6. **Configure SMTP (Admin Panel)**
   - Log in as admin
   - Go to Admin → SMTP tab
   - Add your SMTP server details
   - Test connection
   - Save configuration

7. **Create discount coupons (Optional)**
   - Go to Admin → Coupons tab
   - Create promotional coupons

## Testing Checklist

- [ ] Bulk QR generation with Word export works
- [ ] Bulk QR generation with email sending works
- [ ] Single QR generation with email sending works
- [ ] Large file uploads (500+ rows) display summary view
- [ ] Column mapper correctly identifies email columns
- [ ] Admin can create/edit/delete coupons
- [ ] Admin can configure SMTP settings
- [ ] SMTP test connection button works
- [ ] Emails are sent using configured SMTP server

## Rollback

If you need to rollback:

1. Restore database backup
2. Checkout previous commit
3. Run `npm install` and `npm run db:generate`
4. Restart application

## Support

If you encounter issues:
1. Check console logs: `pm2 logs qrforge`
2. Check database connection
3. Verify SMTP configuration
4. Review the CHANGES.md file for detailed technical changes
