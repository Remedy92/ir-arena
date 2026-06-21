'use client';

import { motion } from 'motion/react';

interface WinRateBarProps {
  /** 0..1 */
  rate: number;
}

/**
 * Compact horizontal win-rate bar (0–100%). Reuses the model-card confidence-bar
 * pattern: 4px `#EEEDEC` track, ink fill, spring-animated width. Numeric `%`
 * sits next to it in Geist Mono `tabular-nums`.
 */
export function WinRateBar({ rate }: WinRateBarProps) {
  const clamped = Math.max(0, Math.min(1, rate));
  const percent = Math.round(clamped * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1 w-16 shrink-0 overflow-hidden rounded-full bg-[#EEEDEC] sm:w-20">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-[#2E2B29]"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-[#2E2B29]">
        {percent}%
      </span>
    </div>
  );
}
