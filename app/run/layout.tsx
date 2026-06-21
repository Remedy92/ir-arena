import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Run a comparison',
  description:
    'Run a blinded side-by-side LLM triage comparison on a synthetic acute hemorrhage case.',
  alternates: {
    canonical: '/run',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RunLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
