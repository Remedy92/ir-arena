import { describe, expect, it } from 'vitest';

import {
  formatCiRange,
  formatConfidence,
  formatLatency,
  formatPercent,
  isLowSample,
  LOW_SAMPLE_THRESHOLD,
  wilsonInterval,
} from './leaderboard';

describe('wilsonInterval', () => {
  it('returns {0,0} for n=0 without producing NaN', () => {
    expect(wilsonInterval(0, 0)).toEqual({ ciLow: 0, ciHigh: 0 });
    expect(wilsonInterval(5, 0)).toEqual({ ciLow: 0, ciHigh: 0 });
  });

  it('returns {0,0} for non-finite inputs', () => {
    expect(wilsonInterval(Number.NaN, 10)).toEqual({ ciLow: 0, ciHigh: 0 });
    expect(wilsonInterval(5, Number.POSITIVE_INFINITY)).toEqual({
      ciLow: 0,
      ciHigh: 0,
    });
  });

  it('produces a wide interval for a single trial with one win', () => {
    const { ciLow, ciHigh } = wilsonInterval(1, 1);
    expect(ciLow).toBeGreaterThan(0);
    expect(ciLow).toBeLessThan(0.5);
    expect(ciHigh).toBeGreaterThan(0.5);
    expect(ciHigh).toBeLessThanOrEqual(1);
  });

  it('produces a low upper bound for zero wins out of ten', () => {
    const { ciLow, ciHigh } = wilsonInterval(0, 10);
    expect(ciLow).toBe(0);
    // Wilson upper bound for 0/10 at 95% is ~0.31.
    expect(ciHigh).toBeGreaterThan(0.2);
    expect(ciHigh).toBeLessThan(0.35);
  });

  it('produces a high lower bound for ten wins out of ten', () => {
    const { ciLow, ciHigh } = wilsonInterval(10, 10);
    // Wilson upper bound for 10/10 at 95% is mathematically 1; floating-point
    // may produce 0.9999999999999999, which is equivalent for display.
    expect(ciHigh).toBeCloseTo(1, 6);
    // Wilson lower bound for 10/10 at 95% is ~0.69.
    expect(ciLow).toBeGreaterThan(0.65);
    expect(ciLow).toBeLessThan(0.75);
  });

  it('tightens as sample size grows at a fixed proportion', () => {
    const small = wilsonInterval(5, 10);
    const large = wilsonInterval(50, 100);
    expect(large.ciHigh - large.ciLow).toBeLessThan(small.ciHigh - small.ciLow);
  });

  it('is roughly symmetric near 50% for large n', () => {
    const { ciLow, ciHigh } = wilsonInterval(50, 100);
    const center = (ciLow + ciHigh) / 2;
    expect(Math.abs(center - 0.5)).toBeLessThan(0.01);
    // 95% CI for 50/100 is ~[0.398, 0.602] — width ~0.2.
    expect(ciHigh - ciLow).toBeGreaterThan(0.15);
    expect(ciHigh - ciLow).toBeLessThan(0.25);
  });

  it('clamps defensive out-of-range wins into [0, n]', () => {
    const { ciLow, ciHigh } = wilsonInterval(-5, 10);
    expect(ciLow).toBe(0);
    expect(ciHigh).toBeLessThan(0.35);

    const all = wilsonInterval(11, 10);
    expect(all.ciHigh).toBeCloseTo(1, 6);
    expect(all.ciLow).toBeGreaterThan(0.65);
  });

  it('never returns values outside [0, 1]', () => {
    const cases = [
      [0, 1],
      [1, 1],
      [0, 100],
      [100, 100],
      [3, 7],
      [99, 100],
    ] as const;
    for (const [wins, n] of cases) {
      const { ciLow, ciHigh } = wilsonInterval(wins, n);
      expect(ciLow).toBeGreaterThanOrEqual(0);
      expect(ciHigh).toBeLessThanOrEqual(1);
      expect(ciLow).toBeLessThanOrEqual(ciHigh);
    }
  });
});

describe('formatters', () => {
  it('formatPercent rounds to a whole-percent string', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(0.381)).toBe('38%');
    expect(formatPercent(1)).toBe('100%');
    expect(formatPercent(Number.NaN)).toBe('—');
  });

  it('formatCiRange renders an en-dash range, or a single value when degenerate', () => {
    expect(formatCiRange(0.31, 0.45)).toBe('31–45%');
    expect(formatCiRange(0.5, 0.5)).toBe('50%');
    expect(formatCiRange(Number.NaN, 0.5)).toBe('—');
  });

  it('formatLatency adds thousands separators and the ms suffix', () => {
    expect(formatLatency(1240)).toBe('1,240ms');
    expect(formatLatency(0)).toBe('0ms');
    expect(formatLatency(null)).toBe('—');
    expect(formatLatency(undefined)).toBe('—');
  });

  it('formatConfidence rounds to a whole number', () => {
    expect(formatConfidence(85)).toBe('85');
    expect(formatConfidence(85.4)).toBe('85');
    expect(formatConfidence(null)).toBe('—');
  });
});

describe('isLowSample', () => {
  it('flags rows below the threshold and clears them at/above it', () => {
    expect(isLowSample({ appearances: 0 })).toBe(true);
    expect(isLowSample({ appearances: LOW_SAMPLE_THRESHOLD - 1 })).toBe(true);
    expect(isLowSample({ appearances: LOW_SAMPLE_THRESHOLD })).toBe(false);
    expect(isLowSample({ appearances: 100 })).toBe(false);
  });
});
