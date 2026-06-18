import { describe, expect, it } from 'vitest';

import {
  applyMarkup,
  BILLING_MARKUP,
  formatBalance,
  usdToCents,
  usdToMicroUsd,
} from './billing';

describe('billing helpers', () => {
  it('converts whole-dollar top-ups into Stripe cents and wallet micro-USD', () => {
    expect(usdToCents(5)).toBe(500);
    expect(usdToMicroUsd(5)).toBe(5_000_000);
  });

  it('applies the configured reseller markup with upward rounding', () => {
    expect(applyMarkup(101)).toBe(Math.ceil(101 * BILLING_MARKUP));
  });

  it('formats sub-dollar and dollar wallet balances', () => {
    expect(formatBalance(50_000)).toBe('5.0¢');
    expect(formatBalance(5_000_000)).toBe('$5.00');
  });
});
