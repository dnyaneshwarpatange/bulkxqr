import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateQRBuffer, generateQRDataURL, sanitizeFilename } from '@/lib/qr';
import { checkQRLimit, checkBulkLimit } from '@/lib/subscription';
import { sendEmail, buildCampaignEmailHTML } from '@/lib/mailer';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import {
  Document, Packer, Paragraph, ImageRun, TextRun,
  AlignmentType, Table, TableRow, TableCell, WidthType,
  BorderStyle, HeadingLevel, ShadingType,
} from 'docx';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await req.json();
    const {
      items,
      batchName = 'Bulk QR',
      color = '#000000',
      bgColor = '#ffffff',
      size = 300,
      exportFormat = 'zip',
      sendEmails = false,
      emailSubject = 'Your QR Code',
      emailBody = 'Please find your QR code below.',
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // Validate email column if sendEmails is true
    if (sendEmails) {
      const missingEmail = items.filter(i => i.content?.trim()).some(i => !i.email?.trim());
      if (missingEmail) {
        return NextResponse.json({ error: 'All items must have an email address when email sending is enabled' }, { status: 400 });
      }
    }

    const bulkCheck = await checkBulkLimit(userId, items.length, prisma);
    if (!bulkCheck.allowed) {
      return NextResponse.json({
        error: `Your ${bulkCheck.plan} plan supports up to ${bulkCheck.limit} rows. You provided ${items.length}. Upgrade to process more.`,
        upgrade: true,
      }, { status: 429 });
    }

    const qrCheck = await checkQRLimit(userId, prisma);
    if (!qrCheck.allowed) {
      return NextResponse.json({ error: 'Daily QR limit reached. Upgrade your plan.', upgrade: true }, { status: 429 });
    }

    const batchId = uuidv4();
    const zip = new JSZip();
    const results: Array<{ label: string; content: string; email?: string; buffer: Buffer; qrDataUrl: string }> = [];
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'QRForge';

    for (const item of items) {
      const content = String(item.content || item.url || item.text || item.value || item).trim();
      const label = String(item.label || item.name || content).substring(0, 50);
      const email = item.email?.trim() || '';
      if (!content) continue;

      const buffer = await generateQRBuffer({ content, size, color, bgColor });
      const qrDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
      results.push({ label, content, email: email || undefined, buffer, qrDataUrl });

      const filename = `${sanitizeFilename(label)}_${batchId.substring(0, 8)}.png`;
      zip.file(filename, buffer);
    }

    // Save to DB
    await prisma.qRCode.createMany({
      data: results.map(r => ({
        userId, content: r.content, label: r.label,
        color, bgColor, size, isBulk: true, batchId, batchName,
      })),
    });

    // Send emails if requested
    if (sendEmails) {
      for (const r of results) {
        if (!r.email) continue;
        try {
          const html = buildCampaignEmailHTML(r.label, emailBody, r.qrDataUrl, appName);
          await sendEmail({ to: r.email, toName: r.label, subject: emailSubject, html });
        } catch (emailErr) {
          console.error(`Failed to send email to ${r.email}:`, emailErr);
        }
      }
    }

    // ── WORD (.docx) export ────────────────────────────────────────────
    if (exportFormat === 'docx') {
      const QR_PX = 150; // pt (approx 2 inches)
      const COLS = 2;

      // Build rows of 2 QR codes each
      const tableRows: TableRow[] = [];

      // Header row
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: COLS,
              shading: { type: ShadingType.SOLID, color: '6366f1', fill: '6366f1' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: batchName,
                      bold: true, color: 'FFFFFF', size: 28,
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
      );

      for (let i = 0; i < results.length; i += COLS) {
        const chunk = results.slice(i, i + COLS);

        // QR image row
        tableRows.push(
          new TableRow({
            children: chunk.map(r =>
              new TableCell({
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
                  left: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: 'e2e8f0' },
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120, after: 60 },
                    children: [
                      new ImageRun({
                        data: r.buffer,
                        transformation: { width: QR_PX, height: QR_PX },
                        type: 'png',
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 40 },
                    children: [
                      new TextRun({ text: r.label, bold: true, size: 20, color: '1e293b' }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 60 },
                    children: [
                      new TextRun({ text: r.content.substring(0, 60) + (r.content.length > 60 ? '…' : ''), size: 16, color: '64748b' }),
                    ],
                  }),
                  ...(r.email ? [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 120 },
                      children: [
                        new TextRun({ text: `✉ ${r.email}`, size: 16, color: '6366f1' }),
                      ],
                    }),
                  ] : [new Paragraph({ children: [] })]),
                ],
              })
            ),
            // Pad last row if odd number
            ...(chunk.length < COLS
              ? [new TableCell({ children: [new Paragraph({ children: [] })] })]
              : []),
          })
        );
      }

      const doc = new Document({
        styles: {
          default: {
            document: {
              run: { font: 'Calibri', size: 22, color: '1e293b' },
            },
          },
        },
        sections: [
          {
            children: [
              new Paragraph({
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 240 },
                children: [
                  new TextRun({ text: `${batchName} — ${results.length} QR Codes`, bold: true, size: 36, color: '6366f1' }),
                ],
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnWidths: Array(COLS).fill(Math.floor(9360 / COLS)),
                rows: tableRows,
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 480 },
                children: [
                  new TextRun({ text: `Generated by ${appName} · ${new Date().toLocaleDateString()}`, size: 16, color: '94a3b8' }),
                ],
              }),
            ],
          },
        ],
      });

      const docBuffer = await Packer.toBuffer(doc);
      return new NextResponse(new Uint8Array(docBuffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${sanitizeFilename(batchName)}_qrcodes.docx"`,
          'X-Batch-Id': batchId,
          'X-Item-Count': String(results.length),
        },
      });
    }

    // ── Default: ZIP ───────────────────────────────────────────────────
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${sanitizeFilename(batchName)}_qrcodes.zip"`,
        'X-Batch-Id': batchId,
        'X-Item-Count': String(results.length),
      },
    });
  } catch (err: any) {
    console.error('Bulk QR error:', err);
    return NextResponse.json({ error: 'Failed to generate bulk QR codes' }, { status: 500 });
  }
}
