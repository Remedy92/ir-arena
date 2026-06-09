import { neon } from '@neondatabase/serverless';

/**
 * Reusable SQL client for the spend-cap tables (user_budget, usage_events).
 * The Neon serverless driver issues queries over HTTP — a good fit for Vercel's
 * serverless/Fluid functions (no persistent TCP pool to manage). Tagged-template
 * interpolation is parameterized, so values are never concatenated into SQL.
 *
 * Auth tables live separately in the `neon_auth` schema, managed by Neon Auth.
 */
export const sql = neon(process.env.DATABASE_URL!);
