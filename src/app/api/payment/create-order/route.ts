import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createOrder } from '@/lib/razorpay';
import { PLANS, PlanName } from '@/lib/subscription';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const { plan } = await req.json();

    if (!plan || plan === 'free' || !PLANS[plan as PlanName]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const planDetails = PLANS[plan as PlanName];
    const amount = planDetails.priceINR;
    const receipt = `qrforge_${userId.substring(0, 8)}_${uuidv4().substring(0, 8)}`;

    const order = await createOrder(amount, 'INR', receipt);

    await prisma.payment.create({
      data: { userId, amount: amount / 100, currency: 'INR', plan, status: 'pending', razorpayOrderId: order.id },
    });

    return NextResponse.json({
      orderId: order.id,
      amount,
      currency: 'INR',
      plan,
      planName: planDetails.name,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error('Create order error:', err);
    // Surface config errors clearly to help debugging
    const isConfigError =
      err?.message?.includes('RAZORPAY_KEY') ||
      err?.message?.includes('Invalid Razorpay') ||
      err?.statusCode === 401 ||
      err?.error?.code === 'BAD_REQUEST_ERROR';
    const userMessage = isConfigError
      ? 'Payment gateway not configured — please add valid Razorpay credentials in .env'
      : 'Failed to create payment order';
    return NextResponse.json({ error: userMessage, detail: err?.message }, { status: 500 });
  }
}
