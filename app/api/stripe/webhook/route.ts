import type Stripe from 'stripe';

import { BILLING_CURRENCY, MICRO_USD_PER_CENT } from '@/lib/billing';
import { getStripe } from '@/lib/stripe';
import { creditWallet } from '@/lib/usage/topup';

// Node runtime: signature verification uses Node crypto, and creditWallet hits
// the Neon driver. This route is intentionally UNauthenticated — the Stripe
// signature is the authentication — and is outside the proxy matcher (/run only).
export const runtime = 'nodejs';

/**
 * Stripe webhook. Verifies the signature against STRIPE_WEBHOOK_SECRET, then on a
 * paid Checkout Session credits the user's wallet (idempotently). Returns 400 for
 * a bad signature and 500 on a handler error so Stripe retries — creditWallet is
 * idempotent, so retries never double-credit.
 */
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'missing signature' }, { status: 400 });
  }

  // Validate the secret explicitly. A missing OR empty secret must never reach
  // constructEvent: an empty HMAC key is forgeable by anyone, so it would turn
  // signature verification into a no-op rather than failing closed.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return Response.json({ error: 'webhook not configured' }, { status: 500 });
  }

  // Raw body is required for signature verification — App Router does not parse
  // the request body, so req.text() yields the exact bytes Stripe signed.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('[stripe/webhook] signature verification failed:', error);
    return Response.json({ error: 'invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      // Card payments complete synchronously (payment_status 'paid'); delayed
      // methods stay 'unpaid' here and are credited via the async event below.
      if (session.payment_status === 'paid') {
        await creditFromSession(session);
      }
    } else if (event.type === 'checkout.session.async_payment_succeeded') {
      await creditFromSession(event.data.object as Stripe.Checkout.Session);
    }
  } catch (error) {
    console.error('[stripe/webhook] handling failed:', error);
    return Response.json({ error: 'handler error' }, { status: 500 });
  }

  return Response.json({ received: true });
}

async function creditFromSession(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId ?? session.client_reference_id ?? null;
  const creditedMicroUsd = Number(session.metadata?.creditedMicroUsd);

  if (!userId || !Number.isFinite(creditedMicroUsd) || creditedMicroUsd <= 0) {
    console.error(
      '[stripe/webhook] session missing credit metadata:',
      session.id,
    );
    return;
  }

  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // amount_total is always set for a paid Checkout Session built from line_items,
  // but the type permits null. Rather than silently record $0 in the audit
  // ledger, derive the charge from the (USD) credit so the row stays accurate.
  let amountPaidCents = session.amount_total;
  if (amountPaidCents == null) {
    amountPaidCents = Math.round(creditedMicroUsd / MICRO_USD_PER_CENT);
    console.warn(
      `[stripe/webhook] session ${session.id} had no amount_total; recording ` +
        `${amountPaidCents}c derived from the credited amount`,
    );
  }

  await creditWallet({
    userId,
    stripeSessionId: session.id,
    stripePaymentIntent: paymentIntent,
    amountPaidCents,
    currency: session.currency ?? BILLING_CURRENCY,
    creditedMicroUsd,
  });
}
