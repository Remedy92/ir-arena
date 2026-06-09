/**
 * Minimal unguarded layout for the auth pages. The root layout already provides
 * <html>/<body>, fonts, and TooltipProvider — this just centers the sign-in card.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      {children}
    </main>
  );
}
