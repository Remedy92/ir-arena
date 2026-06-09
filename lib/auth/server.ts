import { createNeonAuth } from '@neondatabase/auth/next/server';

/**
 * Server-side Neon Auth (managed Better Auth) instance. Talks to the Neon Auth
 * service at NEON_AUTH_BASE_URL; sessions are signed cookies keyed by
 * NEON_AUTH_COOKIE_SECRET. Shared by the API handler (app/api/auth/[...path]),
 * the proxy (proxy.ts), and the verifySession DAL helper (lib/auth/dal.ts).
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
