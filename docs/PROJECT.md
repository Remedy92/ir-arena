# IR Arena — Project Orchestrator

Central doc for architecture, progress, and deployment.

**Last updated:** 2026-06-06  
**Orchestrator:** main agent  
**Repo:** https://github.com/Remedy92/ir-arena (pending)  
**Deploy:** Vercel (pending)

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
| 0 Bootstrap | orchestrator | ✅ | Next.js 16, Tailwind v4, shadcn, ai SDK |
| 1 Data layer | subagent | 🔄 | lib/schema, cases, models, shuffle, consensus |
| 2 API | subagent | 🔄 | /api/triage edge route |
| 3 UI | subagent | 🔄 | components + page shell |
| 4 Integration | orchestrator | ⏳ | wire parallel, build gate |
| 5 Ship | orchestrator | ⏳ | GitHub + Vercel |

## File map

```
app/
  layout.tsx       fonts + TooltipProvider
  globals.css      design tokens
  page.tsx         orchestration shell
  api/triage/      streaming route
components/        UI
lib/               schema, models, cases, consensus
design.md          visual spec
```

## Demo script (supervisor)

1. Open app → select preset **#2 Pelvic trauma**
2. Click **Run triage** (blinded A–D)
3. Watch 4 cards stream in parallel
4. Toggle **Reveal models** → read consensus strip

## Env

```bash
AI_GATEWAY_API_KEY=   # only required secret
```