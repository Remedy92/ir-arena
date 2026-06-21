/**
 * Public leaderboard aggregation helpers for the IR Arena benchmark.
 *
 * Wins are user-judged preferences on blinded side-by-side runs — NOT objective
 * correctness. Win rates are shown with a Wilson 95% confidence interval so
 * small-sample rows are visually honest. The data lives in `run_votes`
 * (winner_slug + per-arm snapshot) and `run_arms` (full structured output per
 * arm). This module is pure: DB access happens in the route handler.
 */

export interface LeaderboardRow {
  /** Gateway slug (also the join key to MODEL_CATALOG). */
  slug: string;
  label: string;
  provider: string;
  dotColor: string;
  /** Footnote for substituted models (e.g. Gemma 4 31B standing in for MedGemma). */
  footnote?: string;
  /** Number of runs this model won. */
  wins: number;
  /** Number of distinct runs this model appeared in as an arm. */
  appearances: number;
  /** wins / appearances, 0..1. 0 when appearances === 0. */
  winRate: number;
  /** Wilson 95% CI lower bound, 0..1. */
  ciLow: number;
  /** Wilson 95% CI upper bound, 0..1. */
  ciHigh: number;
  /** Average self-reported confidence (0..100) of the winning arms, or null. */
  avgWinnerConfidence: number | null;
  /** Average latency (ms) of the winning arms, or null. */
  avgWinnerLatencyMs: number | null;
  /** Average latency (ms) of ALL arms (winning or not), or null. Used by the speed-vs-accuracy chart. */
  avgLatencyMs: number | null;
  /** Average cost per settled call in micro-USD (1 USD = 1,000,000), or null. From usage_events. */
  avgCostMicroUsd: number | null;
  /** Number of settled usage_events rows for this model (cost sample size). */
  callCount: number;
  /** Distinct reasoning efforts this model has been run with, from run_votes.reasoning. */
  reasoningEfforts: string[];
  /** The most common reasoning effort (mode), or null if no runs. */
  topReasoningEffort: string | null;
  /** Wins where model identities were hidden at vote time. */
  blindedWins: number;
  /** Wins where model identities were revealed at vote time. */
  revealedWins: number;
}

export interface LeaderboardData {
  /** Sorted by winRate desc, then wins desc, then slug asc for stable ties. */
  models: LeaderboardRow[];
  /** COUNT(DISTINCT run_uuid) across run_votes. */
  totalRuns: number;
  /** COUNT(DISTINCT user_id) across run_votes. */
  totalVoters: number;
  /** ISO timestamp the aggregation was generated. */
  generatedAt: string;
}

/** Minimum appearances before a row is considered statistically meaningful. */
export const LOW_SAMPLE_THRESHOLD = 5;

/**
 * Wilson score 95% confidence interval for a binomial proportion.
 * z = 1.959964 is the two-tailed 95% normal quantile.
 * Returns {0,0} for n<=0 and clamps to [0,1] for defensive inputs.
 */
export function wilsonInterval(
  wins: number,
  n: number,
  z = 1.959964,
): { ciLow: number; ciHigh: number } {
  if (!Number.isFinite(wins) || !Number.isFinite(n) || n <= 0) {
    return { ciLow: 0, ciHigh: 0 };
  }
  // Clamp wins into [0, n] defensively — callers should never pass out-of-range,
  // but a corrupted row shouldn't produce NaN on the public endpoint.
  const safeWins = Math.max(0, Math.min(n, wins));
  const p = safeWins / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const spread =
    (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return {
    ciLow: Math.max(0, center - spread),
    ciHigh: Math.min(1, center + spread),
  };
}

/** 0..1 → "38%" integer string. 0 → "0%". */
export function formatPercent(rate: number): string {
  if (!Number.isFinite(rate)) return '—';
  return `${Math.round(rate * 100)}%`;
}

/** 0..1 → "31–45%" integer range string. Single-value CI → "38%". */
export function formatCiRange(ciLow: number, ciHigh: number): string {
  if (!Number.isFinite(ciLow) || !Number.isFinite(ciHigh)) return '—';
  const lo = Math.round(ciLow * 100);
  const hi = Math.round(ciHigh * 100);
  if (lo === hi) return `${lo}%`;
  return `${lo}–${hi}%`;
}

/** Milliseconds → "1,240ms" with thousands separators. null → "—". */
export function formatLatency(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—';
  return `${Math.round(ms).toLocaleString()}ms`;
}

/** Micro-USD → human-readable cost. 12000 → "1.2¢", 750000 → "75¢", 1500000 → "$1.50". */
export function formatCost(microUsd: number | null | undefined): string {
  if (microUsd === null || microUsd === undefined || !Number.isFinite(microUsd)) {
    return '—';
  }
  if (microUsd < 100) return '<0.01¢';
  const cents = microUsd / 10_000;
  if (cents < 100) {
    // Whole cents → no decimal; fractional → 1 or 2 decimals.
    const isWhole = Number.isInteger(cents);
    if (isWhole) return `${cents}¢`;
    return `${cents.toFixed(cents < 10 ? 2 : 1)}¢`;
  }
  return `$${(cents / 100).toFixed(2)}`;
}

/** Reasoning effort slug → human label. Falls back to title-case. */
export function formatReasoningEffort(
  effort: string | null | undefined,
): string {
  if (!effort) return '—';
  const labels: Record<string, string> = {
    'provider-default': 'Default',
    none: 'None',
    minimal: 'Minimal',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    xhigh: 'Max',
  };
  return labels[effort] ?? effort.charAt(0).toUpperCase() + effort.slice(1);
}

/** Array of reasoning efforts → compact summary like "Medium · 2 others". */
export function formatReasoningSummary(
  efforts: string[],
  top: string | null,
): string {
  if (efforts.length === 0 || !top) return '—';
  const topLabel = formatReasoningEffort(top);
  if (efforts.length === 1) return topLabel;
  return `${topLabel} · ${efforts.length - 1} other${efforts.length - 1 > 1 ? 's' : ''}`;
}

/** 0..100 → "85". null → "—". */
export function formatConfidence(c: number | null | undefined): string {
  if (c === null || c === undefined || !Number.isFinite(c)) return '—';
  return String(Math.round(c));
}

/** Client helper for fetching the public leaderboard. Never throws on non-2xx. */
export async function fetchLeaderboard(
  origin = '',
): Promise<LeaderboardData | null> {
  try {
    const response = await fetch(`${origin}/api/leaderboard`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (typeof data !== 'object' || data === null) return null;
    return data as LeaderboardData;
  } catch {
    return null;
  }
}

/** True when a row's appearance count is below the statistical threshold. */
export function isLowSample(row: Pick<LeaderboardRow, 'appearances'>): boolean {
  return row.appearances < LOW_SAMPLE_THRESHOLD;
}
