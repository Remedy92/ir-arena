'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AddFunds } from '@/components/add-funds';
import { authClient } from '@/lib/auth/client';
import { formatBalance } from '@/lib/billing';

/**
 * Top-bar auth affordance: a "Sign in" link when logged out, or the prepaid
 * wallet balance + "Add funds" + "Sign out" when logged in. Lives in the shared
 * TopBar so it appears on both the public Setup page and the gated Run page.
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
    const load = () =>
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

    load();

    // Returning from Stripe Checkout lands on /run?topup=success. The credit
    // arrives via the webhook, which can trail the redirect by a beat — re-poll a
    // few times so the new balance shows without a manual refresh.
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (new URLSearchParams(window.location.search).get('topup') === 'success') {
      timers.push(
        setTimeout(load, 2_000),
        setTimeout(load, 5_000),
        setTimeout(load, 10_000),
      );
    }

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
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
          title="Prepaid wallet balance for your account"
        >
          {formatBalance(remainingMicroUsd)}
        </span>
      ) : null}
      <AddFunds />
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
