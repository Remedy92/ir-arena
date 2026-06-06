'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import type { DeepPartial } from 'ai';

import { DecisionBadge } from '@/components/decision-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { BlindLabel, ModelConfig } from '@/lib/models';
import {
  triageRequestSchema,
  triageSchema,
  type TriageResult,
} from '@/lib/schema';
import { cn } from '@/lib/utils';
import type { z } from 'zod';

type TriageRequest = z.infer<typeof triageRequestSchema>;

export interface ModelCardSlotState {
  blindLabel: BlindLabel;
  model: ModelConfig;
  object: DeepPartial<TriageResult> | undefined;
  isLoading: boolean;
  error: Error | undefined;
  latencyMs: number | undefined;
  finished: boolean;
}

interface ModelCardProps {
  blindLabel: BlindLabel;
  model: ModelConfig;
  revealModels: boolean;
  caseText: string;
  runId: number;
  onStateChange: (state: ModelCardSlotState) => void;
}

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

export function ModelCard({
  blindLabel,
  model,
  revealModels,
  caseText,
  runId,
  onStateChange,
}: ModelCardProps) {
  const startTimeRef = useRef<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | undefined>();
  const [finished, setFinished] = useState(false);

  const handleFinish = useCallback(
    ({
      object: result,
      error: finishError,
    }: {
      object: TriageResult | undefined;
      error: Error | undefined;
    }) => {
      if (startTimeRef.current !== null) {
        setLatencyMs(Math.round(performance.now() - startTimeRef.current));
        startTimeRef.current = null;
      }

      setFinished(finishError === undefined && result !== undefined);
    },
    [],
  );

  const { object, error, isLoading, submit } = useObject<
    typeof triageSchema,
    TriageResult,
    TriageRequest
  >({
    api: '/api/triage',
    schema: triageSchema,
    onFinish: handleFinish,
  });

  const runSubmit = useCallback(() => {
    setFinished(false);
    setLatencyMs(undefined);
    startTimeRef.current = performance.now();
    void submit({ case: caseText, model: model.slug });
  }, [caseText, model.slug, submit]);

  useEffect(() => {
    if (runId > 0 && caseText.trim().length >= 10) {
      startTimeRef.current = performance.now();
      void submit({ case: caseText, model: model.slug });
    }
    // Only re-run when the parent bumps runId to trigger a new triage pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => {
    onStateChange({
      blindLabel,
      model,
      object,
      isLoading,
      error,
      latencyMs,
      finished,
    });
  }, [
    blindLabel,
    model,
    object,
    isLoading,
    error,
    latencyMs,
    finished,
    onStateChange,
  ]);

  const headerLabel = revealModels ? model.label : `Model ${blindLabel}`;
  const confidence =
    typeof object?.confidence === 'number' ? object.confidence : undefined;

  return (
    <Card
      className={cn(
        'gap-0 rounded-[14px] border border-[#EEEDEC] bg-white py-0 shadow-none ring-0',
        'animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-300',
        error && 'border-[#F5C6C6] bg-[#FEF8F8]',
      )}
    >
      <CardHeader className="border-b border-[#EEEDEC] px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-[#2E2B29]">
          {revealModels ? (
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: model.dotColor }}
              aria-hidden
            />
          ) : null}
          <span
            className={cn(
              'font-["Newsreader",Georgia,serif] font-normal tracking-tight',
              isLoading && 'underline decoration-[#F4C406] decoration-2 underline-offset-4',
            )}
          >
            {headerLabel}
          </span>
          {isLoading ? (
            <span
              className="size-2 shrink-0 animate-pulse rounded-full bg-[#F4C406]"
              aria-label="Streaming"
            />
          ) : null}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 px-4 py-4">
        {error ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[#9F2F2D]">
              {error.message || 'Triage request failed.'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runSubmit}
              className="w-fit border-[#EEEDEC]"
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <DecisionBadge decision={object?.decision} />
              {formatUrgency(object?.urgency) ? (
                <span className="text-xs text-[#67625B]">
                  {formatUrgency(object?.urgency)}
                </span>
              ) : null}
            </div>

            <Field label="Target vessel" value={object?.targetVessel} />
            <Field label="Embolic agent" value={object?.embolicAgent} />
            <Field label="Alternative plan" value={object?.alternativePlan} />
            <Field label="Rationale" value={object?.rationale} multiline />

            {object?.redFlags && object.redFlags.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-medium tracking-wide text-[#67625B] uppercase">
                  Red flags
                </span>
                <ul className="list-inside list-disc space-y-1 text-sm text-[#2E2B29]">
                  {object.redFlags.map((flag, index) =>
                    flag ? (
                      <li key={`${flag}-${index}`} className="leading-snug">
                        {flag}
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <div className="relative h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-[#EEEDEC]">
                <div
                  className="absolute inset-y-0 left-0 bg-[#2E2B29] transition-all duration-300"
                  style={{ width: `${confidence ?? 0}%` }}
                />
              </div>
              <span className="shrink-0 font-mono text-xs text-[#67625B]">
                {confidence !== undefined ? `${Math.round(confidence)}%` : '—'}
              </span>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-[#EEEDEC] bg-[#FCFAF8] px-4 py-2.5">
        <span className="font-mono text-[11px] text-[#67625B]">
          {isLoading
            ? '…'
            : latencyMs !== undefined
              ? `${latencyMs} ms`
              : '—'}
        </span>
        <span className="text-[11px] text-[#67625B]">
          {isLoading ? 'Streaming' : finished ? 'Complete' : 'Idle'}
        </span>
      </CardFooter>
    </Card>
  );
}

function Field({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string | undefined;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium tracking-wide text-[#67625B] uppercase">
        {label}
      </span>
      <p
        className={cn(
          'text-sm text-[#2E2B29]',
          multiline ? 'leading-relaxed' : 'truncate',
          !value && 'text-[#67625B]',
        )}
      >
        {value || '—'}
      </p>
    </div>
  );
}