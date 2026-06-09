import { cache } from 'react';

import { auth } from '@/lib/auth/server';

/**
 * Authoritative server-side session check, memoized per request (React `cache`).
 * Call this inside route handlers and server components — the Next 16 doctrine is
 * to verify auth close to the data, not to rely on the proxy alone.
 * Returns the session (with `session.user.id`) or null.
 */
export const verifySession = cache(async () => {
  const { data: session } = await auth.getSession();
  return session ?? null;
});
