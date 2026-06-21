'use client';

import Link from 'next/link';

import { AuthControl } from '@/components/auth-control';
import { Badge } from '@/components/ui/badge';

interface TopBarProps {
  /** Optional mode breadcrumb shown beside the wordmark (e.g. "Side by side"). */
  mode?: string;
  /** Show the pulsing indicator while a run is streaming. */
  isRunning?: boolean;
}

export function TopBar({ mode, isRunning = false }: TopBarProps) {
  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#EEEDEC] bg-[#FCFAF8] px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <svg
            viewBox="0 0 24 24"
            className="size-[22px] shrink-0 text-[#2E2B29]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* incident-response shield */}
            <path
              d="M12 2.6 19 5.4v6.2c0 4.3-3 7.3-7 8.8-4-1.5-7-4.5-7-8.8V5.4z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* triage pulse — the signal under review */}
            <path
              d="M7.5 12h2.2l1.4-3 1.6 6 1.3-3h2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-['Newsreader',Georgia,serif] text-xl font-medium tracking-[-0.01em] text-[#2E2B29]">
            IR Arena
          </span>
        </Link>

        {mode ? (
          <>
            <span aria-hidden className="text-[#D8D5D0]">
              /
            </span>
            <span className="truncate text-sm text-[#67625B]">{mode}</span>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href="/benchmark"
          className="hidden text-sm text-[#67625B] transition-colors hover:text-[#2E2B29] sm:inline-flex"
        >
          Benchmark
        </Link>

        <Badge
          variant="outline"
          className="hidden border-[#EEEDEC] bg-white text-[11px] font-normal tracking-wide text-[#67625B] sm:inline-flex"
        >
          Synthetic data
        </Badge>

        {isRunning ? (
          <span
            className="size-2 shrink-0 animate-pulse rounded-full bg-[#F4C406]"
            aria-label="Triage running"
          />
        ) : null}

        <AuthControl />
      </div>
    </header>
  );
}
