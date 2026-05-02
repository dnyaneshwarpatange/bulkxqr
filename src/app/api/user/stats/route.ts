import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { subDays } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const days = 7;
    const startDate = subDays(new Date(), days);

    const qrCodes = await prisma.qRCode.findMany({
      where: { userId, createdAt: { gte: startDate } },
      select: { createdAt: true },
    });

    // Build daily counts
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = subDays(new Date(), i);
      const key = d.toISOString().substring(0, 10);
      dailyMap[key] = 0;
    }
    qrCodes.forEach(q => {
      const key = q.createdAt.toISOString().substring(0, 10);
      if (key in dailyMap) dailyMap[key]++;
    });

    const chartData = Object.entries(dailyMap).sort().map(([date, count]) => ({ date, count }));

    return NextResponse.json({ chartData });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
