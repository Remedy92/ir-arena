'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { authClient } from '@/lib/auth/client';

const MICRO_USD_PER_CENT = 10_000;

function formatRemaining(remainingMicroUsd: number): string {
  const cents = remainingMicroUsd / MICRO_USD_PER_CENT;
  // One decimal, but show "0¢" rather than "0.0¢" when exhausted.
  return cents <= 0 ? '0¢ left' : `${cents.toFixed(1)}¢ left`;
}

/**
 * Top-bar auth affordance: a "Sign in" link when logged out, or the remaining
 * spend budget + a "Sign out" button when logged in. Lives in the shared TopBar
 * so it appears on both the public Setup page and the gated Run page.
 */
export function AuthControl() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [remainingMicroUsd, setRemainingMicroUsd] = useState<number | null>(null);

  useEffect(() => {
    // No fetch (and no synchronous setState) when signed out — the signed-out
    // branch below renders the "Sign in" link and never reads the stale value.
    if (!session) {
      return;
    }
    let cancelled = false;
    fetch('/api/budget')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setRemainingMicroUsd(data.remainingMicroUsd);
        }
      })
      .catch(() => {
        /* budget indicator is best-effort */
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (isPending) {
    return null;
  }

  if (!session) {
    return (
      <Link
        href="/sign-in"
        className="rounded-[10px] border border-[#E3E1DE] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2E2B29] transition-colors hover:bg-[#F7F5F2]"
      >
        Sign in
      </Link>
    );
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2.5">
      {remainingMicroUsd !== null ? (
        <span
          className="hidden font-mono text-[11px] tabular-nums text-[#67625B] sm:inline"
          title="Remaining model-spend budget for your account"
        >
          {formatRemaining(remainingMicroUsd)}
        </span>
      ) : null}
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-[10px] border border-[#E3E1DE] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2E2B29] transition-colors hover:bg-[#F7F5F2]"
      >
        Sign out
      </button>
    </div>
  );
}
