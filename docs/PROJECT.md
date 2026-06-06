# IR Arena — Project Orchestrator

Central doc for architecture, progress, and deployment.

**Last updated:** 2026-06-06  
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
    ConsensusStrip ◄── finished results    streamText + Output.object
                                               ↓
                                         Vercel AI Gateway
```

## Gateway catalog (verified 2026-06-06)

| Model | Slug | Status |
|-------|------|--------|
| GPT-5.5 | `openai/gpt-5.5` | ✓ |
| Claude Opus 4.8 | `anthropic/claude-opus-4.8` | ✓ |
| Gemini 3.5 Flash | `google/gemini-3.5-flash` | ✓ |
| MedGemma 1.5 | `google/medgemma-1.5-4b` | ✗ → `google/gemma-4-31b-it` |

## Progress

| Phase | Owner | Status | Notes |
|-------|-------|--------|-------|
| 0 Bootstrap | orchestrator | ✅ | Next.js 16, Tailwind v4, shadcn, AI SDK v6 |
| 1 Data layer | subagent | ✅ | lib/schema, cases, models, shuffle, consensus |
| 2 API | subagent | ✅ | Edge /api/triage, streamText + Output.object |
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
  api/triage/      Edge streaming route
components/        UI (top-bar, hero, case-input, model-card, consensus)
lib/               schema, models, cases, consensus, shuffle
design.md          visual spec
```

## Demo script (supervisor)

1. Open https://ir-arena.vercel.app → preset **#2 Pelvic trauma** is pre-selected
2. Click **Run Triage** (blinded A–D)
3. Watch 4 cards stream in parallel
4. Toggle **Reveal models** → read **Consensus** strip

## Env

```bash
AI_GATEWAY_API_KEY=   # only required secret
```

## Commands

```bash
cd /Users/lucasvanhoutven/Projects/ir-arena
cp .env.example .env.local
pnpm i && pnpm dev
pnpm build
```