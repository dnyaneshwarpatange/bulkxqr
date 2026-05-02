import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail, buildCampaignEmailHTML } from '@/lib/mailer';
import { generateQRDataURL } from '@/lib/qr';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const { campaignId } = await req.json();

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: { emails: { where: { status: 'pending' } } },
    });

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'sending' } });

    let sentCount = 0, failedCount = 0;
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'BulkXQR';

    for (const emailRecord of campaign.emails) {
      try {
        const qrDataUrl = await generateQRDataURL({ content: emailRecord.qrContent, size: 250 });
        const html = buildCampaignEmailHTML(emailRecord.name ?? '', campaign.body, qrDataUrl, appName);
        await sendEmail({ to: emailRecord.email, toName: emailRecord.name ?? '', subject: campaign.subject, html });
        await prisma.campaignEmail.update({ where: { id: emailRecord.id }, data: { status: 'sent', sentAt: new Date() } });
        sentCount++;
      } catch (emailErr) {
        await prisma.campaignEmail.update({ where: { id: emailRecord.id }, data: { status: 'failed' } });
        failedCount++;
      }
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'sent', sentCount, failedCount, sentAt: new Date() },
    });

    return NextResponse.json({ success: true, sentCount, failedCount });
  } catch (err: any) {
    console.error('Send campaign error:', err);
    return NextResponse.json({ error: 'Failed to send campaign' }, { status: 500 });
  }
}
