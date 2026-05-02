import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      uptime: Math.floor(process.uptime()),
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err?.message ?? 'DB unreachable' },
      { status: 503 }
    );
  }
}
