import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | undefined;

/**
 * Reusable SQL client for the spend-cap tables (user_budget, usage_events).
 * The Neon serverless driver issues queries over HTTP — a good fit for Vercel's
 * serverless/Fluid functions (no persistent TCP pool to manage). Tagged-template
 * interpolation is parameterized, so values are never concatenated into SQL.
 *
 * Auth tables live separately in the `neon_auth` schema, managed by Neon Auth.
 *
 * Initialized lazily so `next build` does not require DATABASE_URL at module
 * load time (Vercel injects it at runtime, not during static analysis).
 */
export function getSql(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }
    client = neon(url);
  }
  return client;
}