# IR Arena — Security & Payment Review

**Date:** 2026-06-21
**Scope:** Full security audit + end-to-end payment review
**Stack:** Next.js 16.2.9, React 19, Neon Auth (Better Auth), Stripe SDK 22.2.0, Neon Postgres, AI SDK v7

---

## Executive Summary

The codebase is **well-architected** with strong security fundamentals: server-side auth on every mutating endpoint, parameterized SQL throughout, raw-body webhook verification, idempotent wallet credits, atomic budget reservations, and no secrets committed to git. The payment flow (prepaid wallet via Stripe Checkout) is correctly implemented end-to-end with proper signature verification, amount recomputation, and idempotency.

**No critical or exploitable payment vulnerabilities were found.** The wallet cannot be bypassed, double-credited, or credited without a verified Stripe payment.

There are **2 High**, **3 Medium**, and **3 Low** findings — all hardening recommendations rather than exploitable vulnerabilities. The most important are: adding explicit CSRF defense-in-depth on POST routes, setting security headers, and adding rate limiting on expensive endpoints.

---

## Payment Review: End-to-End Verdict

### Flow Summary

```
User → POST /api/wallet/checkout (auth, Zod $5–$200)
     → Stripe Checkout Session created (metadata: userId, creditedMicroUsd, app, purpose)
     → User pays on Stripe-hosted page
     → Stripe → POST /api/stripe/webhook (HMAC signature verified)
     → creditWallet() (idempotent via UNIQUE(stripe_session_id), atomic CTE)
     → user_budget.cap_micro_usd raised

User → POST /api/triage (auth, Zod, model whitelist)
     → reserveBudget() (atomic CAS: spent + reserved + ceiling ≤ cap)
     → streamText via AI Gateway
     → after() → settleUsage() (idempotent via status='reserved' guard)
     → actual cost debited, reservation released
```

### Payment Security Checklist

| Control | Status | Evidence |
|---------|--------|----------|
| Webhook signature verification | **PASS** | `app/api/stripe/webhook/route.ts:40` — `constructEvent(rawBody, signature, webhookSecret)` |
| Raw body for signature | **PASS** | `route.ts:34` — `await req.text()` before parsing |
| Empty secret guard | **PASS** | `route.ts:24-30` — fails closed with 500 before `constructEvent` |
| Metadata app guard | **PASS** | `route.ts:57-66` — rejects if `app !== 'ir-arena'` or `purpose !== 'wallet_topup'` |
| Amount recomputation | **PASS** | `route.ts:76` — `amount_subtotal * MICRO_USD_PER_CENT !== creditedMicroUsd` → reject |
| Currency validation | **PASS** | `route.ts:74` — `currency !== 'usd'` → reject |
| Idempotent credit | **PASS** | `lib/usage/topup.ts:39` — `ON CONFLICT(stripe_session_id) DO NOTHING` |
| Atomic credit + ledger | **PASS** | `topup.ts:31-50` — single CTE (INSERT payment + UPDATE budget) |
| Amount bounds server-side | **PASS** | `app/api/wallet/checkout/route.ts:20` — `z.number().int().min(5).max(200)` |
| Auth on checkout creation | **PASS** | `checkout/route.ts:32` — `verifyFreshSession()` |
| Auth on spend | **PASS** | `app/api/triage/route.ts:46` — `verifyFreshSession()` |
| Budget reservation atomicity | **PASS** | `lib/usage/guard.ts:29-42` — `sql.transaction()` with conditional CAS |
| Settlement idempotency | **PASS** | `lib/usage/settle.ts:78-101` — `WHERE status = 'reserved'` guard |
| Markup consistency | **PASS** | `pricing.ts:74` + `settle.ts:121` — `applyMarkup()` applied last in both paths |
| No client-trusted amounts | **PASS** | Webhook recomputes from `amount_subtotal`, not metadata |
| App-specific Stripe env vars | **PASS** | `lib/stripe.ts` — ignores shared `STRIPE_*`, uses `IR_ARENA_STRIPE_*` |
| No secrets in git history | **PASS** | Verified: only `.env.example` with empty values ever committed |
| Stripe SDK version current | **PASS** | `stripe@22.2.0`, API version `2026-05-27.dahlia` |

### Abuse Vectors Analyzed (all blocked)

1. **Wallet bypass via race condition** — `reserveBudget` uses atomic CAS in a transaction; concurrent requests serialize on row lock. Cannot exceed cap.
2. **Double-credit via webhook replay** — `UNIQUE(stripe_session_id)` makes duplicate deliveries a no-op.
3. **Forged webhook with inflated amount** — HMAC signature required; `creditedMicroUsd` recomputed from `amount_subtotal`, not trusted from metadata.
4. **Checkout for another user** — `userId` stamped from verified session, not client input.
5. **Negative/fractional top-up** — Zod rejects: `z.number().int().min(5).max(200)`.
6. **Spending another user's budget** — All SQL scoped by `WHERE user_id = ${session.user.id}`; parameterized queries.
7. **Model slug injection** — `isKnownModelSlug` whitelist on both triage and votes routes.
8. **Settlement double-charge** — `finalizeReservation` CTE guarded by `status = 'reserved'`; repeated calls are no-ops.

---

## Security Findings

### SEC-001: No explicit CSRF protection on POST route handlers

**Severity:** High
**Rule:** NEXT-CSRF-001
**Location:** `app/api/votes/route.ts:42`, `app/api/wallet/checkout/route.ts:31`, `app/api/triage/route.ts:48`

**Evidence:** All three POST endpoints use cookie-based auth (Neon Auth sessions) with no CSRF token or explicit Origin/Referer validation:
```typescript
// app/api/votes/route.ts:42
export async function POST(req: Request) {
  const session = await verifyFreshSession();
  // ... no Origin/Referer check, no CSRF token
  const body: unknown = await req.json();
```

**Impact:** An attacker on a malicious site could attempt to make the victim's browser send state-changing requests (vote submission, wallet top-up creation, triage calls) that carry the victim's session cookies.

**Mitigating factors (why this is High, not Critical):**
- Neon Auth (Better Auth) defaults to `SameSite=Lax` cookies, which blocks cookies on cross-site POST subrequests (fetch/XHR). This is significant mitigation.
- `req.json()` rejects form-encoded bodies (a plain `<form>` CSRF would fail to parse as JSON).
- The triage route additionally checks `content-type` includes `application/json` (`route.ts:55`), which blocks form-based CSRF entirely.
- However, votes and checkout routes do **not** check content-type.

**Fix:** Add explicit Origin/Referer validation as defense-in-depth. Create a shared helper and call it at the top of every POST handler:
```typescript
// lib/auth/csrf.ts
export function checkOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
```
Then in each POST handler:
```typescript
if (!checkOrigin(req)) {
  return Response.json({ error: 'invalid_origin' }, { status: 403 });
}
```

**Note:** This is defense-in-depth. SameSite=Lax + JSON body parsing already block the most common CSRF vectors, but explicit Origin validation is the recommended practice per OWASP and the Next.js security spec.

---

### SEC-002: No security headers configured

**Severity:** High
**Rule:** NEXT-HEADERS-001, NEXT-CSP-001
**Location:** `next.config.ts` (only `reactCompiler: true`), `proxy.ts` (no header setting)

**Evidence:** `next.config.ts` has no `headers()` function. `proxy.ts` only does auth redirect logic, no header manipulation. No CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` is set anywhere in the app code.

**Impact:**
- No clickjacking protection (`frame-ancestors` / `X-Frame-Options` missing)
- No MIME-type sniffing protection (`X-Content-Type-Options: nosniff` missing)
- No XSS defense-in-depth (CSP missing)
- No referrer control (could leak URLs to external sites)

**Fix:** Add a `headers()` function to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
          },
        ],
      },
    ];
  },
};
```

**Note:** `'unsafe-inline'` for `script-src` may be needed for Next.js inline scripts. For a stricter CSP, use nonce-based script-src (see Next.js CSP docs). At minimum, `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff` should be set immediately. If deploying on Vercel, verify headers are also set in `vercel.json` or project settings.

---

### SEC-003: No rate limiting on expensive endpoints

**Severity:** Medium
**Rule:** NEXT-DOS-001
**Location:** `app/api/triage/route.ts` (180s max duration, AI gateway call), `app/api/wallet/checkout/route.ts` (creates Stripe sessions)

**Evidence:** No rate limiting in `proxy.ts` or any route handler. The only spend control is the budget cap on triage.

**Impact:**
- An authenticated user with wallet balance could fan out many parallel triage calls (the UI fires 2–12 per run, but the API has no per-user rate limit).
- An authenticated user could spam `/api/wallet/checkout` to create thousands of Stripe Checkout Sessions (no cost to user, but clutters Stripe dashboard and hits Stripe API rate limits).
- `/api/models` and `/api/leaderboard` are public and unthrottled (lower risk — they're cheap, but the models endpoint calls the AI Gateway).

**Fix:** Implement edge-level rate limiting (Vercel Edge Config + middleware, or Upstash Ratelimit). At minimum, add per-user throttling on checkout creation (e.g., 5 sessions/minute) and per-IP throttling on public endpoints. The triage endpoint is already bounded by the wallet cap, but a per-user concurrency limit (e.g., max 4 concurrent triage calls) would prevent abuse.

---

### SEC-004: No Row Level Security on database tables

**Severity:** Medium
**Location:** `db/schema.sql` — `user_budget`, `payments`, `usage_events`, `run_votes`, `run_arms`

**Evidence:** No `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` statements in the schema. All access control is in application code.

**Impact:** If `DATABASE_URL` leaks (server compromise, logs, env dump), an attacker with the connection string could read/modify all users' wallet balances, payment records, and study data. RLS would limit the blast radius.

**Fix:** Enable RLS and add policies so the application role can only access its own rows. This requires passing the authenticated user ID into the DB session (e.g., via Neon's `setRole` or a custom claim). At minimum, ensure `DATABASE_URL` is never logged and is restricted to the application's IP range in Neon's network settings.

---

### SEC-005: No explicit body size limit on webhook

**Severity:** Medium
**Rule:** NEXT-LIMITS-001
**Location:** `app/api/stripe/webhook/route.ts:34` — `await req.text()`

**Evidence:** The webhook reads the entire body into memory with no size check. Stripe webhook payloads are typically <100KB, but there's no explicit limit.

**Impact:** A very large payload (if someone bypasses Stripe's signature check with a valid signature on a crafted event) could consume memory. Low risk since the signature check happens immediately after, but defense-in-depth is warranted.

**Fix:** Check `Content-Length` before reading, or read with a size cap:
```typescript
const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
if (contentLength > 256 * 1024) {
  return Response.json({ error: 'payload too large' }, { status: 413 });
}
```

---

### SEC-006: Unvalidated redirect URL in add-funds client

**Severity:** Low
**Rule:** REACT-REDIRECT-001
**Location:** `components/add-funds.tsx:29` — `window.location.assign(data.url)`

**Evidence:**
```typescript
const data = response.ok ? await response.json() : null;
if (data?.url) {
  window.location.assign(data.url);
```

**Impact:** The URL comes from the server's Stripe Checkout response (trusted). However, if a bug or future change returned an unexpected URL, the user would be redirected without validation. Low risk since the server constructs the URL via the Stripe SDK.

**Fix:** Validate the URL is a Stripe checkout URL before redirecting:
```typescript
if (data?.url && new URL(data.url).hostname.endsWith('.stripe.com')) {
  window.location.assign(data.url);
}
```

---

### SEC-007: Unhandled `async_payment_failed` webhook event

**Severity:** Low
**Location:** `app/api/stripe/webhook/route.ts` — handles `completed` and `async_payment_succeeded` only

**Evidence:** No handler for `checkout.session.async_payment_failed`. If a delayed payment (e.g., bank transfer) fails, the event is silently ignored (no credit issued, which is correct, but no logging either).

**Impact:** A user who attempts a delayed-payment top-up that fails will see no balance increase but has no indication why. This is a customer experience issue, not a security vulnerability — the correct behavior (no credit) is achieved by not handling the event.

**Fix:** Add a handler for observability:
```typescript
} else if (event.type === 'checkout.session.async_payment_failed') {
  const session = event.data.object as Stripe.Checkout.Session;
  console.warn('[stripe/webhook] async payment failed:', {
    sessionId: session.id,
    userId: session.metadata?.userId ?? session.client_reference_id,
  });
}
```

---

### SEC-008: No Stripe event ID idempotency log

**Severity:** Low
**Location:** `app/api/stripe/webhook/route.ts`

**Evidence:** The webhook relies entirely on the `UNIQUE(stripe_session_id)` constraint for idempotency. It does not record `event.id` anywhere, so there's no audit trail of which Stripe events have been received.

**Impact:** If the same Stripe event is delivered multiple times, the `ON CONFLICT DO NOTHING` handles it correctly, but there's no way to audit event delivery history. This is an observability gap, not a security vulnerability.

**Fix (optional):** Consider adding an `event_id` column to the `payments` table or a separate `webhook_events` log table for observability. Not required for correctness.

---

## Additional Verified Controls (no findings)

| Area | Status | Notes |
|------|--------|-------|
| **SQL injection** | **PASS** | All queries use Neon tagged-template parameterization. `jsonb_array_elements` in votes route operates on server-stringified JSON of Zod-validated input. |
| **XSS** | **PASS** | No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, or `document.write` anywhere. React default escaping is relied upon. |
| **Open redirect (sign-in)** | **PASS** | `app/(auth)/sign-in/page.tsx:11-25` — `callbackURL` validated against `['/', '/run']` with additional `sessionStorage` pending-run check. |
| **Secrets exposure** | **PASS** | No `NEXT_PUBLIC_*` env vars used. Server-only modules (`lib/stripe.ts`, `lib/db.ts`, `lib/auth/server.ts`) are lazy-initialized and never imported by client components. |
| **Server/client boundary** | **PASS** | No `"use client"` component imports server-only modules. `lib/billing.ts` guards `process` access for client-safe formatter exports. |
| **Input validation** | **PASS** | Every route handler uses Zod schemas with strict types, length bounds, and range constraints. |
| **Auth coverage** | **PASS** | Every mutating route handler calls `verifyFreshSession()` (bypasses cookie cache). Public GET routes (`/api/models`, `/api/leaderboard`) are intentionally public and return no user-specific data. |
| **Proxy/middleware matcher** | **PASS** | `proxy.ts` matcher is `['/run', '/run/:path*']` — correctly scoped. API routes are outside the proxy by design (they return JSON 401s, not HTML redirects). |
| **Session cookie config** | **PASS** | Neon Auth (Better Auth) defaults to `SameSite=Lax`, `HttpOnly`, `Secure` (in production). App does not override these. `verifyFreshSession` bypasses cookie cache for money routes. |
| **Cache/data leak** | **PASS** | `/api/leaderboard` uses `revalidate = 300` but returns only public aggregates (no user IDs, no case text). `/api/budget` is dynamic (uses `cookies()` via session check). No `force-static` on sensitive routes. |
| **Leaderboard data leak** | **PASS** | `lib/leaderboard-data.ts` — queries select only aggregates (`COUNT`, `AVG`, `GROUP BY`). `user_id` is used in `COUNT(DISTINCT user_id)` but never returned. `case_text` is never selected. |
| **Dependency versions** | **PASS** | Next.js 16.2.9 (above 16.0.7 patched for CVE-2025-66478). Stripe SDK 22.2.0 (current). |
| **Error handling** | **PASS** | All route handlers catch errors and return generic messages. `console.error` logs are server-side only. No stack traces exposed to clients. |
| **Git hygiene** | **PASS** | `.env*` gitignored (except `.env.example`). No secrets found in git history. `.devtools/` (may contain prompts/responses) is gitignored. |
| **File handling** | **PASS** | No `fs` operations in app code (only in dev-only `scripts/`). No file uploads. No path traversal surface. |
| **SSRF** | **PASS** | No outbound `fetch()` to user-controlled URLs. The only outbound calls are to Stripe (fixed SDK base URL) and the AI Gateway (SDK-managed). |
| **Command injection** | **PASS** | No `child_process`, `exec`, or `spawn` in app code. |
| **Webhook auth model** | **PASS** | Webhook is intentionally unauthenticated (outside proxy matcher) — the Stripe HMAC signature IS the authentication. Correct design. |

---

## Summary by Severity

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 2 | SEC-001 (CSRF), SEC-002 (headers) |
| Medium | 3 | SEC-003 (rate limiting), SEC-004 (RLS), SEC-005 (body size) |
| Low | 3 | SEC-006 (redirect URL), SEC-007 (async_payment_failed), SEC-008 (event ID log) |

---

## Recommended Fix Priority

1. **SEC-002 (security headers)** — Quickest win, highest defense-in-depth value. Add `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and CSP to `next.config.ts`.
2. **SEC-001 (CSRF Origin check)** — Add a shared `checkOrigin()` helper to the three POST routes. Small diff, closes the defense-in-depth gap.
3. **SEC-003 (rate limiting)** — Implement at the edge (Vercel/Upstash). Most relevant for checkout spam and triage abuse.
4. **SEC-004 (RLS)** — Requires Neon Auth integration to pass user identity into DB session. Larger effort, do after the above.
5. **SEC-005, SEC-006, SEC-007, SEC-008** — Quick defensive additions, can be batched.

---

*Report written to `security_review.md`. The payment integration is sound — no payment-related fixes are needed. All findings are general web security hardening.*
