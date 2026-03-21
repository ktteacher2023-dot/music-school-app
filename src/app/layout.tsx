import type { Metadata, Viewport } from 'next';
import { M_PLUS_Rounded_1c } from 'next/font/google';
import './globals.css';
import SwRegister from '@/components/SwRegister';
import BottomNav from '@/components/BottomNav';

const mplus = M_PLUS_Rounded_1c({
  weight: ['400', '500', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mplus',
  preload: false,
});

export const metadata: Metadata = {
  title: '練習ノート',
  description: '音楽教室の練習管理アプリ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '練習ノート',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={mplus.variable}>
      <body>
        <SwRegister />
        <main
          className="min-h-screen"
          style={{ paddingBottom: 'calc(49px + env(safe-area-inset-bottom))' }}
        >
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
