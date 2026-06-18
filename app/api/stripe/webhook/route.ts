import type Stripe from 'stripe';

import {
  BILLING_APP_ID,
  BILLING_CURRENCY,
  BILLING_TOPUP_PURPOSE,
  MICRO_USD_PER_CENT,
} from '@/lib/billing';
import { getStripe, getStripeWebhookSecret } from '@/lib/stripe';
import { creditWallet } from '@/lib/usage/topup';

// Node runtime: signature verification uses Node crypto, and creditWallet hits
// the Neon driver. This route is intentionally UNauthenticated — the Stripe
// signature is the authentication — and is outside the proxy matcher (/run only).
export const runtime = 'nodejs';

/**
 * Stripe webhook. Verifies the signature against this app's webhook secret, then
 * on a paid Checkout Session credits the user's wallet (idempotently). Returns
 * 400 for a bad signature and 500 on a handler error so Stripe retries —
 * creditWallet is idempotent, so retries never double-credit.
 */
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'missing signature' }, { status: 400 });
  }

  // Validate the secret explicitly. A missing OR empty secret must never reach
  // constructEvent: an empty HMAC key is forgeable by anyone, so it would turn
  // signature verification into a no-op rather than failing closed.
  let webhookSecret: string;
  try {
    webhookSecret = getStripeWebhookSecret();
  } catch (error) {
    console.error('[stripe/webhook] webhook secret is not configured:', error);
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
  if (
    session.metadata?.app !== BILLING_APP_ID ||
    session.metadata?.purpose !== BILLING_TOPUP_PURPOSE
  ) {
    console.warn('[stripe/webhook] ignoring non-IR-Arena checkout session:', {
      sessionId: session.id,
      app: session.metadata?.app ?? null,
      purpose: session.metadata?.purpose ?? null,
    });
    return;
  }

  const userId = session.metadata?.userId ?? session.client_reference_id ?? null;
  const creditedMicroUsd = Number(session.metadata?.creditedMicroUsd);
  const currency = session.currency?.toLowerCase() ?? null;
  const amountSubtotalCents = session.amount_subtotal;

  if (
    !userId ||
    currency !== BILLING_CURRENCY ||
    !Number.isFinite(creditedMicroUsd) ||
    creditedMicroUsd <= 0 ||
    amountSubtotalCents == null ||
    amountSubtotalCents * MICRO_USD_PER_CENT !== creditedMicroUsd
  ) {
    console.error(
      '[stripe/webhook] session failed credit validation:',
      {
        sessionId: session.id,
        userId: userId ?? null,
        currency,
        amountSubtotalCents,
        creditedMicroUsd: Number.isFinite(creditedMicroUsd)
          ? creditedMicroUsd
          : null,
      },
    );
    return;
  }

  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // amount_total includes tax; amount_subtotal above is what becomes wallet credit.
  const amountPaidCents = session.amount_total;
  if (amountPaidCents == null) {
    console.warn(
      `[stripe/webhook] session ${session.id} had no amount_total; not crediting`,
    );
    return;
  }

  await creditWallet({
    userId,
    stripeSessionId: session.id,
    stripePaymentIntent: paymentIntent,
    amountPaidCents,
    currency,
    creditedMicroUsd,
  });
}
