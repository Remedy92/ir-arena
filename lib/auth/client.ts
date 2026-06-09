'use client';

import { createAuthClient } from '@neondatabase/auth/next';

/**
 * Browser-side Neon Auth client. Talks to the app's own /api/auth/[...path]
 * route (same origin), so no base URL or NEXT_PUBLIC_* env var is required.
 * Exposes signIn.social, signOut, useSession, etc.
 */
export const authClient = createAuthClient();
