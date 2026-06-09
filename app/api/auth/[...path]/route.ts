import { getAuth } from '@/lib/auth/server';

// Better Auth needs Node.js APIs (matches the other gateway-backed routes).
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ path: string[] }> };

function handlers() {
  return getAuth().handler();
}

// Catch-all handler for all Neon Auth HTTP traffic (sign-in, OAuth callbacks,
// session, sign-out). The browser client (lib/auth/client.ts) targets this route.
export async function GET(request: Request, context: RouteContext) {
  return handlers().GET(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handlers().POST(request, context);
}