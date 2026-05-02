import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const campaigns = await prisma.campaign.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' },
      include: { _count: { select: { emails: true } } },
    });
    return NextResponse.json({ campaigns });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub || sub.plan === 'free') {
      return NextResponse.json({ error: 'Email campaigns require a paid plan. Upgrade to get started.', upgrade: true }, { status: 403 });
    }

    const { name, subject, body, recipients } = await req.json();
    if (!name || !subject || !body || !recipients?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        userId, name, subject, body, status: 'draft', totalCount: recipients.length,
        emails: {
          create: recipients.map((r: any) => ({
            email: r.email, name: r.name ?? '', qrContent: r.qrContent ?? r.email, status: 'pending',
          })),
        },
      },
    });

    return NextResponse.json({ success: true, campaignId: campaign.id });
  } catch (err: any) {
    console.error('Campaign create error:', err);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
