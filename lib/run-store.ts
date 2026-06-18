import { CASE_FIELD_ORDER, emptyCaseFields, type CaseFields } from './cases';
import {
  coerceReasoningEffort,
  DEFAULT_REASONING_EFFORT,
  type ReasoningEffort,
} from './reasoning';

/**
 * Cross-route hand-off for a configured comparison. The setup page (`/`) writes
 * the selected models + structured case here, then navigates to the run page
 * (`/run`), which reads it on mount and starts streaming. sessionStorage (not
 * localStorage) is intentional: a pending run is per-tab and ephemeral —
 * it survives a refresh of `/run` (so the run re-streams) but does not leak
 * across tabs or persist after the tab closes.
 *
 * Cache Components is off in this app, so pages fully unmount on navigation;
 * this store is the bridge rather than shared React state.
 */

const STORAGE_KEY = 'ir-arena-pending-run';

export interface PendingRun {
  /** Structured case fields, mirrored back so the run page can render them. */
  caseFields: CaseFields;
  /** The preset the case started from (so `/` can restore the dropdown). */
  presetId: string;
  /** Snapshot of selected model ids, in selection order. */
  modelIds: string[];
  /** Shared provider-agnostic reasoning effort for every model in the run. */
  reasoning: ReasoningEffort;
}

function coerceCaseFields(input: unknown): CaseFields {
  const fields = emptyCaseFields();
  if (typeof input !== 'object' || input === null) {
    return fields;
  }
  const record = input as Record<string, unknown>;
  for (const key of CASE_FIELD_ORDER) {
    const value = record[key];
    if (typeof value === 'string') {
      fields[key] = value;
    }
  }
  return fields;
}

export function setPendingRun(run: PendingRun): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(run));
  } catch {
    // Quota / availability errors are non-fatal — navigation still proceeds,
    // the run page just falls back to its empty state.
  }
}

/**
 * Read and validate the pending run. Returns null when nothing is staged or the
 * payload is malformed/insufficient (fewer than two model ids), so the run page
 * can show its "nothing configured" empty state instead of a broken run.
 */
export function getPendingRun(): PendingRun | null {
  if (typeof window === 'undefined') {
    return null;
  }

  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const record = parsed as Record<string, unknown>;

    const modelIds = Array.isArray(record.modelIds)
      ? record.modelIds.filter((id): id is string => typeof id === 'string')
      : [];
    if (modelIds.length < 2) {
      return null;
    }

    return {
      caseFields: coerceCaseFields(record.caseFields),
      presetId: typeof record.presetId === 'string' ? record.presetId : '',
      modelIds,
      reasoning: coerceReasoningEffort(record.reasoning),
    };
  } catch {
    return null;
  }
}

export function defaultPendingRunReasoning(): ReasoningEffort {
  return DEFAULT_REASONING_EFFORT;
}

export function clearPendingRun(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}
