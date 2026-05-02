import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail, buildCampaignEmailHTML } from '@/lib/mailer';
import { generateQRDataURL } from '@/lib/qr';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { recipientEmail, recipientName, subject, body, qrContent, qrSize = 250, qrColor = '#000000', qrBgColor = '#ffffff' } = await req.json();

    if (!recipientEmail || !qrContent) {
      return NextResponse.json({ error: 'Recipient email and QR content are required' }, { status: 400 });
    }

    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'QRForge';
    const qrDataUrl = await generateQRDataURL({ content: qrContent, size: qrSize, color: qrColor, bgColor: qrBgColor });
    const html = buildCampaignEmailHTML(
      recipientName || '',
      body || 'Here is your QR code.',
      qrDataUrl,
      appName
    );

    await sendEmail({
      to: recipientEmail,
      toName: recipientName || '',
      subject: subject || `Your QR Code from ${appName}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Send single QR error:', err);
    return NextResponse.json({ error: err?.message ?? 'Failed to send email' }, { status: 500 });
  }
}
