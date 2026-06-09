import Stripe from 'stripe';

let client: Stripe | null = null;

/**
 * Lazily-constructed server-only Stripe client (we are the merchant of record).
 * Lazy because the Stripe constructor validates the key eagerly and would throw
 * during `next build` (when env vars aren't present) if built at module load.
 * Pinned to the API version the installed SDK ships with. Never import into
 * client code.
 */
export function getStripe(): Stripe {
  if (!client) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    client = new Stripe(apiKey, { apiVersion: '2026-05-27.dahlia' });
  }
  return client;
}
