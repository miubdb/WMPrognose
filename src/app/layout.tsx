import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Road to Matchday',
  description: 'Vorbereitung auf die Saison: Training, Ernährung, Erholung und Torwartarbeit an einem Ort.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Matchday', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#15803d' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
