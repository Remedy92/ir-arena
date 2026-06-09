import { verifySession } from '@/lib/auth/dal';
import { getSql } from '@/lib/db';

export const runtime = 'nodejs';

const DEFAULT_CAP_MICRO_USD = 50_000; // $0.05, matches the user_budget default

/**
 * Remaining spend budget for the signed-in user. Drives the "x¢ left" indicator
 * in the top bar. Returns 401 when unauthenticated.
 */
export async function GET() {
  const session = await verifySession();
  if (!session) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const rows = await getSql()`
    SELECT spent_micro_usd, reserved_micro_usd, cap_micro_usd
    FROM user_budget
    WHERE user_id = ${session.user.id}
  `;

  const row = rows[0];
  const capMicroUsd = row ? Number(row.cap_micro_usd) : DEFAULT_CAP_MICRO_USD;
  const spentMicroUsd = row ? Number(row.spent_micro_usd) : 0;
  const reservedMicroUsd = row ? Number(row.reserved_micro_usd) : 0;
  const remainingMicroUsd = Math.max(
    0,
    capMicroUsd - spentMicroUsd - reservedMicroUsd,
  );

  return Response.json({
    capMicroUsd,
    spentMicroUsd,
    reservedMicroUsd,
    remainingMicroUsd,
  });
}
