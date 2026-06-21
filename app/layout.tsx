import type { Metadata } from 'next';
import { Geist_Mono, Inter, Newsreader } from 'next/font/google';

import { TooltipProvider } from '@/components/ui/tooltip';

import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const newsreader = Newsreader({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['300', '400'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const APP_URL = process.env.IR_ARENA_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'IR Arena',
    template: '%s · IR Arena',
  },
  description:
    'Blinded side-by-side LLM triage comparison for synthetic acute hemorrhage cases — a research demo for interventional radiology.',
  applicationName: 'IR Arena',
  authors: [{ name: 'IR Arena' }],
  creator: 'IR Arena',
  publisher: 'IR Arena',
  keywords: [
    'IR Arena',
    'interventional radiology',
    'LLM evaluation',
    'model benchmark',
    'triage comparison',
    'blinded evaluation',
    'AI research',
    'synthetic cases',
    'acute hemorrhage',
  ],
  category: 'Medical Research',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'IR Arena',
    title:
      'IR Arena — Blinded LLM Triage for Interventional Radiology',
    description:
      'Blinded side-by-side LLM triage comparison for synthetic acute hemorrhage cases. A research demo for interventional radiology.',
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'IR Arena — Blinded LLM Triage for Interventional Radiology',
    description:
      'Blinded side-by-side LLM triage comparison for synthetic acute hemorrhage cases.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FCFAF8] font-sans text-[#2E2B29]">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}