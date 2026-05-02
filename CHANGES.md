# BulkXQR — What Was Fixed

## 🔴 Payment 401 Error (Authentication Failed)

**Root cause:** `razorpay.ts` created the Razorpay client at module load time.
If `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` were missing or still set to the
placeholder values from `.env.example`, every request to Razorpay's API would
return `401 BAD_REQUEST_ERROR: Authentication failed`.

**Fix:**
- Switched to **lazy initialization** — the Razorpay instance is created on first
  use, not at import time, so the server starts cleanly even with missing keys.
- Added **key validation** — throws a clear error message instead of a cryptic 401
  if keys are missing or still set to the example placeholder.
- The `/api/payment/create-order` route now surfaces config errors to the UI
  with a human-readable message.

**Action required — add real keys to `.env`:**
```
RAZORPAY_KEY_ID=rzp_test_YOUR_ACTUAL_KEY
RAZORPAY_KEY_SECRET=YOUR_ACTUAL_SECRET
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_YOUR_ACTUAL_KEY
```
Get keys from: https://dashboard.razorpay.com/app/keys

---

## 📊 Bulk Upload — Column Mapping

**Before:** File parsing was hardcoded — column 0 = label, column 1 = content.
Any file with a different structure produced garbage results.

**After:**
- After dropping/selecting a file, a **column mapping modal** appears.
- User can pick which column maps to **QR Content** and which to **Label**.
- A live preview table highlights the selected columns.
- Works for `.xlsx`, `.xls`, `.csv`, and `.txt`.
- A "Re-map columns" button lets users reconfigure without re-uploading.
- Added QR **size** control (100–1000 px).

---

## 🛡️ Admin Panel

A full admin panel at `/dashboard/admin` (visible only to admins).

### How to make someone an admin
Add their email to `.env`:
```
ADMIN_EMAILS="admin@yourdomain.com,other@yourdomain.com"
```
They'll be auto-promoted on next login.

### Admin can:
- **Overview tab** — platform stats (users, QR codes, revenue, plan distribution,
  recent signups, recent payments)
- **Users tab** — search all users, paginated table
- **Manage any user** — click "Manage" to open a panel where you can:
  - Set their subscription plan (free / starter / pro / business) instantly,
    no payment required
  - Toggle their role between `user` and `admin`
  - Revoke a paid plan back to free

### Prisma migration required
```bash
bash scripts/migrate-add-role.sh
# or manually:
npx prisma migrate dev --name add_user_role
```

---

## 🎨 UI Improvements

- Sidebar shows admin badge (🛡) next to name for admin users.
- Admin nav section only appears for admins.
- Bulk page: row delete buttons only appear on hover (cleaner look).
- Payment errors in Settings now detect config issues and show a helpful message.
- Loading skeletons in admin users table.
- Toast notifications in admin panel for all actions.
