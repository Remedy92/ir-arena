# IR Arena — Project Orchestrator

Central doc for architecture, progress, and deployment.

**Last updated:** 2026-06-14
**Orchestrator:** main agent  
**Repo:** https://github.com/Remedy92/ir-arena  
**Production:** https://ir-arena.vercel.app

## Architecture

```
User → public setup (/) → sign in if needed → authenticated run (/run)
         ↓                                      ↓
    choose models/case                   shuffle(selected models)
                                                ↓
    Agreement UI ◄── valid finished results  ModelCard(useObject) ──parallel──► POST /api/triage
                                                                                     ↓
                                                      verifySession → reserve wallet budget
                                                                                     ↓
                                                                  streamText + Output.object
                                                                                     ↓
                                                                               AI Gateway
                                                                                     ↓
                                                                            after() settlement
```

## Gateway catalog (verified 2026-06-06)

| Model | Slug | Status |
|-------|------|--------|
| GPT-5.5 | `openai/gpt-5.5` | ✓ |
| Claude Opus 4.8 | `anthropic/claude-opus-4.8` | ✓ |
| Gemini 3.5 Flash | `google/gemini-3.5-flash` | ✓ |
| Gemma 4 31B | `google/gemma-4-31b-it` | ✓ substitute arm; not analyzed as MedGemma |

## Progress

| Phase | Owner | Status | Notes |
|-------|-------|--------|-------|
| 0 Bootstrap | orchestrator | ✅ | Next.js 16, Tailwind v4, shadcn, AI SDK v6 |
| 1 Data layer | subagent | ✅ | lib/schema, cases, models, shuffle, consensus |
| 2 API | subagent | ✅ | Node /api/triage, streamText + Output.object |
| 3 UI | subagent | ✅ | All components per design.md |
| 4 Integration | orchestrator | ✅ | page.tsx wired, pnpm build passes |
| 5 Ship | orchestrator | ✅ | GitHub + Vercel prod deploy |

## Subagent assignments

| Subagent ID | Phase | Output |
|-------------|-------|--------|
| 019e9d36-1961-7792-b09b-6175dcf9fde5 | 1 | lib/* data layer |
| 019e9d36-1961-7792-b09b-618c7d46dade | 2 | app/api/triage/route.ts |
| 019e9d36-1961-7792-b09b-619395c4f534 | 3 | components/* UI |

## File map

```
app/
  layout.tsx       Newsreader + Inter + Geist Mono, TooltipProvider
  globals.css      design tokens (#FCFAF8 canvas)
  page.tsx         public setup shell
  run/page.tsx     authenticated comparison shell
  api/triage/      Node streaming route
components/        UI (top-bar, case-input, model-picker, run results, consensus)
lib/               schema, models, cases, auth, usage, billing, consensus, shuffle
design.md          visual spec
```

## Demo script (supervisor)

1. Open https://ir-arena.vercel.app → preset **#2 Pelvic trauma** is pre-selected
2. Select at least two models, then click **Run comparison**
3. Sign in if prompted; `/run` starts the blinded comparison
4. Watch cards stream in parallel, then reveal identities and read the agreement strip

## Env

The setup page (`/`) is public and can be viewed without local secrets. Running a comparison or using wallet top-ups needs the service env below.

```bash
AI_GATEWAY_API_KEY=          # Vercel AI Gateway; required for real model calls
DATABASE_URL=                # Neon Postgres spend-cap/wallet tables
NEON_AUTH_BASE_URL=          # Neon Auth / managed Better Auth base URL
NEON_AUTH_COOKIE_SECRET=     # signed session cookie secret, minimum 32 chars

IR_ARENA_APP_URL=            # app origin for Stripe Checkout return URLs
IR_ARENA_STRIPE_SECRET_KEY=  # app-specific Stripe key; shared STRIPE_* ignored
IR_ARENA_STRIPE_WEBHOOK_SECRET=
BILLING_MARKUP=2             # optional; defaults to 2x raw Gateway cost
```

## Debugging (AI SDK DevTools)

Local only — captures raw gateway request/response to `.devtools/generations.json`.

```bash
# Terminal 1
pnpm dev

# Terminal 2 (from ir-arena/)
pnpm devtools
# → open http://localhost:4983
```

`/api/triage` uses `runtime = 'nodejs'` so DevTools middleware can write captures in development. `maxRetries: 0` on the study route (no hidden re-sampling or silent re-billing).

## Study posture

- Server whitelists model slugs before calling AI Gateway.
- All arms receive the same system prompt; no model-specific schema hints.
- Gateway providers are not pinned. `lib/study-settings.ts` intentionally avoids `providerOptions.gateway.only` because slug prefixes are model namespaces, not real provider names, and pinning them breaks fallback/ZDR routing.
- Structured output is strict: exact camelCase keys, no extra keys, required integer confidence.
- The app no longer infers missing decisions, maps snake_case fields, or fills placeholder result fields for final validation.
- Current demo persists billing reservations/settlements only; raw completions, normalized outputs, and expert scores are not stored. Add study persistence before treating results as a real dataset.

### Failure diagnosis (2026-06-06 research, no re-test)

| Model | Root cause | Fix applied |
|-------|------------|-------------|
| GPT-5.5 | Client `useObject` final Zod validation can reject type/key drift | strict schema failure shown as excluded |
| Gemini 3.5 Flash | Empty gateway stream under parallel load | staggered start (+1s), `maxRetries: 0`, manual Retry only |
| Gemma 4 31B | May emit non-schema keys | no repair; schema drift counts as failure/exclusion |

## Commands

```bash
cd /Users/lucasvanhoutven/Projects/ir-arena
cp .env.example .env.local
pnpm i && pnpm dev
pnpm devtools   # optional viewer at :4983
pnpm build

# Authenticated /api/triage load probes; copy Cookie from a signed-in browser session.
IR_ARENA_AUTH_COOKIE='...' ./scripts/test-parallel.sh
IR_ARENA_AUTH_COOKIE='...' ./scripts/test-staggered.sh
```
