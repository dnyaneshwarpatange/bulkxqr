export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceINR: 0,
    color: '#64748b',
    daily_qr_limit: 10,
    bulk_row_limit: 0,
    email_limit: 0,
    features: ['10 QR codes/day', 'PNG format only', 'Basic customization', 'Download history'],
    restrictions: ['No bulk generation', 'No email campaigns', 'No SVG/PDF export'],
  },
  starter: {
    name: 'Starter',
    price: 4.99,
    priceINR: 49900,
    color: '#6366f1',
    daily_qr_limit: 200,
    bulk_row_limit: 100,
    email_limit: 500,
    features: ['200 QR codes/day', 'PNG + SVG formats', 'Bulk upload (100 rows)', '500 emails/month', 'ZIP export', 'Priority support'],
    restrictions: ['No PDF export', 'No Excel export with embedded QR'],
  },
  pro: {
    name: 'Pro',
    price: 14.99,
    priceINR: 149900,
    color: '#8b5cf6',
    popular: true,
    daily_qr_limit: 1000,
    bulk_row_limit: 1000,
    email_limit: 5000,
    features: ['1000 QR codes/day', 'All formats (PNG/SVG/PDF)', 'Bulk upload (1000 rows)', '5000 emails/month', 'Excel + ZIP export', 'Analytics dashboard', 'Custom colors & branding', 'API access'],
    restrictions: [],
  },
  business: {
    name: 'Business',
    price: 49.99,
    priceINR: 499900,
    color: '#ec4899',
    daily_qr_limit: 999999,
    bulk_row_limit: 10000,
    email_limit: 50000,
    features: ['Unlimited QR codes', 'All export formats', 'Bulk upload (10,000 rows)', '50,000 emails/month', 'White-label branding', 'Dedicated support', 'Advanced analytics', 'Team collaboration', 'Webhook integrations'],
    restrictions: [],
  },
} as const;

export type PlanName = keyof typeof PLANS;

export function getPlanLimits(plan: string) {
  return PLANS[(plan as PlanName)] ?? PLANS.free;
}

export async function checkQRLimit(userId: string, prisma: any): Promise<{ allowed: boolean; remaining: number; plan: string }> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const plan = (sub?.plan ?? 'free') as PlanName;
  const limits = PLANS[plan];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.qRCode.count({
    where: { userId, createdAt: { gte: today } },
  });

  const remaining = Math.max(0, limits.daily_qr_limit - count);
  return { allowed: remaining > 0, remaining, plan };
}

export async function checkBulkLimit(userId: string, rows: number, prisma: any): Promise<{ allowed: boolean; plan: string; limit: number }> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const plan = (sub?.plan ?? 'free') as PlanName;
  const limits = PLANS[plan];

  if (limits.bulk_row_limit === 0) return { allowed: false, plan, limit: 0 };
  return { allowed: rows <= limits.bulk_row_limit, plan, limit: limits.bulk_row_limit };
}
