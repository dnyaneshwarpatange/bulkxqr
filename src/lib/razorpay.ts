import crypto from 'crypto';

// Lazy initialization — avoids crash at module load if env vars missing/placeholder
let _razorpay: any = null;

function getRazorpay() {
  if (_razorpay) return _razorpay;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env');
  }
  if (keyId === 'rzp_test_xxxxxxxxxxxx' || keyId.length < 14) {
    throw new Error('Invalid Razorpay Key ID — set real credentials at dashboard.razorpay.com');
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Razorpay = require('razorpay');
  _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return _razorpay;
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error('RAZORPAY_KEY_SECRET not set');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

export async function createOrder(amount: number, currency = 'INR', receipt: string) {
  return getRazorpay().orders.create({ amount, currency, receipt });
}
