import { z } from 'zod';

import { verifyFreshSession } from '@/lib/auth/dal';
import {
  BILLING_APP_ID,
  BILLING_CURRENCY,
  BILLING_TAX_CODE,
  BILLING_TOPUP_PURPOSE,
  MAX_TOPUP_USD,
  MIN_TOPUP_USD,
  usdToCents,
  usdToMicroUsd,
} from '@/lib/billing';
import { getAppOrigin, getStripe } from '@/lib/stripe';

// Node runtime: the Stripe SDK uses Node crypto, and this mirrors the rest of the
// API surface (triage/budget) which also pin nodejs.
export const runtime = 'nodejs';

const checkoutRequestSchema = z.object({
  // Whole-dollar top-ups only — avoids fractional-cent rounding edge cases.
  amountUsd: z.number().int().min(MIN_TOPUP_USD).max(MAX_TOPUP_USD),
});

/**
 * Create a Stripe-hosted Checkout Session for a wallet top-up and return its URL
 * for the client to redirect to. Requires a signed-in user; the amount-to-credit
 * is stamped into the session metadata so the webhook can attribute and credit it
 * without trusting anything from the client at settlement time.
 */
export async function POST(req: Request) {
  try {
    const session = await verifyFreshSession();
    if (!session) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await req.json();
    const { amountUsd } = checkoutRequestSchema.parse(body);

    const creditedMicroUsd = String(usdToMicroUsd(amountUsd));
    const metadata = {
      app: BILLING_APP_ID,
      purpose: BILLING_TOPUP_PURPOSE,
      userId,
      creditedMicroUsd,
      currency: BILLING_CURRENCY,
    };

    const origin = getAppOrigin(req.url);

    const checkout = await getStripe().checkout.sessions.create({
      mode: 'payment',
      client_reference_id: userId,
      metadata,
      // Mirror onto the PaymentIntent so async-payment webhooks carry it too.
      payment_intent_data: { metadata },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: BILLING_CURRENCY,
            tax_behavior: 'exclusive',
            unit_amount: usdToCents(amountUsd),
            product_data: {
              name: 'IR Arena wallet credit',
              description: `$${amountUsd} of model-usage credit`,
              tax_code: BILLING_TAX_CODE,
            },
          },
        },
      ],
      automatic_tax: { enabled: true },
      billing_address_collection: 'auto',
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description: 'IR Arena wallet top-up',
          metadata,
        },
      },
      success_url: `${origin}/run?topup=success`,
      cancel_url: `${origin}/run?topup=cancelled`,
    });

    if (!checkout.url) {
      return Response.json({ error: 'checkout_failed' }, { status: 500 });
    }
    return Response.json({ url: checkout.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'invalid_amount' }, { status: 400 });
    }
    console.error('[wallet/checkout] failed:', error);
    return Response.json({ error: 'checkout_failed' }, { status: 500 });
  }
}
