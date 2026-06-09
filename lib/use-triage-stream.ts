'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import type { DeepPartial } from 'ai';
import type { z } from 'zod';

import type { BlindLabel, ModelConfig } from '@/lib/models';
import {
  normalizeTriagePartial,
  triageClientSchema,
  triageRequestSchema,
  type TriageResult,
} from '@/lib/schema';

type TriageRequest = z.infer<typeof triageRequestSchema>;

/** State a card reports up to the page so consensus/agreement can be computed. */
export interface ModelCardSlotState {
  blindLabel: BlindLabel;
  model: ModelConfig;
  object: DeepPartial<TriageResult> | undefined;
  isLoading: boolean;
  error: Error | undefined;
  latencyMs: number | undefined;
  finished: boolean;
}

export interface UseTriageStreamParams {
  blindLabel: BlindLabel;
  model: ModelConfig;
  caseText: string;
  runId: number;
  startDelayMs?: number;
  onStateChange: (state: ModelCardSlotState) => void;
}

export interface TriageStreamResult {
  /** The partial (while streaming) or fully validated (when finished) result. */
  displayObject: DeepPartial<TriageResult> | undefined;
  /** User-facing error message, already mapped from the raw error. */
  displayError: string | undefined;
  /** The raw error (request or schema validation), for styling/branching. */
  rawError: Error | undefined;
  isLoading: boolean;
  finished: boolean;
  latencyMs: number | undefined;
  /** Re-run this single arm (used by the Retry button). */
  runSubmit: () => void;
}

export function formatDisplayError(error: Error | undefined): string | undefined {
  if (!error) {
    return undefined;
  }

  const message = error.message || 'Triage request failed.';
  const lower = message.toLowerCase();

  // An entirely-empty stream (no object produced at all) is a gateway/provider
  // failure — a 503, a timeout, or the model being unreachable through the
  // gateway (e.g. no Zero-Data-Retention provider for the pinned provider). This
  // must be classified BEFORE the schema branch: the empty case also surfaces as
  // a "Type validation failed: Value: undefined" error, but it is NOT schema
  // drift and must not be credited as a measured schema mismatch.
  const isEmptyResponse =
    lower.includes('value: undefined') ||
    lower.includes('expected object, received undefined') ||
    lower.includes('empty');
  if (isEmptyResponse) {
    return 'No response from this model — it may be unavailable through the gateway (provider or zero-data-retention policy) or the request timed out. Use Retry when ready.';
  }

  // Genuine schema drift: an object streamed but failed strict validation.
  if (
    error.name.includes('TypeValidation') ||
    lower.includes('schema') ||
    lower.includes('validation')
  ) {
    return 'Model response did not match the study JSON schema; excluded from agreement.';
  }

  return 'Triage request failed. Use Retry when ready.';
}

/**
 * Encapsulates the per-model streaming lifecycle: staggered start, latency
 * timing, schema-valid finalization, error surfacing, and reporting state up
 * to the parent. Shared by the static ModelCard and the animated LiveModelCard
 * so the two never drift.
 */
export function useTriageStream({
  blindLabel,
  model,
  caseText,
  runId,
  startDelayMs = 0,
  onStateChange,
}: UseTriageStreamParams): TriageStreamResult {
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

      // A schema-validation failure (or an empty stream that yields no object)
      // is an EXPECTED, handled study outcome: it is surfaced on the card with a
      // Retry and excluded from agreement. Log it at warn level — console.error
      // trips Next.js's dev error overlay, which would falsely present a measured
      // outcome as an unhandled crash.
      if (schemaError && process.env.NODE_ENV === 'development') {
        console.warn(`[${model.slug}] schema validation failed:`, schemaError.message);
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
    // Each run bumps the parent `key` (…-${runId}), remounting the card with
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

  return {
    displayObject,
    displayError,
    rawError,
    isLoading,
    finished,
    latencyMs,
    runSubmit,
  };
}
