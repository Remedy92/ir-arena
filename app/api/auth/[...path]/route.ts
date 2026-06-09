import { auth } from '@/lib/auth/server';

// Better Auth needs Node.js APIs (matches the other gateway-backed routes).
export const runtime = 'nodejs';

// Catch-all handler for all Neon Auth HTTP traffic (sign-in, OAuth callbacks,
// session, sign-out). The browser client (lib/auth/client.ts) targets this route.
export const { GET, POST } = auth.handler();
