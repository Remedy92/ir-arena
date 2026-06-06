'use client';

import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface TopBarProps {
  revealModels: boolean;
  onRevealChange: (reveal: boolean) => void;
  isRunning?: boolean;
}

export function TopBar({
  revealModels,
  onRevealChange,
  isRunning = false,
}: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#EEEDEC] bg-[#FCFAF8] px-4 sm:px-6">
      <h1 className="font-['Newsreader',Georgia,serif] text-lg font-light tracking-tight text-[#67625B]">
        IR Arena
      </h1>

      <div className="flex items-center gap-3 sm:gap-4">
        <Badge
          variant="outline"
          className="hidden border-[#EEEDEC] bg-white text-[11px] font-normal tracking-wide text-[#67625B] sm:inline-flex"
        >
          Synthetic data
        </Badge>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs text-[#67625B] transition-colors',
              !revealModels && 'font-medium text-[#2E2B29]',
            )}
          >
            Blinded
          </span>
          <Switch
            checked={revealModels}
            onCheckedChange={onRevealChange}
            disabled={isRunning}
            aria-label="Toggle model reveal"
          />
          <span
            className={cn(
              'text-xs text-[#67625B] transition-colors',
              revealModels && 'font-medium text-[#2E2B29]',
            )}
          >
            Reveal
          </span>
        </div>

        {isRunning ? (
          <span
            className="size-2 shrink-0 animate-pulse rounded-full bg-[#F4C406]"
            aria-label="Triage running"
          />
        ) : null}
      </div>
    </header>
  );
}