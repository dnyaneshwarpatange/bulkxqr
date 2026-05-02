import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminUser = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { role: true },
  });
  if (adminUser?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [
    totalUsers,
    totalQR,
    totalCampaigns,
    totalPayments,
    planBreakdown,
    recentUsers,
    recentPayments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.qRCode.count(),
    prisma.campaign.count(),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'success' } }),
    prisma.subscription.groupBy({ by: ['plan'], _count: { plan: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, image: true, createdAt: true, subscription: { select: { plan: true } } },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return NextResponse.json({
    totalUsers,
    totalQR,
    totalCampaigns,
    totalRevenue: totalPayments._sum.amount ?? 0,
    planBreakdown: planBreakdown.reduce((acc, p) => ({ ...acc, [p.plan]: p._count.plan }), {} as Record<string, number>),
    recentUsers,
    recentPayments,
  });
}
