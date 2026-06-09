import { createNeonAuth } from '@neondatabase/auth/next/server';

type NeonAuth = ReturnType<typeof createNeonAuth>;

let authInstance: NeonAuth | undefined;

/**
 * Server-side Neon Auth (managed Better Auth) instance. Talks to the Neon Auth
 * service at NEON_AUTH_BASE_URL; sessions are signed cookies keyed by
 * NEON_AUTH_COOKIE_SECRET. Shared by the API handler (app/api/auth/[...path]),
 * the proxy (proxy.ts), and the verifySession DAL helper (lib/auth/dal.ts).
 *
 * Initialized lazily so `next build` does not require auth env vars at module
 * load time (Vercel injects them at runtime, not during static analysis).
 */
export function getAuth(): NeonAuth {
  if (!authInstance) {
    authInstance = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL!,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
      },
    });
  }
  return authInstance;
}