import type { BlindLabel } from './models';

/**
 * Client-side helpers for persisting a user's "winner" pick after a blinded run.
 * The vote is saved to `run_votes` via POST /api/votes (auth required). Types are
 * shared with the route's zod schema by convention — keep them in sync.
 */

/** Per-arm outcome snapshot stored alongside the pick so it stays interpretable.
 *  The wide fields (alternativePlan / rationale / redFlags) are also written
 *  normalized into the `run_arms` table; the JSONB snapshot is a denormalized
 *  convenience for the v1 leaderboard. Older votes (saved before the widen)
 *  will be missing these three keys — readers must treat them as optional. */
export interface VoteModelSnapshot {
  slug: string;
  label: string;
  blindLabel: BlindLabel;
  decision: string | null;
  urgency: string | null;
  targetVessel: string | null;
  embolicAgent: string | null;
  alternativePlan: string | null;
  rationale: string | null;
  redFlags: string[] | null;
  confidence: number | null;
  latencyMs: number | null;
  status: 'finished' | 'error' | 'pending';
}

export interface SaveVoteInput {
  /** Stable id for this run; re-saving the same run upserts the pick. */
  runUuid: string;
  /** Preset id the case started from, or 'custom'. */
  caseId: string;
  /** The synthetic case text sent to the models. */
  caseText: string;
  /** Shared reasoning effort for the run. */
  reasoning: string;
  /** Were model identities hidden when the user picked. */
  blindedAtVote: boolean;
  /** Gateway slug of the chosen model. */
  winnerSlug: string;
  /** Blind label (A, B, …) of the chosen card at vote time. */
  winnerLabel: BlindLabel;
  /** Snapshot of every arm in the run. */
  models: VoteModelSnapshot[];
}

export type SaveVoteResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

/** UI lifecycle for the save action. */
export type VoteSaveState = 'idle' | 'saving' | 'saved' | 'error';

export async function saveVote(input: SaveVoteInput): Promise<SaveVoteResult> {
  try {
    const response = await fetch('/api/votes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      let error = `HTTP ${response.status}`;
      try {
        const body: unknown = await response.json();
        if (
          typeof body === 'object' &&
          body !== null &&
          typeof (body as { error?: unknown }).error === 'string'
        ) {
          error = (body as { error: string }).error;
        }
      } catch {
        // Non-JSON error body — keep the status-code fallback.
      }
      return { ok: false, error };
    }

    const data: unknown = await response.json();
    const id =
      typeof data === 'object' &&
      data !== null &&
      typeof (data as { id?: unknown }).id === 'number'
        ? (data as { id: number }).id
        : 0;
    return { ok: true, id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'network error',
    };
  }
}

/** Generate a per-run id for the upsert key. */
export function newRunUuid(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts; collision risk is irrelevant per-user.
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
