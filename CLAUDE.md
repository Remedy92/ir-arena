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
pnpm devtools          # AI SDK DevTools viewer at http://localhost:4983 (dev only)
```

There is **no test framework**. `scripts/test-models.mjs` is an ad-hoc probe that streams every model in `MODELS` through the real triage pipeline and reports latency + Zod pass/fail — run it (with a populated `.env.local`) to diagnose gateway/schema regressions, not as a unit test. `scripts/test-parallel.sh` / `test-staggered.sh` are curl-based load probes against `/api/triage`.

The only required secret is `AI_GATEWAY_API_KEY` (Vercel AI Gateway). Copy `.env.example` → `.env.local`.

## What this is

A blinded, side-by-side LLM comparison demo: a clinician enters a synthetic acute-hemorrhage vignette, four models independently return a **strict structured IR triage recommendation**, and the UI streams them as anonymized cards (Model A–D) until the user reveals identities and an agreement strip. It is a research/demo tool, **not clinical care**. `docs/PROJECT.md` is the living architecture/progress doc; `design.md` is the visual spec.

## Architecture

```
app/page.tsx (client orchestrator)
  shuffleModels(MODELS) → assigns A/B/C/D blind labels per run
  renders 4× <ModelCard>, each keyed by `${label}-${runId}` (remount = clean state)
        │
        └─ each ModelCard independently calls useObject → POST /api/triage
                                                              │
                                          streamText + Output.object(triageSchema)
                                          via createTriageModel(slug) → AI Gateway
```

- **Per-card independence.** Each `ModelCard` owns one model's request via `experimental_useObject` (`@ai-sdk/react`). Cards report their state up through a stable per-label `onStateChange` handler; `page.tsx` aggregates into `slotStates` for the consensus strip. There is no central fetch — four parallel HTTP requests, one per card.
- **One model per request.** The API route handles a single `{ case, model }` and streams one object. Fan-out happens on the client.
- **Blinding** lives entirely client-side in `lib/shuffle.ts` (Fisher–Yates) → fixed `A|B|C|D` labels. Reveal is a UI toggle; the server never sees labels.
- **Staggering.** `getModelStartDelayMs` in `page.tsx` offsets each card's submit by `index*500ms`, plus an extra +1s for `gemini` (works around empty-stream-under-parallel-load). Latency timing starts at the actual request, after the delay.

## Study-posture invariants (do not "improve" these without intent)

This codebase is deliberately strict because it produces study data. Several "helpful" behaviors are intentionally **absent**:

- **No answer repair / normalization.** `normalizeTriagePartial` is display-only and casts without fixing keys. Schema drift (snake_case, extra keys, missing fields) is a *measured outcome*, surfaced as a per-card error and excluded from agreement — never silently corrected.
- **Strict schema.** `triageSchema` (`lib/schema.ts`) is `.strict()` with exact camelCase keys and an integer `confidence` 0–100. Client and server validate with the same schema.
- **No hidden retries / no re-sampling.** `STUDY_GENERATION_SETTINGS` pins `maxRetries: 0`, `temperature: 0`, `maxOutputTokens: 900`. Retry is a manual user action only.
- **Same prompt for every model.** All arms get the identical `SYSTEM_PROMPT` (`lib/prompts.ts`); no model-specific hints or schema coaching.
- **Server-side whitelist + provider pinning.** The route rejects any slug not in `MODELS` (`isKnownModelSlug`), and `buildGatewayProviderOptions` pins `gateway.only` to the slug's provider prefix so the gateway can't reroute to another provider.
- **No persistence yet.** Raw completions, normalized outputs, metadata, and expert scores are *not* stored. Add persistence before treating any run as a real dataset.

## Key files

| Path | Role |
|------|------|
| `app/api/triage/route.ts` | Node-runtime streaming route (`runtime = 'nodejs'` so DevTools can write captures); `streamText` + `Output.object`. |
| `lib/ai-model.ts` | `createTriageModel` — wraps `gateway(slug)` with `extractJsonMiddleware` (+ `devToolsMiddleware` in dev). |
| `lib/models.ts` | The 4-model registry + slug whitelist helpers. `gemma` is a flagged substitute for unavailable MedGemma (carries a `footnote`). |
| `lib/schema.ts` | Strict `triageSchema`, request schema, confidence formatting, display-only partial cast. |
| `lib/study-settings.ts` | Generation settings + gateway provider pinning. |
| `lib/prompts.ts` | The single shared system prompt / output contract. |
| `lib/cases.ts` | `PRESET_CASES` (synthetic vignettes) + folds structured fields into one prompt string via `assembleCaseText`. |
| `lib/consensus.ts` | Agreement computation across finished cards (decision/urgency exact, vessel/agent trimmed-lowercased; needs ≥2 finished). |
| `components/model-card.tsx` | The core streaming client — per-model state machine, latency, error classification, schema-failure display. |
| `app/page.tsx` | Orchestration shell; shuffle, run lifecycle, slot-state aggregation. |

## Gotchas

- **The `onStateChange` infinite-loop trap** (documented in `page.tsx`): per-label handlers must be stable (memoized by fixed A–D labels). A fresh closure per render makes the card's reporting effect refire endlessly. Keep handlers stable.
- **Runtime must stay `nodejs`** on the triage route — the dev DevTools middleware writes to the filesystem (`.devtools/`), which Edge can't do.
- React Compiler is **on** (`reactCompiler: true` in `next.config.ts`); avoid manual memoization patterns it would conflict with where possible.
- UI is shadcn/ui (`components/ui/*`) on Tailwind v4 with hardcoded hex design tokens from `design.md` (canvas `#FCFAF8`, etc.).
