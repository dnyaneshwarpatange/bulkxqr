import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const search = searchParams.get('search') ?? '';
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (search) where.OR = [{ content: { contains: search, mode: 'insensitive' } }, { label: { contains: search, mode: 'insensitive' } }];

    const [qrCodes, total] = await Promise.all([
      prisma.qRCode.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.qRCode.count({ where }),
    ]);

    return NextResponse.json({ qrCodes, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const { id } = await req.json();
    await prisma.qRCode.deleteMany({ where: { id, userId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete QR code' }, { status: 500 });
  }
}
