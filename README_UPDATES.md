# QRForge v2 - Major Updates

## 🎯 What's New

### 1. **Word Document Export** 📄
Generate bulk QR codes as professionally formatted Word documents:
- Clean 2-column layout with QR codes, labels, and content
- Perfect for printing and sharing
- Embedded QR code images at optimal size
- Professional headers and footers

**How to use:**
1. Go to Bulk QR Generator
2. Upload your CSV/Excel or enter data manually
3. Select "Word Document" as export format
4. Click Generate

### 2. **Email Campaigns** ✉️
Send QR codes directly to recipients via email:

**Bulk Email Sending:**
1. Upload CSV/Excel with an email column
2. Map the email column in the column mapper
3. Toggle "Send via Email" ON
4. Customize subject and message
5. Generate - QR codes will be emailed automatically

**Single Email Sending:**
1. Generate a QR code
2. Click "Send Email" button
3. Enter recipient details
4. Send!

### 3. **Smart File Uploads** 🚀
No more UI freezing with large files:
- Clean column mapping interface (shows only preview)
- Summary view for 50+ row files
- Progress bar during generation
- Total row count displayed prominently
- No line-by-line rendering = better performance

### 4. **Discount Coupon System** 🏷️
(Admin only)
- Create percentage or fixed-amount coupons
- Set usage limits and expiration dates
- Plan-specific coupons
- Track usage in real-time
- One-click code copying

**How to use:**
1. Admin Panel → Coupons tab
2. Click "New Coupon"
3. Set code, discount, and limits
4. Save and share with users

### 5. **SMTP Configuration UI** 📧
(Admin only)
Configure email server without touching code:
- Visual SMTP configuration panel
- Test connection button
- Support for Gmail, Mailgun, SendGrid, self-hosted
- Overrides .env settings when enabled
- TLS/SSL and certificate verification toggles

**Supports:**
- Gmail (with app passwords)
- Commercial SMTP providers
- Self-hosted servers (Postfix, Postal, Mailcow)
- Trusted relay configurations

## 📋 Quick Start

### For Users

**Generate Bulk QR Codes as Word Document:**
```
1. Dashboard → Bulk QR Generator
2. Upload Excel/CSV or enter manually
3. Choose "Word Document" format
4. Click Generate → Download .docx file
```

**Send QR Codes via Email:**
```
Bulk:
1. Upload file with email column
2. Map email column
3. Toggle email sending ON
4. Customize message
5. Generate

Single:
1. Generate QR code
2. Click "Send via Email"
3. Enter recipient info
4. Send
```

### For Admins

**Setup SMTP:**
```
1. Admin Panel → SMTP tab
2. Enter server details:
   - Host: smtp.gmail.com (or your server)
   - Port: 587
   - Username & Password
   - From Email & Name
3. Test Connection
4. Save
```

**Create Coupons:**
```
1. Admin Panel → Coupons tab
2. New Coupon
3. Code: SUMMER25
4. Discount: 25% or ₹500
5. Max Uses: 100
6. Expires: [date]
7. Save
```

## 🔧 Technical Details

### File Formats Supported
- **Input:** CSV, TXT, XLSX, XLS
- **Output:** ZIP (PNGs), Word (.docx), Excel (.xlsx - legacy)

### Email Features
- HTML email templates with QR code embedded
- Customizable subject and body
- Batch sending with progress tracking
- Individual or bulk sending

### Performance Improvements
- Large file handling (tested with 1000+ rows)
- Non-blocking UI during generation
- Clean progress indicators
- Efficient column mapping

### Admin Features
- Coupon management with usage tracking
- SMTP configuration with testing
- User management (existing)
- Platform statistics (existing)

## 📊 Comparison: Before vs After

| Feature | Before | After |
|---------|--------|-------|
| Bulk Export | ZIP, Excel | ZIP, **Word**, Excel |
| Email QR Codes | Via campaigns only | **Bulk + Single send** |
| Large File Upload | Slow, UI freezes | **Smart preview, fast** |
| SMTP Config | .env only | **.env + Admin UI** |
| Discount Coupons | ❌ | ✅ **Full manager** |
| Progress Feedback | Loading spinner | **Progress bar + %** |

## 🎨 UI Improvements

- Clean column mapping modal with color-coded columns
- Summary cards for large datasets
- Progress bars with percentages
- Email toggle with inline configuration
- Tabbed admin panel (Overview, Users, Coupons, SMTP)
- Responsive design for mobile/desktop

## 🛠️ For Developers

See `MIGRATION.md` for detailed migration instructions.

### Key Files Changed
- `prisma/schema.prisma` - New tables
- `src/app/api/qr/bulk/route.ts` - Word export + email
- `src/app/api/qr/send-single/route.ts` - New endpoint
- `src/app/api/admin/coupons/route.ts` - New endpoint
- `src/app/api/admin/smtp-config/route.ts` - New endpoint
- `src/lib/mailer.ts` - DB SMTP config support
- `src/app/dashboard/bulk/page.tsx` - Major UI updates
- `src/app/dashboard/generate/page.tsx` - Email send panel
- `src/app/dashboard/admin/page.tsx` - New tabs

### New Dependencies
- `docx@^8.5.0` - Word document generation

## 📝 Notes

- Email column is **mandatory** when bulk email sending is enabled
- Word documents embed QR codes as images (not dynamic)
- SMTP config from admin panel overrides .env settings
- Coupons are validated during payment processing
- Large files (50+ rows) show summary view for better UX

## 🐛 Bug Fixes

- Fixed: Line-by-line rendering causing UI freeze on large uploads
- Fixed: Progress not shown during bulk generation
- Fixed: Email column not being validated
- Improved: Error handling for SMTP failures
- Improved: File upload feedback and validation

## 🔐 Security

- SMTP passwords are masked in UI
- Admin-only access to coupons and SMTP config
- Email validation before sending
- Rate limiting on bulk operations (existing)

## 📞 Support

For issues or questions:
1. Check `MIGRATION.md` for setup instructions
2. Review console logs for errors
3. Test SMTP connection in admin panel
4. Verify database migrations ran successfully
