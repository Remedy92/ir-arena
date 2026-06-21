'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';

import {
  formatConfidence,
  formatCost,
  formatLatency,
  formatPercent,
  formatReasoningEffort,
  isLowSample,
  type LeaderboardData,
  type LeaderboardRow,
} from '@/lib/leaderboard';
import { cn } from '@/lib/utils';

interface SpeedAccuracyChartProps {
  data: LeaderboardData;
}

const DOT_SIZE = 10;
const DOT_SIZE_TOP = 12;

/**
 * Speed-vs-accuracy scatter plot. Each dot is a model; x = avg latency of all
 * arms (left = fast), y = win rate (top = accurate). Top-left is the best
 * quadrant. Hand-rolled with motion — no chart library, matching the
 * editorial aesthetic.
 *
 * Hover: scales the dot, dims the rest, draws dashed axis projections, and
 * shows a tooltip card. Touch: tap a dot to focus it (same tooltip via
 * onFocus). Top 3 models get direct labels so they're identifiable without
 * hovering.
 */
export function SpeedAccuracyChart({ data }: SpeedAccuracyChartProps) {
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  const points = useMemo(
    () =>
      data.models.filter(
        (m): m is LeaderboardRow & { avgLatencyMs: number } =>
          m.appearances > 0 && m.avgLatencyMs !== null,
      ),
    [data.models],
  );

  if (points.length === 0) return null;

  const latencies = points.map((p) => p.avgLatencyMs);
  const rawMin = Math.min(...latencies);
  const rawMax = Math.max(...latencies);
  const rawRange = rawMax - rawMin;
  const pad = rawRange > 0 ? rawRange * 0.12 : 100;
  const latMin = Math.max(0, rawMin - pad);
  const latMax = rawMax + pad;
  const latRange = latMax - latMin || 1;

  const xPercent = (lat: number) => ((lat - latMin) / latRange) * 100;
  const yPercent = (rate: number) => rate * 100;

  const sortedLat = [...latencies].sort((a, b) => a - b);
  const medianLat =
    sortedLat.length <= 1
      ? sortedLat[0] ?? 0
      : sortedLat.length % 2 === 0
        ? (sortedLat[sortedLat.length / 2 - 1] +
            sortedLat[sortedLat.length / 2]) /
          2
        : sortedLat[Math.floor(sortedLat.length / 2)];

  const topModel = points[0];
  const hovered = hoveredSlug
    ? (points.find((p) => p.slug === hoveredSlug) ?? null)
    : null;
  const labeledSlugs = new Set(points.slice(0, 3).map((p) => p.slug));

  const xTicks = [
    { value: latMin, label: formatLatency(Math.round(latMin)) },
    { value: medianLat, label: formatLatency(Math.round(medianLat)) },
    { value: latMax, label: formatLatency(Math.round(latMax)) },
  ];
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[14px] border border-[#EEEDEC] bg-white">
        <div className="border-b border-[#EEEDEC] px-4 py-3">
          <h2 className="text-sm font-medium text-[#2E2B29]">
            Speed vs accuracy
          </h2>
          <p className="mt-0.5 text-xs text-[#67625B]">
            Each dot is a model. Top-left is fastest and most accurate. Hover
            for detail. Outlined dots are low sample.
          </p>
        </div>

        <div className="px-3 pt-6 pb-4 sm:px-4">
          <div className="flex">
            {/* Y-axis label */}
            <div className="flex w-6 shrink-0 items-center justify-center sm:w-8">
              <span className="rotate-[-90deg] whitespace-nowrap text-[10px] font-medium tracking-wider text-[#67625B] uppercase">
                Win rate
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {/* Plot area */}
              <div
                className="relative h-64 sm:h-80 md:h-96"
                role="img"
                aria-label="Scatter plot of model speed versus accuracy"
              >
                {/* Y-axis ticks + gridlines */}
                {yTicks.map((t) => (
                  <div
                    key={t}
                    className="absolute left-0 right-0"
                    style={{ bottom: `${t}%` }}
                  >
                    {t > 0 && t < 100 && (
                      <div className="h-px w-full bg-[#F4F2EF]" />
                    )}
                    {t === 0 && <div className="h-px w-full bg-[#EEEDEC]" />}
                    <span
                      className="absolute right-full mr-1.5 font-mono text-[10px] tabular-nums text-[#A8A39D] sm:mr-2"
                      aria-hidden
                    >
                      {t}
                    </span>
                  </div>
                ))}

                {/* Median latency vertical (quadrant split) */}
                <div
                  className="absolute bottom-0 top-0 border-l border-dashed border-[#EEEDEC]"
                  style={{ left: `${xPercent(medianLat)}%` }}
                  aria-hidden
                />

                {/* 50% win-rate horizontal (quadrant split) */}
                <div
                  className="absolute left-0 right-0 border-t border-dashed border-[#EEEDEC]"
                  style={{ bottom: '50%' }}
                  aria-hidden
                />

                {/* Quadrant labels */}
                <span className="absolute left-2 top-2 hidden text-[9px] font-medium tracking-wider text-[#D8D5D0] uppercase sm:inline">
                  Fast & accurate
                </span>
                <span className="absolute right-2 top-2 hidden text-[9px] font-medium tracking-wider text-[#D8D5D0] uppercase sm:inline">
                  Slow & accurate
                </span>
                <span className="absolute left-2 bottom-2 hidden text-[9px] font-medium tracking-wider text-[#D8D5D0] uppercase sm:inline">
                  Fast & less accurate
                </span>
                <span className="absolute right-2 bottom-2 hidden text-[9px] font-medium tracking-wider text-[#D8D5D0] uppercase sm:inline">
                  Slow & less accurate
                </span>

                {/* Points */}
                {points.map((p, idx) => {
                  const x = xPercent(p.avgLatencyMs);
                  const y = yPercent(p.winRate);
                  const topPct = 100 - y;
                  const isHovered = hoveredSlug === p.slug;
                  const isTop = p.slug === topModel.slug;
                  const isLow = isLowSample(p);
                  const isDimmed = hoveredSlug !== null && !isHovered;
                  const isLabeled = labeledSlugs.has(p.slug);
                  const size = isTop ? DOT_SIZE_TOP : DOT_SIZE;

                  return (
                    <div key={p.slug}>
                      {/* Axis projections on hover */}
                      <AnimatePresence>
                        {isHovered && (
                          <>
                            <motion.div
                              className="absolute border-l border-dashed border-[#D8D5D0]"
                              style={{
                                left: `${x}%`,
                                top: `${topPct}%`,
                                bottom: 0,
                              }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              aria-hidden
                            />
                            <motion.div
                              className="absolute border-t border-dashed border-[#D8D5D0]"
                              style={{
                                left: 0,
                                width: `${x}%`,
                                top: `${topPct}%`,
                              }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              aria-hidden
                            />
                          </>
                        )}
                      </AnimatePresence>

                      {/* Top-model mustard ring (static, not animated) */}
                      {isTop && (
                        <div
                          aria-hidden
                          className="absolute rounded-full border-2 border-[#F4C406]"
                          style={{
                            left: `${x}%`,
                            top: `${topPct}%`,
                            width: size + 8,
                            height: size + 8,
                            transform: 'translate(-50%, -50%)',
                          }}
                        />
                      )}

                      {/* Direct label for top 3 (hidden when hovered) */}
                      <AnimatePresence>
                        {isLabeled && !isHovered && (
                          <motion.div
                            className="pointer-events-none absolute whitespace-nowrap font-['Newsreader',Georgia,serif] text-[11px] tracking-tight text-[#2E2B29]"
                            style={{
                              left: `${x}%`,
                              top: `${topPct}%`,
                            }}
                            initial={{ opacity: 0, x: '-50%', y: '-50%' }}
                            animate={{
                              opacity: isDimmed ? 0.2 : 0.75,
                              x: '0%',
                              y: '-50%',
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, delay: idx * 0.05 }}
                          >
                            <span className="ml-3">{p.label}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Dot */}
                      <motion.button
                        type="button"
                        className={cn(
                          'absolute rounded-full p-0',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67625B]',
                        )}
                        style={{
                          left: `${x}%`,
                          top: `${topPct}%`,
                          width: size,
                          height: size,
                          backgroundColor: isLow ? 'white' : p.dotColor,
                          border: isLow
                            ? `1.5px solid ${p.dotColor}`
                            : 'none',
                        }}
                        initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
                        animate={{
                          scale: isHovered ? 1.5 : 1,
                          opacity: isDimmed ? 0.25 : 1,
                          x: '-50%',
                          y: '-50%',
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 200,
                          damping: 18,
                          delay: idx * 0.06,
                          opacity: { duration: 0.2, delay: idx * 0.06 },
                        }}
                        onMouseEnter={() => setHoveredSlug(p.slug)}
                        onMouseLeave={() => setHoveredSlug(null)}
                        onFocus={() => setHoveredSlug(p.slug)}
                        onBlur={() => setHoveredSlug(null)}
                        aria-label={`${p.label}: ${formatPercent(p.winRate)} win rate over ${p.appearances} ${p.appearances === 1 ? 'run' : 'runs'}, ${formatLatency(p.avgLatencyMs)} average latency`}
                      />
                    </div>
                  );
                })}

                {/* Tooltip */}
                <AnimatePresence>
                  {hovered && (
                    <ChartTooltip
                      point={hovered}
                      x={xPercent(hovered.avgLatencyMs)}
                      y={yPercent(hovered.winRate)}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* X-axis ticks */}
              <div className="relative mt-2 h-4">
                {xTicks.map((t) => (
                  <div
                    key={t.value}
                    className="absolute -translate-x-1/2 font-mono text-[10px] tabular-nums text-[#A8A39D]"
                    style={{ left: `${xPercent(t.value)}%` }}
                  >
                    {t.label}
                  </div>
                ))}
              </div>

              {/* X-axis label */}
              <div className="mt-3 text-center text-[10px] font-medium tracking-wider text-[#67625B] uppercase">
                Avg latency
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChartTooltip({
  point,
  x,
  y,
}: {
  point: LeaderboardRow & { avgLatencyMs: number };
  x: number;
  y: number;
}) {
  const topPct = 100 - y;
  const goesLeft = x > 55;
  const vAdj = y > 80 ? '0%' : y < 20 ? '-100%' : '-50%';
  const hAdj = goesLeft ? 'calc(-100% - 14px)' : '14px';

  return (
    <motion.div
      className="pointer-events-none absolute z-50 w-52 rounded-[12px] border border-[#EEEDEC] bg-white p-3"
      style={{
        left: `${x}%`,
        top: `${topPct}%`,
        transform: `translate(${hAdj}, ${vAdj})`,
      }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.15 }}
      role="tooltip"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: point.dotColor }}
        />
        <span className="min-w-0 truncate font-['Newsreader',Georgia,serif] text-sm tracking-tight text-[#2E2B29]">
          {point.label}
        </span>
        {isLowSample(point) && (
          <span className="ml-auto shrink-0 text-[9px] font-medium tracking-wider text-[#A8A39D] uppercase">
            low sample
          </span>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
        <TooltipStat
          label="Win rate"
          value={formatPercent(point.winRate)}
          accent
        />
        <TooltipStat
          label="Runs"
          value={String(point.appearances)}
        />
        <TooltipStat
          label="Avg latency"
          value={formatLatency(point.avgLatencyMs)}
        />
        <TooltipStat
          label="Avg cost"
          value={formatCost(point.avgCostMicroUsd)}
        />
        <TooltipStat
          label="Avg conf."
          value={formatConfidence(point.avgWinnerConfidence)}
        />
        <TooltipStat
          label="Thinking"
          value={formatReasoningEffort(point.topReasoningEffort)}
        />
      </div>

      <div className="mt-2.5 border-t border-[#F4F2EF] pt-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-wide text-[#A8A39D] uppercase">
            95% CI
          </span>
          <span className="font-mono text-[10px] tabular-nums text-[#67625B]">
            {Math.round(point.ciLow * 100)}–{Math.round(point.ciHigh * 100)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function TooltipStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] tracking-wide text-[#A8A39D] uppercase">
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-xs tabular-nums',
          accent ? 'font-medium text-[#2E2B29]' : 'text-[#67625B]',
        )}
      >
        {value}
      </span>
    </div>
  );
}
