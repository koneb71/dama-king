import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: {
    default: 'Dama King - Play Filipino Checkers Online | Free Multiplayer Game',
    template: '%s | Dama King',
  },
  description:
    'Play Dama (Filipino Checkers) online for free! Challenge friends, compete in ranked matches, climb the leaderboard, or practice against AI. The best Filipino checkers game on the web.',
  keywords: [
    'dama',
    'filipino checkers',
    'checkers online',
    'draughts',
    'board game',
    'multiplayer game',
    'free game',
    'strategy game',
    'play checkers',
    'dama king',
    'dama online',
    'filipino board game',
  ],
  authors: [{ name: 'Dama King Team' }],
  creator: 'Dama King',
  publisher: 'Dama King',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://damaking.com',
    siteName: 'Dama King',
    title: 'Dama King - Play Filipino Checkers Online',
    description:
      'Challenge players worldwide in Filipino Checkers. Play ranked matches, climb the leaderboard, and become the Dama King!',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Dama King - Filipino Checkers Online',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dama King - Play Filipino Checkers Online',
    description: 'Challenge players worldwide in Filipino Checkers. Free to play!',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo.svg',
  },
  category: 'games',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script src="/runtime-env.js" strategy="beforeInteractive" />
      </head>
      <body className="antialiased">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
