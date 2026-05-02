import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PLANS } from '@/lib/subscription';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const sub = await prisma.subscription.findUnique({ where: { userId } });
    const plan = sub?.plan ?? 'free';
    const planDetails = PLANS[plan as keyof typeof PLANS] ?? PLANS.free;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [todayCount, totalCount, campaignCount] = await Promise.all([
      prisma.qRCode.count({ where: { userId, createdAt: { gte: today } } }),
      prisma.qRCode.count({ where: { userId } }),
      prisma.campaign.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      plan, status: sub?.status ?? 'active',
      startDate: sub?.startDate, endDate: sub?.endDate,
      limits: planDetails,
      usage: { todayCount, totalCount, campaignCount, dailyLimit: planDetails.daily_qr_limit },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
