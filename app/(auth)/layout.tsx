import type { Metadata } from 'next';

/**
 * Minimal unguarded layout for the auth pages. The root layout already provides
 * <html>/<body>, fonts, and TooltipProvider — this just centers the sign-in card.
 */
export const metadata: Metadata = {
  title: 'Sign in',
  description:
    'Sign in to IR Arena to run blinded LLM triage comparisons on synthetic acute hemorrhage cases.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      {children}
    </main>
  );
}
