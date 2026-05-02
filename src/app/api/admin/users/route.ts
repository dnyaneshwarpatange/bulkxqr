import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true },
  });
  return user?.role === 'admin' ? session : null;
}

// GET /api/admin/users — list all users with subscription info
export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = 20;
  const search = searchParams.get('search') ?? '';

  const where = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, image: true, role: true, createdAt: true,
        subscription: { select: { plan: true, status: true, endDate: true } },
        _count: { select: { qrCodes: true, campaigns: true, payments: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
}

// PATCH /api/admin/users — update user role or subscription
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId, action, plan, role } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  if (action === 'set_plan' && plan) {
    const validPlans = ['free', 'starter', 'pro', 'business'];
    if (!validPlans.includes(plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    const endDate = plan !== 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
    await prisma.subscription.upsert({
      where: { userId },
      update: { plan, status: 'active', startDate: new Date(), endDate },
      create: { userId, plan, status: 'active', endDate },
    });
    return NextResponse.json({ success: true, message: `Plan updated to ${plan}` });
  }

  if (action === 'set_role' && role) {
    const validRoles = ['user', 'admin'];
    if (!validRoles.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    await prisma.user.update({ where: { id: userId }, data: { role } });
    return NextResponse.json({ success: true, message: `Role updated to ${role}` });
  }

  if (action === 'revoke_subscription') {
    await prisma.subscription.upsert({
      where: { userId },
      update: { plan: 'free', status: 'active', endDate: null },
      create: { userId, plan: 'free', status: 'active' },
    });
    return NextResponse.json({ success: true, message: 'Subscription revoked to free' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
