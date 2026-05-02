import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if ((session.user as any).role !== 'admin') return null;
  return session;
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const config = await prisma.smtpConfig.findFirst({ orderBy: { createdAt: 'desc' } });
  // Mask password
  if (config?.password) {
    return NextResponse.json({ config: { ...config, password: '••••••••' } });
  }
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { host, port, secure, user, password, fromEmail, fromName, rejectUnauthorized, isActive } = body;

  if (!host || !fromEmail) {
    return NextResponse.json({ error: 'Host and From Email are required' }, { status: 400 });
  }

  // Delete old config and create new (single config)
  await prisma.smtpConfig.deleteMany({});
  const config = await prisma.smtpConfig.create({
    data: {
      host,
      port: parseInt(port) || 587,
      secure: secure === true,
      user: user || null,
      password: password && !password.includes('•') ? password : undefined,
      fromEmail,
      fromName: fromName || 'QRForge',
      rejectUnauthorized: rejectUnauthorized !== false,
      isActive: isActive !== false,
    },
  });

  return NextResponse.json({ config: { ...config, password: config.password ? '••••••••' : null } });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.smtpConfig.deleteMany({});
  return NextResponse.json({ success: true });
}
