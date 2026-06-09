import { getSql } from '@/lib/db';

export interface CreditWalletParams {
  userId: string;
  /** Checkout Session id — the idempotency key (UNIQUE in payments). */
  stripeSessionId: string;
  stripePaymentIntent: string | null;
  amountPaidCents: number;
  currency: string;
  /** Customer micro-USD to add to the wallet (user_budget.cap_micro_usd). */
  creditedMicroUsd: number;
}

/**
 * Idempotently record a completed Stripe top-up and raise the user's wallet
 * balance. Safe to call repeatedly for the same Checkout Session: the UNIQUE
 * `stripe_session_id` turns a duplicate webhook delivery into a no-op, so the
 * balance is credited at most once.
 *
 * The payment insert and the cap credit run as ONE atomic statement (a CTE) so
 * there is no window where money is recorded but the balance is not. The budget
 * row is ensured first in a separate statement because a CTE's UPDATE cannot see
 * a row its own INSERT just created (snapshot isolation) — same reason as the
 * reserve path in lib/usage/guard.ts.
 *
 * Returns true when this call performed the credit (first delivery), false for a
 * duplicate / no-op.
 */
export async function creditWallet({
  userId,
  stripeSessionId,
  stripePaymentIntent,
  amountPaidCents,
  currency,
  creditedMicroUsd,
}: CreditWalletParams): Promise<boolean> {
  await getSql()`
    INSERT INTO user_budget (user_id)
    VALUES (${userId})
    ON CONFLICT (user_id) DO NOTHING
  `;

  const credited = await getSql()`
    WITH paid AS (
      INSERT INTO payments (
        user_id, stripe_session_id, stripe_payment_intent,
        amount_paid_cents, currency, credited_micro_usd, status
      )
      VALUES (
        ${userId}, ${stripeSessionId}, ${stripePaymentIntent},
        ${amountPaidCents}, ${currency}, ${creditedMicroUsd}, 'completed'
      )
      ON CONFLICT (stripe_session_id) DO NOTHING
      RETURNING credited_micro_usd, user_id
    )
    UPDATE user_budget ub
    SET cap_micro_usd = cap_micro_usd + paid.credited_micro_usd,
        updated_at = NOW()
    FROM paid
    WHERE ub.user_id = paid.user_id
    RETURNING ub.cap_micro_usd
  `;

  return credited.length > 0;
}
