import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateQRDataURL, generateQRSVG } from '@/lib/qr';
import { checkQRLimit } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const { content, label, type = 'text', color = '#000000', bgColor = '#ffffff', size = 300, format = 'png' } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    const { allowed, remaining, plan } = await checkQRLimit(userId, prisma);
    if (!allowed) {
      return NextResponse.json({ error: `Daily limit reached for ${plan} plan. Upgrade to generate more.`, upgrade: true }, { status: 429 });
    }
    let qrData: string;
    if (format === 'svg') {
      qrData = await generateQRSVG({ content, size, color, bgColor });
    } else {
      qrData = await generateQRDataURL({ content, size, color, bgColor });
    }
    const qrCode = await prisma.qRCode.create({
      data: { userId, content, label: label || content.substring(0, 50), type, color, bgColor, size },
    });
    return NextResponse.json({ success: true, qrData, qrId: qrCode.id, remaining: remaining - 1, format });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
