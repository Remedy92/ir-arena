# IR Arena — Project Orchestrator

Central doc for architecture, progress, and deployment.

**Last updated:** 2026-06-08  
**Orchestrator:** main agent  
**Repo:** https://github.com/Remedy92/ir-arena  
**Production:** https://ir-arena.vercel.app

## Architecture

```
User → CaseInput → Run
         ↓
    shuffle(models) → A/B/C/D labels
         ↓
    4× ModelCard (useObject) ──parallel──► POST /api/triage
         ↓                                      ↓
    Agreement UI ◄── valid finished results streamText + Output.object
                                               ↓
                                         Vercel AI Gateway
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
  page.tsx         orchestration shell
  api/triage/      Node streaming route
components/        UI (top-bar, hero, case-input, model-card, consensus)
lib/               schema, models, cases, consensus, shuffle
design.md          visual spec
```

## Demo script (supervisor)

1. Open https://ir-arena.vercel.app → preset **#2 Pelvic trauma** is pre-selected
2. Click **Run Triage** (blinded A–D)
3. Watch 4 cards stream in parallel
4. Toggle **Reveal models** → read **Agreement** strip

## Env

```bash
AI_GATEWAY_API_KEY=   # only required secret
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
- Gateway providers are pinned with `providerOptions.gateway.only` based on the model slug prefix.
- Structured output is strict: exact camelCase keys, no extra keys, required integer confidence.
- The app no longer infers missing decisions, maps snake_case fields, or fills placeholder result fields for final validation.
- Current demo still does not persist raw completions, normalized outputs, request metadata, or expert scores; add persistence before treating results as a real study dataset.

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
```
