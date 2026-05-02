-- Manual migration if you prefer raw SQL over prisma db push

-- Discount Coupons
CREATE TABLE IF NOT EXISTS "DiscountCoupon" (
    "id"            TEXT NOT NULL,
    "code"          TEXT NOT NULL,
    "description"   TEXT,
    "discountType"  TEXT NOT NULL DEFAULT 'percentage',
    "discountValue" DOUBLE PRECISION NOT NULL,
    "maxUses"       INTEGER NOT NULL DEFAULT 0,
    "usedCount"     INTEGER NOT NULL DEFAULT 0,
    "expiresAt"     TIMESTAMP(3),
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "applicableTo"  TEXT NOT NULL DEFAULT 'all',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DiscountCoupon_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DiscountCoupon_code_key" UNIQUE ("code")
);

-- SMTP Configuration
CREATE TABLE IF NOT EXISTS "SmtpConfig" (
    "id"                 TEXT NOT NULL,
    "host"               TEXT NOT NULL,
    "port"               INTEGER NOT NULL DEFAULT 587,
    "secure"             BOOLEAN NOT NULL DEFAULT false,
    "user"               TEXT,
    "password"           TEXT,
    "fromEmail"          TEXT NOT NULL,
    "fromName"           TEXT NOT NULL DEFAULT 'QRForge',
    "rejectUnauthorized" BOOLEAN NOT NULL DEFAULT true,
    "isActive"           BOOLEAN NOT NULL DEFAULT true,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmtpConfig_pkey" PRIMARY KEY ("id")
);

-- Add coupon columns to Payment
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "couponCode"     TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION;
