/**
 * Reseller billing config for the prepaid wallet.
 *
 * The wallet balance lives in `user_budget.cap_micro_usd` and is denominated in
 * CUSTOMER micro-USD — i.e. the dollars the user actually paid us. A top-up of
 * $5 credits 5,000,000 micro-USD. Each triage run burns the wallet at the raw AI
 * Gateway cost times BILLING_MARKUP, so the markup is our margin over cost (it
 * covers Stripe fees, float, and chargebacks). Currency is USD so the wallet
 * stays 1:1 with gateway pricing (also USD) — no FX drift in the accounting; an
 * EU customer's card converts at checkout.
 */

const MICRO_USD_PER_USD = 1_000_000;
export const MICRO_USD_PER_CENT = 10_000;

/** New-account starter wallet credit. */
export const STARTER_WALLET_MICRO_USD = 500_000; // $0.50

/** Stripe metadata guard so IR Arena events cannot be confused with another app. */
export const BILLING_APP_ID = 'ir-arena';
export const BILLING_TOPUP_PURPOSE = 'wallet_topup';

/**
 * Margin multiplier applied to raw gateway cost when charging the wallet.
 * Override with the BILLING_MARKUP env var (e.g. "1.5"); defaults to 2×.
 */
export const BILLING_MARKUP: number = (() => {
  // Guard `process` so this module is safe to import from client components
  // (which only use the formatter/presets, never the markup).
  const raw =
    typeof process !== 'undefined' ? process.env.BILLING_MARKUP : undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
})();

/** Charge currency for top-ups (ISO 4217, lowercase for Stripe). */
export const BILLING_CURRENCY = 'usd';

/** Stripe Tax code for cloud AI / digital service credits. */
export const BILLING_TAX_CODE = 'txcd_10105002';

/** Preset top-up amounts offered in the UI, in whole USD. */
export const TOPUP_PRESETS_USD = [5, 10, 20, 50] as const;

/** Bounds enforced server-side on any top-up amount (including custom values). */
export const MIN_TOPUP_USD = 5;
export const MAX_TOPUP_USD = 200;

/** Apply the reseller markup to a raw gateway micro-USD amount (rounds up). */
export function applyMarkup(rawMicroUsd: number): number {
  return Math.ceil(rawMicroUsd * BILLING_MARKUP);
}

/** Whole/fractional USD → micro-USD (the wallet's unit). */
export function usdToMicroUsd(usd: number): number {
  return Math.round(usd * MICRO_USD_PER_USD);
}

/** Whole/fractional USD → integer cents (Stripe's `unit_amount`). */
export function usdToCents(usd: number): number {
  return Math.round(usd * 100);
}

/** Format a micro-USD wallet balance for display: dollars at/above $1, else cents. */
export function formatBalance(microUsd: number): string {
  if (microUsd <= 0) return '$0.00';
  if (microUsd >= MICRO_USD_PER_USD) {
    return `$${(microUsd / MICRO_USD_PER_USD).toFixed(2)}`;
  }
  const cents = microUsd / MICRO_USD_PER_CENT;
  return `${cents.toFixed(1)}¢`;
}
