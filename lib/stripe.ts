import Stripe from 'stripe';

let client: Stripe | null = null;

function readEnv(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isProductionEnv(): boolean {
  const vercelEnv = readEnv('VERCEL_ENV');
  if (vercelEnv) return vercelEnv === 'production';
  return process.env.NODE_ENV === 'production';
}

function requireEnv(name: string, note?: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`${name} is not set${note ? `; ${note}` : ''}`);
  }
  return value;
}

/**
 * Lazily-constructed server-only Stripe client (we are the merchant of record).
 * Lazy because the Stripe constructor validates the key eagerly and would throw
 * during `next build` (when env vars aren't present) if built at module load.
 * The app intentionally ignores shared STRIPE_* vars so a different product's
 * account key cannot be picked up accidentally.
 */
export function getStripe(): Stripe {
  if (!client) {
    const apiKey = requireEnv(
      'IR_ARENA_STRIPE_SECRET_KEY',
      'shared STRIPE_SECRET_KEY is ignored by this app',
    );
    client = new Stripe(apiKey, { apiVersion: '2026-05-27.dahlia' });
  }
  return client;
}

export function getStripeWebhookSecret(): string {
  return requireEnv(
    'IR_ARENA_STRIPE_WEBHOOK_SECRET',
    'shared STRIPE_WEBHOOK_SECRET is ignored by this app',
  );
}

export function getAppOrigin(requestUrl: string): string {
  const appUrl = readEnv('IR_ARENA_APP_URL');
  if (appUrl) return new URL(appUrl).origin;
  if (isProductionEnv()) {
    throw new Error('IR_ARENA_APP_URL is not set');
  }
  return new URL(requestUrl).origin;
}
