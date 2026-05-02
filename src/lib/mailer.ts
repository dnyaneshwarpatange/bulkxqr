import nodemailer, { Transporter } from 'nodemailer';

let _transporter: Transporter | null = null;
let _configHash: string = '';

async function getDbSmtpConfig() {
  try {
    const { prisma } = await import('@/lib/db');
    return await prisma.smtpConfig.findFirst({ where: { isActive: true } });
  } catch {
    return null;
  }
}

async function getTransporter(): Promise<Transporter> {
  const dbConfig = await getDbSmtpConfig();

  // Build a hash to detect config changes
  const hash = dbConfig
    ? `${dbConfig.host}:${dbConfig.port}:${dbConfig.user}:${dbConfig.updatedAt}`
    : `env:${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`;

  if (_transporter && hash === _configHash) return _transporter;

  if (dbConfig) {
    _transporter = nodemailer.createTransport({
      host: dbConfig.host,
      port: dbConfig.port,
      secure: dbConfig.secure,
      ...(dbConfig.user && dbConfig.password
        ? { auth: { user: dbConfig.user, pass: dbConfig.password } }
        : {}),
      tls: { rejectUnauthorized: dbConfig.rejectUnauthorized },
    });
    _configHash = hash;
    return _transporter;
  }

  // Fallback to env vars
  const host = process.env.SMTP_HOST;
  if (!host) throw new Error('No SMTP configuration found. Configure via Admin → SMTP Settings or set SMTP_HOST in .env');

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  _transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    ...(user && pass ? { auth: { user, pass } } : {}),
    tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false' },
  });
  _configHash = hash;
  return _transporter;
}

async function getFromAddress(): Promise<string> {
  const dbConfig = await getDbSmtpConfig();
  if (dbConfig) return `${dbConfig.fromName} <${dbConfig.fromEmail}>`;
  return process.env.SMTP_FROM ?? 'QRForge <noreply@qrforge.app>';
}

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
}

export async function sendEmail(opts: SendEmailOptions) {
  const transporter = await getTransporter();
  const from = await getFromAddress();
  return transporter.sendMail({
    from,
    to: opts.toName ? `${opts.toName} <${opts.to}>` : opts.to,
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments,
  });
}

export async function testSmtpConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const transporter = await getTransporter();
    await transporter.verify();
    return { ok: true, message: 'SMTP connection successful' };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? 'SMTP connection failed' };
  }
}

export function buildCampaignEmailHTML(
  recipientName: string,
  body: string,
  qrDataUrl: string,
  appName: string
) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
  <style>
    body { margin:0; padding:0; background:#f1f5f9; font-family:Arial,sans-serif; }
    .wrapper { padding:40px 16px; }
    .card { background:white; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.1); max-width:600px; margin:0 auto; }
    .header { background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:32px; text-align:center; }
    .header h1 { color:white; margin:0; font-size:28px; font-weight:700; }
    .body { padding:40px 32px; }
    .qr-wrap { text-align:center; margin:32px 0; }
    .qr-wrap img { max-width:220px; width:100%; border-radius:12px; border:4px solid #f1f5f9; }
    .footer { background:#f8fafc; padding:20px 32px; text-align:center; border-top:1px solid #e2e8f0; }
    .footer p { color:#94a3b8; font-size:12px; margin:0; }
    @media(max-width:480px){ .body { padding:24px 20px; } }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header"><h1>${appName}</h1></div>
    <div class="body">
      <p style="font-size:18px;color:#1e293b;margin-top:0;">Hi ${recipientName || 'there'},</p>
      <div style="color:#475569;line-height:1.7;">${body.replace(/\n/g, '<br>')}</div>
      <div class="qr-wrap">
        <img src="${qrDataUrl}" alt="Your QR Code"/>
      </div>
    </div>
    <div class="footer">
      <p>Powered by ${appName} &bull; <a href="#" style="color:#6366f1;text-decoration:none;">Unsubscribe</a></p>
    </div>
  </div>
</div>
</body>
</html>`;
}
