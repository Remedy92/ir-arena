import { sql } from '@/lib/db';
import { getCeiling } from '@/lib/usage/pricing';

export type ReserveResult =
  | { ok: true; reservationId: number; ceilingMicroUsd: number }
  | { ok: false; reason: 'budget_exceeded' };

/**
 * Atomically reserve this request's worst-case cost against the user's remaining
 * budget BEFORE the model is called. Returns `budget_exceeded` (→ HTTP 402) when
 * the reservation would push spent + reserved over the cap.
 *
 * Concurrency: the run page fires 2–12 parallel /api/triage requests per run.
 * The conditional UPDATE is a single atomic compare-and-set; Postgres row locking
 * serializes concurrent requests for the same user, so only the reservations that
 * still fit under the cap succeed — the rest get a clean 402. This also bounds a
 * brand-new user's very first run (their row starts at spent=0, reserved=0).
 *
 * The row is ensured in a separate statement (not a data-modifying CTE) because a
 * CTE's UPDATE wouldn't see the row its own INSERT just created (snapshot
 * isolation), which would skip the reservation for first-time users.
 */
export async function reserveBudget(
  userId: string,
  modelSlug: string,
): Promise<ReserveResult> {
  const ceilingMicroUsd = getCeiling(modelSlug);

  await sql`
    INSERT INTO user_budget (user_id)
    VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `;

  const reserved = await sql`
    UPDATE user_budget
    SET reserved_micro_usd = reserved_micro_usd + ${ceilingMicroUsd},
        updated_at = NOW()
    WHERE user_id = ${userId}
      AND spent_micro_usd + reserved_micro_usd + ${ceilingMicroUsd} <= cap_micro_usd
    RETURNING reserved_micro_usd
  `;

  if (reserved.length === 0) {
    return { ok: false, reason: 'budget_exceeded' };
  }

  const inserted = await sql`
    INSERT INTO usage_events (user_id, model_slug, cost_micro_usd, status)
    VALUES (${userId}, ${modelSlug}, ${ceilingMicroUsd}, 'reserved')
    RETURNING id
  `;

  return {
    ok: true,
    reservationId: Number(inserted[0].id),
    ceilingMicroUsd,
  };
}
