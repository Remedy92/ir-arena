import type { NextRequest } from 'next/server';

import { getAuth } from '@/lib/auth/server';

type RunGuard = (request: NextRequest) => Promise<Response>;

let protectRun: RunGuard | undefined;

function getProtectRun(): RunGuard {
  if (!protectRun) {
    protectRun = getAuth().middleware({ loginUrl: '/sign-in' });
  }
  return protectRun;
}

/**
 * Next.js 16 proxy (the renamed `middleware` convention). Optimistic gate for the
 * run flow: redirects unauthenticated visitors of /run to the sign-in page and
 * refreshes the session cookie. The authoritative checks live in the route
 * handlers (verifySession in /api/triage and /api/budget).
 *
 * Setup ('/') stays public, so the matcher is scoped to /run only — the APIs
 * return JSON 401s rather than HTML redirects, and the advisory /api/models
 * endpoint stays reachable for the public model picker.
 */
export default function proxy(request: NextRequest) {
  return getProtectRun()(request);
}

export const config = {
  matcher: ['/run', '/run/:path*'],
};