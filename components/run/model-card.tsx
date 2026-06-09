'use client';

import { useEffect, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useSpring,
} from 'motion/react';
import type { DeepPartial } from 'ai';

import { DecisionBadge } from '@/components/decision-badge';
import { Button } from '@/components/ui/button';
import type { BlindLabel, ModelConfig } from '@/lib/models';
import { formatConfidencePercent, type TriageResult } from '@/lib/schema';
import {
  useTriageStream,
  type ModelCardSlotState,
} from '@/lib/use-triage-stream';
import { cn } from '@/lib/utils';

interface LiveModelCardProps {
  blindLabel: BlindLabel;
  model: ModelConfig;
  revealModels: boolean;
  caseText: string;
  runId: number;
  startDelayMs?: number;
  slotIndex: number;
  onStateChange: (state: ModelCardSlotState) => void;
}

const DECISIONS = new Set<TriageResult['decision']>([
  'EMBOLIZATION',
  'SURGERY',
  'CONSERVATIVE',
  'IMAGING_FIRST',
]);

const URGENCY_LABELS: Record<NonNullable<TriageResult['urgency']>, string> = {
  IMMEDIATE: 'Immediate',
  URGENT_2H: 'Urgent (2h)',
  SEMI_ELECTIVE: 'Semi-elective',
};

function formatUrgency(
  urgency: DeepPartial<TriageResult>['urgency'],
): string | undefined {
  if (
    urgency === 'IMMEDIATE' ||
    urgency === 'URGENT_2H' ||
    urgency === 'SEMI_ELECTIVE'
  ) {
    return URGENCY_LABELS[urgency];
  }
  return typeof urgency === 'string' ? urgency : undefined;
}

function isDecision(
  value: string | undefined,
): value is TriageResult['decision'] {
  return value !== undefined && DECISIONS.has(value as TriageResult['decision']);
}

export function LiveModelCard({
  blindLabel,
  model,
  revealModels,
  caseText,
  runId,
  startDelayMs = 0,
  slotIndex,
  onStateChange,
}: LiveModelCardProps) {
  const {
    displayObject,
    displayError,
    rawError,
    isLoading,
    finished,
    latencyMs,
    runSubmit,
  } = useTriageStream({
    blindLabel,
    model,
    caseText,
    runId,
    startDelayMs,
    onStateChange,
  });

  const headerLabel = revealModels ? model.label : `Model ${blindLabel}`;
  const confidence = formatConfidencePercent(displayObject?.confidence);
  const decision = displayObject?.decision;
  const urgency = formatUrgency(displayObject?.urgency);
  const status = isLoading
    ? 'Streaming'
    : finished
      ? 'Complete'
      : rawError
        ? 'Error'
        : 'Idle';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
        delay: slotIndex * 0.08,
      }}
      className={cn(
        'flex flex-col overflow-hidden rounded-[14px] border border-[#EEEDEC] bg-white',
        rawError && 'border-[#F5C6C6] bg-[#FEF8F8]',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#EEEDEC] px-4 py-3">
        {revealModels ? (
          <motion.span
            layout
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: model.dotColor }}
            aria-hidden
          />
        ) : null}
        <span
          className={cn(
            'font-["Newsreader",Georgia,serif] text-sm font-normal tracking-tight text-[#2E2B29]',
            isLoading &&
              'underline decoration-[#F4C406] decoration-2 underline-offset-4',
          )}
        >
          {headerLabel}
        </span>
        {isLoading ? (
          <motion.span
            className="size-2 shrink-0 rounded-full bg-[#F4C406]"
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ repeat: Infinity, duration: 0.9, ease: 'easeInOut' }}
            aria-label="Streaming"
          />
        ) : null}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 px-4 py-4">
        <AnimatePresence mode="wait" initial={false}>
          {rawError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              <p className="text-sm text-[#9F2F2D]">{displayError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runSubmit}
                className="w-fit border-[#EEEDEC]"
              >
                Retry
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              {/* Decision + urgency */}
              <div className="flex flex-wrap items-center gap-2">
                <AnimatePresence mode="wait" initial={false}>
                  {isDecision(decision) ? (
                    <motion.div
                      key={decision}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                      }}
                    >
                      <DecisionBadge decision={decision} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="decision-skeleton"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <ShimmerLine className="h-5 w-24 rounded-full" />
                    </motion.div>
                  )}
                </AnimatePresence>
                {urgency ? (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-[#67625B]"
                  >
                    {urgency}
                  </motion.span>
                ) : null}
              </div>

              <AnimatedField label="Target vessel" value={displayObject?.targetVessel} />
              <AnimatedField label="Embolic agent" value={displayObject?.embolicAgent} />
              <AnimatedField
                label="Alternative plan"
                value={displayObject?.alternativePlan}
              />
              <AnimatedField
                label="Rationale"
                value={displayObject?.rationale}
                multiline
              />

              {displayObject?.redFlags && displayObject.redFlags.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-medium tracking-wide text-[#67625B] uppercase">
                    Red flags
                  </span>
                  <ul className="flex flex-col gap-1 text-sm text-[#2E2B29]">
                    <AnimatePresence initial={false}>
                      {displayObject.redFlags.map((flag, index) =>
                        flag ? (
                          <motion.li
                            key={`${flag}-${index}`}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-start gap-1.5 leading-snug"
                          >
                            <span
                              aria-hidden
                              className="mt-1.5 size-1 shrink-0 rounded-full bg-[#9A958E]"
                            />
                            <span>{flag}</span>
                          </motion.li>
                        ) : null,
                      )}
                    </AnimatePresence>
                  </ul>
                </div>
              ) : null}

              <AnimatedConfidence confidence={confidence} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#EEEDEC] bg-[#FCFAF8] px-4 py-2.5">
        <span className="font-mono text-[11px] tabular-nums text-[#67625B]">
          {isLoading
            ? '…'
            : latencyMs !== undefined
              ? `${latencyMs} ms`
              : '—'}
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={status}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.15 }}
            className="text-[11px] text-[#67625B]"
          >
            {status}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ShimmerLine({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative block overflow-hidden rounded-full bg-[#EEEDEC]',
        className,
      )}
    >
      <motion.span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
      />
    </span>
  );
}

function AnimatedField({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string | undefined;
  multiline?: boolean;
}) {
  const hasValue = typeof value === 'string' && value.trim().length > 0;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium tracking-wide text-[#67625B] uppercase">
        {label}
      </span>
      <div className={cn('min-h-[1.25rem]', multiline && 'min-h-[2.5rem]')}>
        <AnimatePresence mode="wait" initial={false}>
          {hasValue ? (
            <motion.p
              key="value"
              title={!multiline ? value : undefined}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'text-sm text-[#2E2B29]',
                multiline ? 'leading-relaxed' : 'truncate',
              )}
            >
              {value}
            </motion.p>
          ) : (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-1.5 pt-1"
            >
              <ShimmerLine className="h-3 w-3/4" />
              {multiline ? <ShimmerLine className="h-3 w-1/2" /> : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AnimatedConfidence({ confidence }: { confidence: number | undefined }) {
  const spring = useSpring(0, { stiffness: 120, damping: 20 });
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    spring.set(confidence ?? 0);
  }, [confidence, spring]);

  useMotionValueEvent(spring, 'change', (value) => {
    setDisplayed(Math.round(value));
  });

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[#EEEDEC]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-[#2E2B29]"
          initial={{ width: 0 }}
          animate={{ width: `${confidence ?? 0}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-[#67625B]">
        {confidence !== undefined ? `${displayed}%` : '—'}
      </span>
    </div>
  );
}
