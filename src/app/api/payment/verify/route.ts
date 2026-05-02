import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyRazorpaySignature } from '@/lib/razorpay';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json();

    const isValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });

    await Promise.all([
      prisma.payment.updateMany({
        where: { userId, razorpayOrderId: razorpay_order_id },
        data: { status: 'success', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature },
      }),
      prisma.subscription.upsert({
        where: { userId },
        update: { plan, status: 'active', startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        create: { userId, plan, status: 'active', endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    return NextResponse.json({ success: true, plan });
  } catch (err: any) {
    console.error('Payment verify error:', err);
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 });
  }
}
