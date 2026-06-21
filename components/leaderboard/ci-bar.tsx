'use client';

import { motion } from 'motion/react';

interface CiBarProps {
  /** Wilson 95% CI lower bound, 0..1. */
  ciLow: number;
  /** Wilson 95% CI upper bound, 0..1. */
  ciHigh: number;
  /** Observed win rate (point estimate), 0..1, rendered as the center dot. */
  rate: number;
}

/**
 * Horizontal 95% Wilson confidence interval bar on a 0–100% scale.
 *
 * - 6px muted track (the full 0–100% range)
 * - 1px hairline from `ciLow` to `ciHigh` (the CI itself)
 * - 6px center dot at `rate` (the point estimate)
 *
 * The visual makes small-sample uncertainty immediately readable: a wide bar
 * means few appearances, a tight bar means many.
 */
export function CiBar({ ciLow, ciHigh, rate }: CiBarProps) {
  const lo = Math.max(0, Math.min(1, ciLow)) * 100;
  const hi = Math.max(0, Math.min(1, ciHigh)) * 100;
  const point = Math.max(0, Math.min(1, rate)) * 100;
  const width = Math.max(0.5, hi - lo);

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-16 shrink-0 rounded-full bg-[#F0EFED] sm:w-20">
        <motion.div
          className="absolute inset-y-[3px] rounded-full bg-[#67625B]"
          initial={{ left: `${lo}%`, width: 0 }}
          animate={{ left: `${lo}%`, width: `${width}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
        <motion.div
          className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2E2B29]"
          initial={{ left: `${point}%` }}
          animate={{ left: `${point}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#67625B]">
        {Math.round(lo)}
        {'–'}
        {Math.round(hi)}%
      </span>
    </div>
  );
}
