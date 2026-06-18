import { verifySession } from '@/lib/auth/dal';
import { STARTER_WALLET_MICRO_USD } from '@/lib/billing';
import { getSql } from '@/lib/db';
import { repairStaleUsageReservations } from '@/lib/usage/settle';

export const runtime = 'nodejs';

/**
 * Remaining spend budget for the signed-in user. Drives the "x¢ left" indicator
 * in the top bar. Returns 401 when unauthenticated.
 */
export async function GET() {
  const session = await verifySession();
  if (!session) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  await repairStaleUsageReservations();

  const rows = await getSql()`
    SELECT spent_micro_usd, reserved_micro_usd, cap_micro_usd
    FROM user_budget
    WHERE user_id = ${session.user.id}
  `;

  const row = rows[0];
  const capMicroUsd = row
    ? Number(row.cap_micro_usd)
    : STARTER_WALLET_MICRO_USD;
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
