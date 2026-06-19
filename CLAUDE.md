# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> Per `AGENTS.md`: this is **Next.js 16** with breaking changes from older versions. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code — don't rely on training-data conventions. The stack is also bleeding-edge elsewhere (React 19, AI SDK v6, Tailwind v4, Zod v4); verify APIs against installed versions, not memory.

## Commands

Package manager is **pnpm**.

```bash
pnpm i                 # install
pnpm dev               # dev server at http://localhost:3000
pnpm build             # production build (use this to verify before shipping)
pnpm lint              # eslint (eslint-config-next)
pnpm typecheck         # TypeScript without emit
pnpm test              # Vitest unit/regression suite
pnpm audit:prod        # production dependency audit
pnpm devtools          # AI SDK DevTools viewer at http://localhost:4983 (dev only)
```

Vitest covers local invariants that should not require live secrets or spend. `scripts/test-models.mjs` is an ad-hoc probe that streams every model in `MODELS` through the real triage pipeline and reports latency + Zod pass/fail — run it (with a populated `.env.local`) to diagnose gateway/schema regressions, not as a unit test. `scripts/test-parallel.sh` / `test-staggered.sh` are curl-based load probes against authenticated `/api/triage`; they require `IR_ARENA_AUTH_COOKIE` and burn wallet budget for the signed-in user. `scripts/test-cap.mjs` hits the real Neon DB + AI Gateway with a synthetic user and mirrors the production `BILLING_MARKUP` math.

Env shape: the public setup page (`/`) can be viewed without secrets, and `/api/models` fails open when Gateway is unavailable. A full comparison run on `/run` requires `AI_GATEWAY_API_KEY`, `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET`. Wallet top-ups/payment require `IR_ARENA_APP_URL`, `IR_ARENA_STRIPE_SECRET_KEY`, and `IR_ARENA_STRIPE_WEBHOOK_SECRET`; shared `STRIPE_*` vars are intentionally ignored. `BILLING_MARKUP` is optional and defaults to `2`.

## What this is

A blinded, side-by-side LLM comparison demo: a clinician enters a synthetic acute-hemorrhage vignette, four models independently return a **strict structured IR triage recommendation**, and the UI streams them as anonymized cards (Model A–D) until the user reveals identities and an agreement strip. It is a research/demo tool, **not clinical care**. `docs/PROJECT.md` is the living architecture/progress doc; `design.md` is the visual spec.

## Architecture

```
app/page.tsx (public setup)
  choose models + case → sessionStorage pending run → /run (sign-in if needed)
        │
app/run/page.tsx (authenticated comparison)
  shuffleModels(selected models) → blind labels per run
        │
  RunResults renders one ModelCard per selected model
        │
        └─ each ModelCard independently calls useObject → POST /api/triage
                                                              │
                    verifyFreshSession → reserveBudget → streamText + Output.object
                                                              │
                                      createTriageModel(slug) → AI Gateway
                                      after() → settleUsage
```

- **Per-card independence.** Each `ModelCard` owns one model's request via `experimental_useObject` (`@ai-sdk/react`). Cards report their state up through a stable per-label `onStateChange` handler; `app/run/page.tsx` aggregates into `slotStates` for the consensus strip. There is no central fetch — parallel HTTP requests fan out one per selected model.
- **One model per request.** The API route handles a single `{ case, model }` and streams one object. Fan-out happens on the client.
- **Blinding** lives entirely client-side in `lib/shuffle.ts` (Fisher–Yates) → spreadsheet-style blind labels (`A`, `B`, ..., `AA` if needed). Reveal is a UI toggle; the server never sees labels.
- **Staggering.** `getModelStartDelayMs` in `app/run/page.tsx` offsets each card's submit by `index*500ms`, plus an extra +1s for `gemini` (works around empty-stream-under-parallel-load). Latency timing starts at the actual request, after the delay.

## Study-posture invariants (do not "improve" these without intent)

This codebase is deliberately strict because it produces study data. Several "helpful" behaviors are intentionally **absent**:

- **No answer repair / normalization.** `normalizeTriagePartial` is display-only and casts without fixing keys. Schema drift (snake_case, extra keys, missing fields) is a *measured outcome*, surfaced as a per-card error and excluded from agreement — never silently corrected.
- **Strict schema.** `triageSchema` (`lib/schema.ts`) is `.strict()` with exact camelCase keys and an integer `confidence` 0–100. Client and server validate with the same schema.
- **No hidden retries / no re-sampling.** `STUDY_GENERATION_SETTINGS` pins `maxRetries: 0`, `temperature: 0`, `maxOutputTokens: 4000`. Retry is a manual user action only. (The cap is high, not low, because reasoning tokens count as output and draw down this same budget before the JSON is emitted — a smaller cap starves reasoning models mid-thought and produces false empty-stream "no response" outcomes. It was raised 2000→4000 so heavy reasoners like `moonshotai/kimi-k2.6` — which thinks ~8k characters before emitting JSON — finish on the starter tier. The cap is the single source of truth from which `lib/usage/pricing.ts` derives its reservation ceiling, so changing it stays billing-consistent — but the static fallback table there must be regenerated (`pnpm exec tsx --env-file=.env.local scripts/dump-pricing.mjs`). Note kimi-k2.6 can still overflow on *tough* cases — past any sane token cap *and* past the route's 120s `maxDuration` — which is a genuine measured model limitation, not a misconfiguration.)
- **Same prompt for every model.** All arms get the identical `SYSTEM_PROMPT` (`lib/prompts.ts`); no model-specific hints or schema coaching.
- **Server-side whitelist, no provider pinning.** The route rejects any slug not in `MODEL_CATALOG` (`isKnownModelSlug`). Per `lib/study-settings.ts`, the Gateway is deliberately not pinned with `providerOptions.gateway.only`; slug prefixes are model namespaces, not provider names, and pinning them breaks fallback/ZDR routing. If strict provider reproducibility is required later, add an explicit per-model map of real Gateway provider names.
- **Usage persistence is billing-only.** `usage_events` records reservation/settlement metadata for spend enforcement, but raw completions, normalized outputs, and expert scores are *not* stored. Add study persistence before treating any run as a real dataset.

## Key files

| Path | Role |
|------|------|
| `app/api/triage/route.ts` | Node-runtime streaming route (`runtime = 'nodejs'` so DevTools can write captures); `streamText` + `Output.object`. |
| `lib/ai-model.ts` | `createTriageModel` — wraps `gateway(slug)` with `extractJsonMiddleware` (+ `devToolsMiddleware` in dev). |
| `lib/models.ts` | Curated model catalog, default comparison ids, and slug whitelist helpers. `gemma` is a flagged substitute for unavailable MedGemma (carries a `footnote`). |
| `lib/schema.ts` | Strict `triageSchema`, request schema, confidence formatting, display-only partial cast. |
| `lib/study-settings.ts` | Generation settings plus the explicit "no provider pinning" rationale. |
| `lib/prompts.ts` | The single shared system prompt / output contract. |
| `lib/cases.ts` | `PRESET_CASES` (synthetic vignettes) + folds structured fields into one prompt string via `assembleCaseText`. |
| `lib/consensus.ts` | Agreement computation across finished cards (decision/urgency exact, vessel/agent trimmed-lowercased; needs ≥2 finished). |
| `components/run/model-card.tsx` | The core streaming client — per-model state machine, latency, error classification, schema-failure display. |
| `app/page.tsx` | Public setup shell; model selection, case prep, pending-run handoff. |
| `app/run/page.tsx` | Authenticated run shell; shuffle, run lifecycle, slot-state aggregation. |

## Gotchas

- **The `onStateChange` infinite-loop trap** (documented in `page.tsx`): per-label handlers must be stable (memoized by fixed A–D labels). A fresh closure per render makes the card's reporting effect refire endlessly. Keep handlers stable.
- **Runtime must stay `nodejs`** on the triage route — the dev DevTools middleware writes to the filesystem (`.devtools/`), which Edge can't do.
- **Load probes need a browser session.** Copy the signed-in local app's Cookie header into `IR_ARENA_AUTH_COOKIE` before running `scripts/test-parallel.sh` or `scripts/test-staggered.sh`; unauthenticated `/api/triage` returns 401 by design.
- React Compiler is **on** (`reactCompiler: true` in `next.config.ts`); avoid manual memoization patterns it would conflict with where possible.
- UI is shadcn/ui (`components/ui/*`) on Tailwind v4 with hardcoded hex design tokens from `design.md` (canvas `#FCFAF8`, etc.).
