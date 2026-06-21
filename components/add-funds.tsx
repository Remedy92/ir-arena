'use client';

import { useState } from 'react';

import { TOPUP_PRESETS_USD } from '@/lib/billing';

/**
 * Top-bar "Add funds" control: a small dropdown of preset top-up amounts. Picking
 * one creates a Stripe Checkout Session via /api/wallet/checkout and redirects the
 * browser to Stripe's hosted page. On return, /run?topup=success makes AuthControl
 * re-poll the balance.
 */
export function AddFunds() {
  const [open, setOpen] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [error, setError] = useState(false);

  async function startCheckout(amountUsd: number) {
    setPendingAmount(amountUsd);
    setError(false);
    try {
      const response = await fetch('/api/wallet/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd }),
      });
      const data = response.ok ? await response.json() : null;
      if (data?.url) {
        try {
          const target = new URL(data.url);
          if (target.hostname.endsWith('.stripe.com')) {
            window.location.assign(data.url);
            return; // navigating away; keep the spinner state
          }
        } catch {
          // invalid URL — fall through to error
        }
      }
      throw new Error('no checkout url');
    } catch {
      setError(true);
      setPendingAmount(null);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-[10px] border border-[#E3E1DE] bg-white px-3 py-1.5 text-[12px] font-medium text-[#2E2B29] transition-colors hover:bg-[#F7F5F2]"
      >
        Add funds
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-1.5 w-44 rounded-[12px] border border-[#E3E1DE] bg-white p-1.5 shadow-[0_8px_24px_-8px_rgba(46,43,41,0.18)]"
          >
            <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium text-[#67625B]">
              Add wallet credit
            </p>
            <div className="grid grid-cols-2 gap-1">
              {TOPUP_PRESETS_USD.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  role="menuitem"
                  disabled={pendingAmount !== null}
                  onClick={() => startCheckout(amount)}
                  className="rounded-[8px] border border-[#EEEDEC] bg-white px-2 py-2 text-[13px] font-medium tabular-nums text-[#2E2B29] transition-colors hover:bg-[#F7F5F2] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pendingAmount === amount ? '…' : `$${amount}`}
                </button>
              ))}
            </div>
            {error ? (
              <p className="px-2 pb-1 pt-1.5 text-[11px] text-[#B4341E]">
                Couldn’t start checkout. Try again.
              </p>
            ) : (
              <p className="px-2 pb-1 pt-1.5 text-[10px] leading-snug text-[#A39E97]">
                Secure checkout via Stripe.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
