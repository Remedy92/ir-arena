'use client';

import { DecisionBadge } from '@/components/decision-badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  computeConsensus,
  shouldShowConsensus,
  type ConsensusField,
} from '@/lib/consensus';
import type { TriageResult } from '@/lib/schema';
import type { ModelCardSlotState } from '@/lib/use-triage-stream';
import type { VoteSaveState } from '@/lib/votes';
import type { BlindLabel } from '@/lib/models';
import { cn } from '@/lib/utils';

interface RunSidebarProps {
  slots: ModelCardSlotState[];
  revealModels: boolean;
  onRevealChange: (reveal: boolean) => void;
  onRunAgain: () => void;
  onEdit: () => void;
  isRunning: boolean;
  finishedCount: number;
  total: number;
  winnerLabel: BlindLabel | null;
  saveState: VoteSaveState;
  saveError?: string;
  onSaveVote: () => void;
}

const AGREEMENT_LABELS: Record<ConsensusField, string> = {
  decision: 'Decision',
  urgency: 'Urgency',
  targetVessel: 'Vessel',
  embolicAgent: 'Agent',
};

type SlotStatus = 'streaming' | 'complete' | 'error' | 'idle';

function statusOf(slot: ModelCardSlotState): SlotStatus {
  if (slot.error) return 'error';
  if (slot.finished) return 'complete';
  if (slot.isLoading) return 'streaming';
  return 'idle';
}

const STATUS_DOT: Record<SlotStatus, string> = {
  streaming: 'bg-[#F4C406]',
  complete: 'bg-[#346538]',
  error: 'bg-[#9F2F2D]',
  idle: 'bg-[#D8D5D0]',
};

const STATUS_TEXT: Record<SlotStatus, string> = {
  streaming: 'Streaming',
  complete: 'Complete',
  error: 'Error',
  idle: 'Queued',
};

function isDecision(value: string | undefined): value is TriageResult['decision'] {
  return (
    value === 'EMBOLIZATION' ||
    value === 'SURGERY' ||
    value === 'CONSERVATIVE' ||
    value === 'IMAGING_FIRST'
  );
}

export function RunSidebar({
  slots,
  revealModels,
  onRevealChange,
  onRunAgain,
  onEdit,
  isRunning,
  finishedCount,
  total,
  winnerLabel,
  saveState,
  saveError,
  onSaveVote,
}: RunSidebarProps) {
  const votingOpen = !isRunning && finishedCount > 0;
  const winnerSlot = winnerLabel
    ? slots.find((slot) => slot.blindLabel === winnerLabel)
    : undefined;
  const winnerName = winnerSlot
    ? revealModels
      ? winnerSlot.model.label
      : `Model ${winnerSlot.blindLabel}`
    : undefined;
  const showAgreement = shouldShowConsensus(finishedCount);
  const agreementRows = showAgreement
    ? computeConsensus(
        slots.map((slot) => ({
          label: slot.blindLabel,
          result: slot.object as TriageResult | undefined,
          finished: slot.finished,
        })),
      )
    : [];

  return (
    <aside className="flex shrink-0 flex-col overflow-y-auto border-b border-[#EEEDEC] bg-[#FCFAF8] md:w-72 md:border-r md:border-b-0 lg:w-80">
      {/* Header / progress */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5 items-center justify-center">
            <span
              aria-hidden
              className={cn(
                'inline-flex size-2 rounded-full',
                isRunning ? 'animate-pulse bg-[#F4C406]' : 'bg-[#346538]',
              )}
            />
          </span>
          <h2 className="text-xs font-medium tracking-wide text-[#67625B] uppercase">
            {isRunning ? 'Live triage' : 'Complete'}
          </h2>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-[#67625B]">
          {finishedCount}/{total}
        </span>
      </div>

      {/* Per-model status list */}
      <ul className="flex min-h-0 flex-col gap-1 px-2.5 pb-3">
        {slots.map((slot) => {
          const status = statusOf(slot);
          const label = revealModels
            ? slot.model.label
            : `Model ${slot.blindLabel}`;
          const decision = slot.object?.decision;
          return (
            <li
              key={slot.blindLabel}
              className="flex items-center gap-2.5 rounded-[10px] px-2 py-2"
            >
              <span
                role="img"
                aria-label={STATUS_TEXT[status]}
                className={cn(
                  'size-2 shrink-0 rounded-full',
                  STATUS_DOT[status],
                  status === 'streaming' && 'animate-pulse',
                )}
              />
              {revealModels ? (
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: slot.model.dotColor }}
                />
              ) : null}
              <span className="min-w-0 flex-1 truncate font-['Newsreader',Georgia,serif] text-sm tracking-tight text-[#2E2B29]">
                {label}
              </span>
              {status === 'error' ? (
                <span className="font-mono text-[10px] tracking-wide text-[#9F2F2D] uppercase">
                  Error
                </span>
              ) : isDecision(decision) ? (
                <DecisionBadge decision={decision} />
              ) : (
                <span className="font-mono text-[10px] tabular-nums text-[#67625B]">
                  {slot.latencyMs !== undefined
                    ? `${slot.latencyMs}ms`
                    : STATUS_TEXT[status]}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* Agreement summary */}
      {showAgreement ? (
        <div className="mt-1 border-t border-[#EEEDEC] px-4 py-3">
          <h3 className="mb-2 text-[10px] font-medium tracking-wider text-[#67625B] uppercase">
            Agreement
          </h3>
          <dl className="flex flex-col gap-1.5">
            {agreementRows.map((row) => (
              <div
                key={row.field}
                className="flex items-center justify-between gap-2"
              >
                <dt className="text-xs text-[#67625B]">
                  {AGREEMENT_LABELS[row.field]}
                </dt>
                <dd>
                  {row.agreed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EDF3EC] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[#346538] uppercase">
                      <CheckIcon className="size-2.5" />
                      Match
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#F0EFED] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[#67625B] uppercase">
                      Varies
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {/* Your verdict — winner pick + save */}
      {votingOpen ? (
        <div className="border-t border-[#EEEDEC] px-4 py-3">
          <h3 className="mb-2 text-[10px] font-medium tracking-wider text-[#67625B] uppercase">
            Your verdict
          </h3>
          {winnerLabel ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#67625B]">Best triage</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2E2B29]">
                  <TrophyIcon className="size-3.5 text-[#2E2B29]" />
                  {winnerName}
                </span>
              </div>
              {saveState === 'saved' ? (
                <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#EDF3EC] px-2.5 py-1.5 text-[11px] font-medium text-[#346538]">
                  <CheckIcon className="size-3" />
                  Saved{winnerName ? ` · ${winnerName}` : ''}
                </span>
              ) : (
                <Button
                  type="button"
                  onClick={onSaveVote}
                  disabled={saveState === 'saving'}
                  className="h-9 w-full rounded-[12px] bg-[#2E2B29] text-sm font-medium text-white hover:bg-[#2E2B29]/90"
                >
                  {saveState === 'saving'
                    ? 'Saving…'
                    : revealModels
                      ? 'Save pick'
                      : 'Save pick & reveal'}
                </Button>
              )}
              {saveState === 'error' ? (
                <span className="text-[11px] text-[#9F2F2D]">
                  Couldn’t save{saveError ? `: ${saveError}` : ''}. Try again.
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-xs leading-snug text-[#67625B]">
              Which model handled it best? Tap{' '}
              <span className="font-medium text-[#2E2B29]">Pick winner</span> on a
              card
              {revealModels ? '.' : ' — identities stay hidden until you save.'}
            </p>
          )}
        </div>
      ) : null}

      {/* Controls — pinned to the bottom on desktop */}
      <div className="mt-auto flex flex-col gap-3 border-t border-[#EEEDEC] px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-xs transition-colors',
              revealModels ? 'text-[#67625B]' : 'font-medium text-[#2E2B29]',
            )}
          >
            Blinded
          </span>
          <Switch
            checked={revealModels}
            onCheckedChange={onRevealChange}
            disabled={isRunning}
            aria-label="Reveal model identities"
          />
          <span
            className={cn(
              'text-xs transition-colors',
              revealModels ? 'font-medium text-[#2E2B29]' : 'text-[#67625B]',
            )}
          >
            Reveal
          </span>
        </div>

        <Button
          type="button"
          onClick={onRunAgain}
          disabled={isRunning}
          className="h-9 w-full rounded-[12px] bg-[#2E2B29] text-sm font-medium text-white hover:bg-[#2E2B29]/90"
        >
          {isRunning ? 'Running…' : 'Run again'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onEdit}
          disabled={isRunning}
          className="h-9 w-full rounded-[12px] border-[#EEEDEC] bg-white text-sm font-medium text-[#2E2B29] hover:bg-[#F4F2EF]"
        >
          Edit comparison
        </Button>
      </div>
    </aside>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
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
