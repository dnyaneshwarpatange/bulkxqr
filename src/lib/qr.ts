import QRCode from 'qrcode';

export interface QROptions {
  content: string;
  size?: number;
  color?: string;
  bgColor?: string;
  format?: 'png' | 'svg';
  errorLevel?: 'L' | 'M' | 'Q' | 'H';
}

export async function generateQRDataURL(opts: QROptions): Promise<string> {
  const { content, size = 300, color = '#000000', bgColor = '#ffffff', errorLevel = 'M' } = opts;

  return QRCode.toDataURL(content, {
    width: size,
    margin: 2,
    color: { dark: color, light: bgColor },
    errorCorrectionLevel: errorLevel,
    type: 'image/png',
  });
}

export async function generateQRBuffer(opts: QROptions): Promise<Buffer> {
  const { content, size = 300, color = '#000000', bgColor = '#ffffff', errorLevel = 'M' } = opts;
  
  return QRCode.toBuffer(content, {
    width: size,
    margin: 2,
    color: { dark: color, light: bgColor },
    errorCorrectionLevel: errorLevel,
    type: 'png',
  });
}

export async function generateQRSVG(opts: QROptions): Promise<string> {
  const { content, size = 300, color = '#000000', bgColor = '#ffffff', errorLevel = 'M' } = opts;

  return QRCode.toString(content, {
    type: 'svg',
    width: size,
    margin: 2,
    color: { dark: color, light: bgColor },
    errorCorrectionLevel: errorLevel,
  });
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_\-\.]/gi, '_').substring(0, 50);
}
