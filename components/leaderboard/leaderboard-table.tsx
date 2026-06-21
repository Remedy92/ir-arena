'use client';

import Link from 'next/link';

import { CiBar } from '@/components/leaderboard/ci-bar';
import { WinRateBar } from '@/components/leaderboard/win-rate-bar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatConfidence,
  formatCost,
  formatLatency,
  formatReasoningSummary,
  isLowSample,
  type LeaderboardData,
  type LeaderboardRow,
} from '@/lib/leaderboard';
import { cn } from '@/lib/utils';

interface LeaderboardTableProps {
  data: LeaderboardData;
}

const TH_BASE =
  'h-9 text-[10px] font-medium tracking-wider text-[#67625B] uppercase';
const TD_NUM =
  'font-mono text-xs tabular-nums text-[#2E2B29]';
const TD_MUTED = 'font-mono text-xs tabular-nums text-[#67625B]';

export function LeaderboardTable({ data }: LeaderboardTableProps) {
  if (data.models.length === 0) {
    return <EmptyState />;
  }

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[14px] border border-[#EEEDEC] bg-white">
        <div className="border-b border-[#EEEDEC] px-4 py-3">
          <h2 className="text-sm font-medium text-[#2E2B29]">Standings</h2>
          <p className="mt-0.5 text-xs text-[#67625B]">
            Ranked by win rate. Wilson 95% confidence interval shown.
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-[#EEEDEC] hover:bg-transparent">
              <TableHead className={cn(TH_BASE, 'w-8 pl-4')}>#</TableHead>
              <TableHead className={TH_BASE}>Model</TableHead>
              <TableHead className={cn(TH_BASE, 'text-right')}>Wins</TableHead>
              <TableHead
                className={cn(TH_BASE, 'text-right hidden sm:table-cell')}
              >
                Runs
              </TableHead>
              <TableHead className={cn(TH_BASE, 'min-w-32')}>
                Win rate
              </TableHead>
              <TableHead className={cn(TH_BASE, 'min-w-36 hidden sm:table-cell')}>
                95% CI
              </TableHead>
              <TableHead
                className={cn(TH_BASE, 'text-right hidden md:table-cell')}
              >
                Avg conf.
              </TableHead>
              <TableHead
                className={cn(TH_BASE, 'text-right hidden md:table-cell')}
              >
                Avg latency
              </TableHead>
              <TableHead
                className={cn(TH_BASE, 'text-right hidden md:table-cell')}
              >
                Avg cost
              </TableHead>
              <TableHead
                className={cn(TH_BASE, 'hidden lg:table-cell')}
              >
                Thinking
              </TableHead>
              <TableHead
                className={cn(TH_BASE, 'text-right hidden lg:table-cell pr-4')}
              >
                Blind / Reveal
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.models.map((row, index) => (
              <LeaderboardRow
                key={row.slug}
                row={row}
                rank={index + 1}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function LeaderboardRow({ row, rank }: { row: LeaderboardRow; rank: number }) {
  const low = isLowSample(row);
  const isTop = rank === 1;

  return (
    <TableRow
      className={cn(
        'border-[#EEEDEC]',
        low && 'bg-[#FBFAF8]',
        'hover:bg-[#F4F2EF]',
      )}
    >
      <TableCell className={cn('pl-4', TD_NUM, isTop && 'bg-[#FFF8E0]')}>
        {rank}
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: row.dotColor }}
          />
          <span
            className={cn(
              'font-["Newsreader",Georgia,serif] text-sm tracking-tight text-[#2E2B29]',
              low && 'italic',
            )}
          >
            {row.label}
            {row.footnote ? (
              <Tooltip>
                <TooltipTrigger
                  className="ml-0.5 align-super text-[10px] text-[#67625B] hover:text-[#2E2B29]"
                  aria-label="Footnote"
                >
                  *
                </TooltipTrigger>
                <TooltipContent>{row.footnote}</TooltipContent>
              </Tooltip>
            ) : null}
          </span>
          {low ? (
            <span className="hidden text-[10px] font-medium tracking-wider text-[#A8A39D] uppercase sm:inline">
              low sample
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 text-[11px] text-[#67625B]">{row.provider}</div>
      </TableCell>
      <TableCell className={cn('text-right', TD_NUM)}>{row.wins}</TableCell>
      <TableCell className={cn('text-right hidden sm:table-cell', TD_MUTED)}>
        {row.appearances}
      </TableCell>
      <TableCell className="py-3">
        <WinRateBar rate={row.winRate} />
      </TableCell>
      <TableCell className="hidden py-3 sm:table-cell">
        <CiBar ciLow={row.ciLow} ciHigh={row.ciHigh} rate={row.winRate} />
      </TableCell>
      <TableCell className={cn('text-right hidden md:table-cell', TD_MUTED)}>
        {formatConfidence(row.avgWinnerConfidence)}
      </TableCell>
      <TableCell className={cn('text-right hidden md:table-cell', TD_MUTED)}>
        {formatLatency(row.avgWinnerLatencyMs)}
      </TableCell>
      <TableCell className={cn('text-right hidden md:table-cell', TD_MUTED)}>
        {formatCost(row.avgCostMicroUsd)}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <span className={cn('font-mono text-xs tabular-nums text-[#67625B]')}>
          {formatReasoningSummary(row.reasoningEfforts, row.topReasoningEffort)}
        </span>
      </TableCell>
      <TableCell
        className={cn('text-right hidden lg:table-cell pr-4', TD_MUTED)}
      >
        {row.blindedWins} / {row.revealedWins}
      </TableCell>
    </TableRow>
  );
}

function EmptyState() {
  return (
    <section className="w-full">
      <div className="flex flex-col items-center gap-4 rounded-[14px] border border-[#EEEDEC] bg-white px-6 py-16 text-center">
        <h2 className="font-['Newsreader',Georgia,serif] text-2xl font-light tracking-tight text-[#2E2B29]">
          No benchmark data yet
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-[#67625B]">
          Run a comparison and save a verdict to populate the leaderboard.
          Wins are aggregated from blinded user picks across all signed-in
          voters.
        </p>
        <Link
          href="/"
          className="h-9 rounded-[12px] bg-[#2E2B29] px-5 text-sm font-medium text-white transition-colors hover:bg-[#2E2B29]/90"
        >
          Set up a comparison
        </Link>
      </div>
    </section>
  );
}
