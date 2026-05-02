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

  const coupons = await prisma.discountCoupon.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ coupons });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { code, description, discountType, discountValue, maxUses, expiresAt, isActive, applicableTo } = body;

  if (!code || !discountValue) {
    return NextResponse.json({ error: 'Code and discount value are required' }, { status: 400 });
  }

  try {
    const coupon = await prisma.discountCoupon.create({
      data: {
        code: code.toUpperCase().trim(),
        description: description || null,
        discountType: discountType || 'percentage',
        discountValue: parseFloat(discountValue),
        maxUses: parseInt(maxUses) || 0,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== false,
        applicableTo: applicableTo || 'all',
      },
    });
    return NextResponse.json({ coupon });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });

  const coupon = await prisma.discountCoupon.update({
    where: { id },
    data: {
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.discountType && { discountType: updates.discountType }),
      ...(updates.discountValue !== undefined && { discountValue: parseFloat(updates.discountValue) }),
      ...(updates.maxUses !== undefined && { maxUses: parseInt(updates.maxUses) }),
      ...(updates.expiresAt !== undefined && { expiresAt: updates.expiresAt ? new Date(updates.expiresAt) : null }),
      ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      ...(updates.applicableTo && { applicableTo: updates.applicableTo }),
    },
  });
  return NextResponse.json({ coupon });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });

  await prisma.discountCoupon.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
