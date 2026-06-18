import { gateway } from 'ai';

import { applyMarkup } from '@/lib/billing';
import { getSql } from '@/lib/db';

const MICRO_USD_PER_USD = 1_000_000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface SettleParams {
  reservationId: number;
  userId: string;
  ceilingMicroUsd: number;
  /** From providerMetadata.gateway.generationId; absent if the stream errored. */
  generationId: string | undefined;
  usage: { inputTokens?: number; outputTokens?: number } | undefined;
}

export interface MarkUsageGenerationParams {
  reservationId: number;
  userId: string;
  generationId: string;
}

/**
 * Resolve the authoritative USD cost for a completed generation from the AI
 * Gateway. The generation record is eventually consistent — empirically ~12s
 * before it is queryable (a 404 until then) — so poll for up to ~30s: an initial
 * wait, then every 3s. Returns { settled: false } if the cost never appears.
 */
async function fetchActualMicroUsd(
  generationId: string,
): Promise<{ microUsd: number; settled: boolean }> {
  const deadlineMs = Date.now() + 30_000;
  let waitMs = 4_000;
  while (Date.now() < deadlineMs) {
    await sleep(waitMs);
    waitMs = 3_000;
    try {
      const info = await gateway.getGenerationInfo({ id: generationId });
      const totalCost = info?.totalCost;
      if (typeof totalCost === 'number' && Number.isFinite(totalCost)) {
        return {
          microUsd: Math.round(totalCost * MICRO_USD_PER_USD),
          settled: true,
        };
      }
    } catch {
      // 404 = record not propagated yet; keep polling until the deadline.
    }
  }
  return { microUsd: 0, settled: false };
}

async function fetchActualMicroUsdOnce(
  generationId: string,
): Promise<{ microUsd: number; settled: boolean }> {
  try {
    const info = await gateway.getGenerationInfo({ id: generationId });
    const totalCost = info?.totalCost;
    if (typeof totalCost === 'number' && Number.isFinite(totalCost)) {
      return {
        microUsd: Math.round(totalCost * MICRO_USD_PER_USD),
        settled: true,
      };
    }
  } catch {
    // The generation may still be propagating; the next sweep can retry.
  }
  return { microUsd: 0, settled: false };
}

/**
 * Persist the Gateway generation id as soon as it appears in stream metadata.
 * The final stream promise can reject after the Gateway has already billed a
 * generation, so waiting until final metadata would lose the id needed to settle
 * accurately.
 */
export async function markUsageGeneration({
  reservationId,
  userId,
  generationId,
}: MarkUsageGenerationParams): Promise<void> {
  try {
    await getSql()`
      UPDATE usage_events
      SET generation_id = COALESCE(generation_id, ${generationId})
      WHERE id = ${reservationId}
        AND user_id = ${userId}
        AND status = 'reserved'
    `;
  } catch (error) {
    console.warn('[usage] generation id persist failed:', error);
  }
}

async function finalizeReservation({
  reservationId,
  userId,
  ceilingMicroUsd,
  generationId,
  actualMicroUsd,
  status,
  inputTokens,
  outputTokens,
}: {
  reservationId: number;
  userId: string;
  ceilingMicroUsd: number;
  generationId: string | undefined;
  actualMicroUsd: number;
  status: 'settled' | 'failed';
  inputTokens: number | null;
  outputTokens: number | null;
}): Promise<void> {
  // Swap the reservation for the actual cost exactly once. The usage event's
  // reserved status is the idempotency guard; repeated after()/sweeper attempts
  // become no-ops instead of double-charging or double-releasing.
  await getSql()`
    WITH event AS (
      SELECT id, user_id
      FROM usage_events
      WHERE id = ${reservationId}
        AND user_id = ${userId}
        AND status = 'reserved'
    ),
    budget AS (
      UPDATE user_budget ub
      SET spent_micro_usd = spent_micro_usd + ${actualMicroUsd},
          reserved_micro_usd = GREATEST(0, reserved_micro_usd - ${ceilingMicroUsd}),
          updated_at = NOW()
      FROM event
      WHERE ub.user_id = event.user_id
      RETURNING event.id
    )
    UPDATE usage_events ue
    SET generation_id = COALESCE(ue.generation_id, ${generationId ?? null}),
        input_tokens = COALESCE(${inputTokens}, ue.input_tokens),
        output_tokens = COALESCE(${outputTokens}, ue.output_tokens),
        cost_micro_usd = ${actualMicroUsd},
        status = ${status}
    FROM budget
    WHERE ue.id = budget.id
  `;
}

/**
 * Reconcile a reservation to the real cost AFTER the response has streamed.
 * Intended to run inside Next.js `after()`. Never throws — a thrown post-response
 * task is silently dropped by the runtime, so we log instead.
 *
 * Amount charged:
 *  - generationId + successful lookup → actual gateway cost      (status 'settled')
 *  - generationId but lookup fails    → fail-safe: charge ceiling (status 'failed')
 *  - no generationId (stream errored) → release reservation, charge 0 ('failed')
 */
export async function settleUsage({
  reservationId,
  userId,
  ceilingMicroUsd,
  generationId,
  usage,
}: SettleParams): Promise<void> {
  try {
    let actualMicroUsd = 0;
    let status: 'settled' | 'failed' = 'failed';

    if (generationId) {
      const result = await fetchActualMicroUsd(generationId);
      if (result.settled) {
        // Charge the customer the raw gateway cost times our markup. The ceiling
        // (fail-safe path below) is already marked up in getCeilingMicroUsd, so
        // both paths debit the wallet in the same customer micro-USD unit.
        actualMicroUsd = applyMarkup(result.microUsd);
        status = 'settled';
      } else {
        // A generation happened but its cost is unknown — charge the ceiling.
        actualMicroUsd = ceilingMicroUsd;
        status = 'failed';
      }
    }

    const inputTokens = usage?.inputTokens ?? null;
    const outputTokens = usage?.outputTokens ?? null;

    await finalizeReservation({
      reservationId,
      userId,
      ceilingMicroUsd,
      generationId,
      actualMicroUsd,
      status,
      inputTokens,
      outputTokens,
    });
  } catch (error) {
    console.warn('[usage] settle failed:', error);
  }
}

/**
 * Opportunistic repair for reservations whose post-response settlement was
 * killed by function lifetime, DB/network errors, or client aborts. Call from
 * request paths before making new reservations so the wallet cannot stay locked
 * forever in normal traffic.
 */
export async function repairStaleUsageReservations(limit = 10): Promise<void> {
  try {
    const stale = await getSql()`
      SELECT id, user_id, generation_id, cost_micro_usd, created_at
      FROM usage_events
      WHERE status = 'reserved'
        AND created_at < NOW() - INTERVAL '15 minutes'
      ORDER BY created_at ASC
      LIMIT ${limit}
    `;

    for (const row of stale) {
      const reservationId = Number(row.id);
      const userId = String(row.user_id);
      const ceilingMicroUsd = Number(row.cost_micro_usd ?? 0);
      const generationId =
        typeof row.generation_id === 'string' ? row.generation_id : undefined;

      if (!Number.isFinite(ceilingMicroUsd) || ceilingMicroUsd <= 0) {
        continue;
      }

      if (!generationId) {
        await finalizeReservation({
          reservationId,
          userId,
          ceilingMicroUsd,
          generationId: undefined,
          actualMicroUsd: 0,
          status: 'failed',
          inputTokens: null,
          outputTokens: null,
        });
        continue;
      }

      const lookup = await fetchActualMicroUsdOnce(generationId);
      if (lookup.settled) {
        await finalizeReservation({
          reservationId,
          userId,
          ceilingMicroUsd,
          generationId,
          actualMicroUsd: applyMarkup(lookup.microUsd),
          status: 'settled',
          inputTokens: null,
          outputTokens: null,
        });
      }
    }
  } catch (error) {
    console.warn('[usage] stale reservation repair failed:', error);
  }
}
