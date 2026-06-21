import { getSql } from '@/lib/db';
import {
  type LeaderboardData,
  type LeaderboardRow,
  wilsonInterval,
} from '@/lib/leaderboard';
import { getModelBySlug, hasSubstitutionFootnote } from '@/lib/models';

/**
 * Server-only leaderboard aggregation. Querys `run_votes` (wins, blinded split,
 * reasoning effort), `run_arms` (appearances, per-arm averages), and
 * `usage_events` (avg cost per call) in parallel, joins to the model catalog
 * in TypeScript, and computes Wilson 95% CIs. Never selects `user_id` or
 * `case_text` into the response.
 *
 * Empty DB → returns `{ models: [], totalRuns: 0, totalVoters: 0 }` so the UI
 * can render the empty state.
 */
export async function getLeaderboardData(): Promise<LeaderboardData> {
  const [aggRows, costRows, reasoningRows, totalsRows] = await Promise.all([
    getSql()`
      WITH wins AS (
        SELECT winner_slug AS slug,
               COUNT(*) AS wins,
               COUNT(*) FILTER (WHERE blinded_at_vote) AS blinded_wins,
               COUNT(*) FILTER (WHERE NOT blinded_at_vote) AS revealed_wins
        FROM run_votes
        GROUP BY winner_slug
      ),
      appearances AS (
        SELECT slug,
               COUNT(DISTINCT run_uuid) AS appearances,
               AVG(confidence) FILTER
                 (WHERE is_winner AND confidence IS NOT NULL) AS avg_winner_confidence,
               AVG(latency_ms) FILTER
                 (WHERE is_winner AND latency_ms IS NOT NULL) AS avg_winner_latency_ms,
               AVG(latency_ms) FILTER
                 (WHERE latency_ms IS NOT NULL) AS avg_latency_ms
        FROM run_arms
        GROUP BY slug
      )
      SELECT
        COALESCE(w.slug, a.slug) AS slug,
        COALESCE(w.wins, 0) AS wins,
        COALESCE(a.appearances, 0) AS appearances,
        COALESCE(w.blinded_wins, 0) AS blinded_wins,
        COALESCE(w.revealed_wins, 0) AS revealed_wins,
        a.avg_winner_confidence AS avg_winner_confidence,
        a.avg_winner_latency_ms AS avg_winner_latency_ms,
        a.avg_latency_ms AS avg_latency_ms
      FROM wins w
      FULL OUTER JOIN appearances a ON w.slug = a.slug
    `,
    getSql()`
      SELECT model_slug AS slug,
             AVG(cost_micro_usd) AS avg_cost_micro_usd,
             COUNT(*) AS call_count
      FROM usage_events
      WHERE status = 'settled' AND cost_micro_usd IS NOT NULL
      GROUP BY model_slug
    `,
    getSql()`
      SELECT ra.slug AS slug,
             rv.reasoning AS reasoning,
             COUNT(*) AS run_count
      FROM run_arms ra
      JOIN run_votes rv ON ra.run_vote_id = rv.id
      WHERE rv.reasoning IS NOT NULL
      GROUP BY ra.slug, rv.reasoning
    `,
    getSql()`
      SELECT
        COUNT(DISTINCT run_uuid) AS total_runs,
        COUNT(DISTINCT user_id) AS total_voters
      FROM run_votes
    `,
  ]);

  // Index cost by slug for fast lookup.
  const costBySlug = new Map<
    string,
    { avgCostMicroUsd: number; callCount: number }
  >();
  for (const row of costRows) {
    costBySlug.set(String(row.slug), {
      avgCostMicroUsd: toNumber(row.avg_cost_micro_usd),
      callCount: toNumber(row.call_count),
    });
  }

  // Index reasoning by slug → list of { effort, runCount }, sorted by runCount desc.
  const reasoningBySlug = new Map<
    string,
    Array<{ effort: string; runCount: number }>
  >();
  for (const row of reasoningRows) {
    const slug = String(row.slug);
    const effort = String(row.reasoning);
    const runCount = toNumber(row.run_count);
    const list = reasoningBySlug.get(slug) ?? [];
    list.push({ effort, runCount });
    reasoningBySlug.set(slug, list);
  }
  for (const list of reasoningBySlug.values()) {
    list.sort((a, b) => b.runCount - a.runCount);
  }

  const models: LeaderboardRow[] = [];
  for (const row of aggRows) {
    const slug = String(row.slug);
    const config = getModelBySlug(slug);
    // Skip slugs no longer in the catalog (e.g. a deprecated model). Their
    // wins still count toward totals, but they don't render as a row.
    if (!config) continue;

    const wins = toNumber(row.wins);
    const appearances = toNumber(row.appearances);
    const winRate = appearances > 0 ? wins / appearances : 0;
    const { ciLow, ciHigh } = wilsonInterval(wins, appearances);

    const cost = costBySlug.get(slug);
    const reasoning = reasoningBySlug.get(slug) ?? [];
    const reasoningEfforts = reasoning.map((r) => r.effort);
    const topReasoningEffort =
      reasoning.length > 0 ? reasoning[0].effort : null;

    models.push({
      slug: config.slug,
      label: config.label,
      provider: config.provider,
      dotColor: config.dotColor,
      footnote: hasSubstitutionFootnote(config) ? config.footnote : undefined,
      wins,
      appearances,
      winRate,
      ciLow,
      ciHigh,
      avgWinnerConfidence:
        row.avg_winner_confidence !== null
          ? Math.round(toNumber(row.avg_winner_confidence))
          : null,
      avgWinnerLatencyMs:
        row.avg_winner_latency_ms !== null
          ? Math.round(toNumber(row.avg_winner_latency_ms))
          : null,
      avgLatencyMs:
        row.avg_latency_ms !== null
          ? Math.round(toNumber(row.avg_latency_ms))
          : null,
      avgCostMicroUsd: cost ? cost.avgCostMicroUsd : null,
      callCount: cost ? cost.callCount : 0,
      reasoningEfforts,
      topReasoningEffort,
      blindedWins: toNumber(row.blinded_wins),
      revealedWins: toNumber(row.revealed_wins),
    });
  }

  models.sort((a, b) =>
    b.winRate === a.winRate
      ? b.wins === a.wins
        ? a.slug.localeCompare(b.slug)
        : b.wins - a.wins
      : b.winRate - a.winRate,
  );

  const totals = totalsRows[0] ?? { total_runs: 0, total_voters: 0 };

  return {
    models,
    totalRuns: toNumber(totals.total_runs),
    totalVoters: toNumber(totals.total_voters),
    generatedAt: new Date().toISOString(),
  };
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
