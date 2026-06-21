import {
  formatConfidence,
  formatCost,
  formatLatency,
  formatReasoningEffort,
  formatPercent,
  type LeaderboardRow,
} from '@/lib/leaderboard';
import { cn } from '@/lib/utils';

interface Top3PodiumProps {
  /** Already sorted by winRate desc. Takes the first 3 with appearances > 0. */
  models: LeaderboardRow[];
}

/**
 * Compact 3-rank podium. Sleeker than a hero card: a single tight row with one
 * column per rank. #1 gets a subtle mustard hairline accent and a trophy; #2
 * and #3 are muted. Numbers in Geist Mono, model names in Newsreader. No
 * shadows, no big stat blocks — just the essentials (win rate, wins, runs,
 * latency) on one line each.
 */
export function Top3Podium({ models }: Top3PodiumProps) {
  const top3 = models.filter((m) => m.appearances > 0).slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <section
      aria-label="Top performers"
      className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3"
    >
      {top3.map((row, index) => {
        const rank = index + 1;
        const isTop = rank === 1;
        return (
          <PodiumCard key={row.slug} row={row} rank={rank} isTop={isTop} />
        );
      })}
    </section>
  );
}

function PodiumCard({
  row,
  rank,
  isTop,
}: {
  row: LeaderboardRow;
  rank: number;
  isTop: boolean;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-2 rounded-[12px] border bg-white px-3.5 py-3',
        isTop ? 'border-[#F4C406]' : 'border-[#EEEDEC]',
      )}
    >
      {/* Rank + dot + name */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] tabular-nums',
            isTop
              ? 'bg-[#F4C406] font-semibold text-[#2E2B29]'
              : 'bg-[#F4F2EF] text-[#67625B]',
          )}
          aria-label={`Rank ${rank}`}
        >
          {rank}
        </span>
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: row.dotColor }}
        />
        <span className="min-w-0 truncate font-['Newsreader',Georgia,serif] text-sm tracking-tight text-[#2E2B29]">
          {row.label}
        </span>
        {isTop ? (
          <TrophyIcon className="ml-auto size-3.5 shrink-0 text-[#F4C406]" />
        ) : null}
      </div>

      {/* Win rate (the headline number) */}
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'font-mono tabular-nums',
            isTop ? 'text-xl font-medium text-[#2E2B29]' : 'text-lg text-[#2E2B29]',
          )}
        >
          {formatPercent(row.winRate)}
        </span>
        <span className="text-[10px] tracking-wider text-[#A8A39D] uppercase">
          win rate
        </span>
      </div>

      {/* Compact stats line */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] tabular-nums text-[#67625B]">
        <span>
          <span className="text-[#2E2B29]">{row.wins}</span> wins
        </span>
        <span aria-hidden className="text-[#D8D5D0]">
          ·
        </span>
        <span>
          <span className="text-[#2E2B29]">{row.appearances}</span> runs
        </span>
        <span aria-hidden className="text-[#D8D5D0]">
          ·
        </span>
        <span>
          {row.avgLatencyMs !== null ? formatLatency(row.avgLatencyMs) : '—'}
        </span>
        <span aria-hidden className="text-[#D8D5D0]">
          ·
        </span>
        <span>{formatCost(row.avgCostMicroUsd)}</span>
        <span aria-hidden className="text-[#D8D5D0]">
          ·
        </span>
        <span>{formatConfidence(row.avgWinnerConfidence)} conf.</span>
        <span aria-hidden className="text-[#D8D5D0]">
          ·
        </span>
        <span>{formatReasoningEffort(row.topReasoningEffort)}</span>
      </div>
    </div>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 2.5h7v3a3.5 3.5 0 0 1-7 0v-3Z" />
      <path d="M4.5 3.5h-2v1a2 2 0 0 0 2 2M11.5 3.5h2v1a2 2 0 0 1-2 2" />
      <path d="M8 9v2.5M5.5 13.5h5M6.5 13.5l.4-2M9.5 13.5l-.4-2" />
    </svg>
  );
}
