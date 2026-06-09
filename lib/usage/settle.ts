import { gateway } from 'ai';

import { sql } from '@/lib/db';

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

/**
 * Resolve the authoritative USD cost for a completed generation from the AI
 * Gateway. The generation record is eventually consistent, so retry briefly
 * (1s, then 2s). Returns { settled: false } when the cost can't be read.
 */
async function fetchActualMicroUsd(
  generationId: string,
): Promise<{ microUsd: number; settled: boolean }> {
  for (let attempt = 0; attempt < 3; attempt++) {
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
      // fall through and retry
    }
    if (attempt < 2) {
      await sleep(1000 * (attempt + 1));
    }
  }
  return { microUsd: 0, settled: false };
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
        actualMicroUsd = result.microUsd;
        status = 'settled';
      } else {
        // A generation happened but its cost is unknown — charge the ceiling.
        actualMicroUsd = ceilingMicroUsd;
        status = 'failed';
      }
    }

    const inputTokens = usage?.inputTokens ?? null;
    const outputTokens = usage?.outputTokens ?? null;

    // Swap the reservation for the actual cost. GREATEST keeps reserved >= 0.
    await sql`
      UPDATE user_budget
      SET spent_micro_usd = spent_micro_usd + ${actualMicroUsd},
          reserved_micro_usd = GREATEST(0, reserved_micro_usd - ${ceilingMicroUsd}),
          updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    await sql`
      UPDATE usage_events
      SET generation_id = ${generationId ?? null},
          input_tokens = ${inputTokens},
          output_tokens = ${outputTokens},
          cost_micro_usd = ${actualMicroUsd},
          status = ${status}
      WHERE id = ${reservationId}
    `;
  } catch (error) {
    console.warn('[usage] settle failed:', error);
  }
}
