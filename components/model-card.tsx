'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  formatConfidencePercent,
  normalizeTriagePartial,
  triageClientSchema,
  triageRequestSchema,
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
  startDelayMs?: number;
  onStateChange: (state: ModelCardSlotState) => void;
}

function formatDisplayError(error: Error | undefined): string | undefined {
  if (!error) {
    return undefined;
  }

  const message = error.message || 'Triage request failed.';
  if (
    error.name.includes('TypeValidation') ||
    message.toLowerCase().includes('schema') ||
    message.toLowerCase().includes('validation')
  ) {
    return 'Model response did not match the study JSON schema; excluded from agreement.';
  }

  if (message.includes('undefined') || message.includes('empty')) {
    return 'Gateway returned an empty response (often a temporary 503). Use Retry when ready.';
  }

  return 'Triage request failed. Use Retry when ready.';
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
  startDelayMs = 0,
  onStateChange,
}: ModelCardProps) {
  const startTimeRef = useRef<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | undefined>();
  const [finished, setFinished] = useState(false);
  const [finishError, setFinishError] = useState<Error | undefined>();
  // The fully validated study result. Streamed partials are shown while the
  // request is active, but final scoring only uses this schema-valid object.
  const [finalObject, setFinalObject] = useState<TriageResult | undefined>();

  const recordLatency = useCallback(() => {
    if (startTimeRef.current !== null) {
      setLatencyMs(Math.round(performance.now() - startTimeRef.current));
      startTimeRef.current = null;
    }
  }, []);

  const handleFinish = useCallback(
    ({
      object: result,
      error: schemaError,
    }: {
      object: TriageResult | undefined;
      error: Error | undefined;
    }) => {
      recordLatency();

      if (schemaError && process.env.NODE_ENV === 'development') {
        console.error(`[${model.slug}] schema validation:`, schemaError.message);
      }

      setFinalObject(result);
      setFinishError(schemaError);
      setFinished(schemaError === undefined && result !== undefined);
    },
    [model.slug, recordLatency],
  );

  const handleRequestError = useCallback(
    (requestError: Error) => {
      recordLatency();
      setFinished(false);
      setFinishError(requestError);
    },
    [recordLatency],
  );

  const { object, error, isLoading, submit, stop } = useObject<
    typeof triageClientSchema,
    TriageResult,
    TriageRequest
  >({
    api: '/api/triage',
    schema: triageClientSchema,
    onFinish: handleFinish,
    onError: handleRequestError,
  });

  const runSubmit = useCallback(() => {
    setFinished(false);
    setFinishError(undefined);
    setFinalObject(undefined);
    setLatencyMs(undefined);
    startTimeRef.current = performance.now();
    void submit({ case: caseText, model: model.slug });
  }, [caseText, model.slug, submit]);

  useEffect(() => {
    // Each run bumps the parent `key` (…-${runId}), remounting this card with
    // fresh state, so no manual reset is needed here.
    if (runId > 0 && caseText.trim().length >= 10) {
      const timer = window.setTimeout(() => {
        // Start the clock at the actual request, not before the stagger delay,
        // so staggered cards (e.g. Gemini's +1s offset) report true latency.
        startTimeRef.current = performance.now();
        void submit({ case: caseText, model: model.slug });
      }, startDelayMs);

      return () => window.clearTimeout(timer);
    }
    // Only re-run when the parent bumps runId to trigger a new triage pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  useEffect(() => () => stop(), [stop]);

  const rawError = error ?? finishError;
  const displayError = formatDisplayError(rawError);

  // Once finished, show the fully validated result; while streaming, show the
  // live partial without repairing schema drift.
  const displayObject = useMemo<DeepPartial<TriageResult> | undefined>(
    () =>
      finished && finalObject
        ? finalObject
        : (normalizeTriagePartial(object) as DeepPartial<TriageResult> | undefined),
    [finished, finalObject, object],
  );

  useEffect(() => {
    onStateChange({
      blindLabel,
      model,
      object: displayObject,
      isLoading,
      error: rawError,
      latencyMs,
      finished,
    });
  }, [
    blindLabel,
    model,
    displayObject,
    isLoading,
    rawError,
    latencyMs,
    finished,
    onStateChange,
  ]);

  const headerLabel = revealModels ? model.label : `Model ${blindLabel}`;
  const confidence = formatConfidencePercent(displayObject?.confidence);

  return (
    <Card
      className={cn(
        'gap-0 rounded-[14px] border border-[#EEEDEC] bg-white py-0 shadow-none ring-0',
        'animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-300',
        rawError && 'border-[#F5C6C6] bg-[#FEF8F8]',
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
        {rawError ? (
          <div className="flex flex-col gap-3">
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
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <DecisionBadge decision={displayObject?.decision} />
              {formatUrgency(displayObject?.urgency) ? (
                <span className="text-xs text-[#67625B]">
                  {formatUrgency(displayObject?.urgency)}
                </span>
              ) : null}
            </div>

            <Field label="Target vessel" value={displayObject?.targetVessel} />
            <Field label="Embolic agent" value={displayObject?.embolicAgent} />
            <Field label="Alternative plan" value={displayObject?.alternativePlan} />
            <Field label="Rationale" value={displayObject?.rationale} multiline />

            {displayObject?.redFlags && displayObject.redFlags.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-medium tracking-wide text-[#67625B] uppercase">
                  Red flags
                </span>
                <ul className="list-inside list-disc space-y-1 text-sm text-[#2E2B29]">
                  {displayObject.redFlags.map((flag, index) =>
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
          {isLoading
            ? 'Streaming'
            : finished
              ? 'Complete'
              : rawError
                ? 'Error'
                : 'Idle'}
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
