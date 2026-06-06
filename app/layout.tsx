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

export const metadata: Metadata = {
  title: 'IR Arena',
  description:
    'Blinded side-by-side LLM triage comparison for synthetic acute hemorrhage cases.',
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