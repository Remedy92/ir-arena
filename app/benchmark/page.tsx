import type { Metadata } from 'next';

import { DisclaimerStrip } from '@/components/disclaimer-strip';
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table';
import { MethodologyFooter } from '@/components/leaderboard/methodology-footer';
import { TopBar } from '@/components/top-bar';
import { getLeaderboardData } from '@/lib/leaderboard-data';

export const metadata: Metadata = {
  title: 'Benchmark · IR Arena',
  description:
    'Aggregate win-rate benchmark for the blinded interventional radiology triage comparison. Wilson 95% confidence intervals. Synthetic cases only.',
};

// ISR: refresh the aggregate every 5 minutes. The API route shares this
// revalidate window so the JSON and the page stay in sync.
export const revalidate = 300;

export default async function BenchmarkPage() {
  // ISR prerenders this page at build time; the DB (or the run_arms table) may
  // not be available then. Fall back to the empty state so the build never
  // breaks on a missing/misconfigured DB — the page revalidates every 5 min
  // and picks up real data once the DB is reachable.
  let data;
  try {
    data = await getLeaderboardData();
  } catch (error) {
    console.error('[benchmark] data fetch failed:', error);
    data = {
      models: [],
      totalRuns: 0,
      totalVoters: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  const generatedLabel = formatGeneratedLabel(data.generatedAt);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar mode="Benchmark" />
      <DisclaimerStrip />

      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pt-6 pb-4">
          <header className="flex flex-col gap-1">
            <h1 className="font-['Newsreader',Georgia,serif] text-2xl font-light tracking-tight text-[#2E2B29] sm:text-3xl">
              Benchmark
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#67625B]">
              Aggregate win rates from blinded side-by-side triage comparisons.
              User-judged preferences, not objective correctness.
            </p>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-[#67625B]">
              {data.totalRuns.toLocaleString()}{' '}
              {data.totalRuns === 1 ? 'run' : 'runs'} ·{' '}
              {data.totalVoters.toLocaleString()}{' '}
              {data.totalVoters === 1 ? 'voter' : 'voters'}
              {generatedLabel ? ` · ${generatedLabel}` : ''}
            </p>
          </header>

          <LeaderboardTable data={data} />

          <MethodologyFooter />
        </div>
      </main>
    </div>
  );
}

/** ISO timestamp → "updated 2 minutes ago" / "updated just now" / undefined. */
function formatGeneratedLabel(iso: string): string | undefined {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return undefined;
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 10) return 'updated just now';
  if (seconds < 60) return `updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `updated ${days}d ago`;
}
