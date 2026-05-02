import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'BulkXQR — Professional QR Code Generator',
  description: 'Generate, manage, and send QR codes at scale. Single or bulk generation with email campaigns.',
  keywords: 'QR code generator, bulk QR, email campaigns, QR marketing',
  openGraph: {
    title: 'BulkXQR — Professional QR Code Generator',
    description: 'Generate, manage, and send QR codes at scale.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
