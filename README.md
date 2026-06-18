# IR Arena

Blinded side-by-side LLM triage comparison for synthetic acute hemorrhage cases — a research demo for interventional radiology.

![IR Arena screenshot](./public/screenshot.svg)

## Quickstart

```bash
cp .env.example .env.local   # populate the vars needed for runs/payments
pnpm i && pnpm dev           # http://localhost:3000
```

You can view the public setup page at `/` without secrets; the model availability check fails open in local dev. A real signed-in comparison on `/run` calls authenticated `/api/triage`, reserves wallet budget, and requires:

- `AI_GATEWAY_API_KEY`
- `DATABASE_URL`
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_COOKIE_SECRET`

Wallet top-ups and Stripe Checkout additionally require `IR_ARENA_APP_URL`, `IR_ARENA_STRIPE_SECRET_KEY`, and `IR_ARENA_STRIPE_WEBHOOK_SECRET`. The app intentionally ignores shared `STRIPE_*` vars. `BILLING_MARKUP` is optional and defaults to `2`.

## Demo script

1. Select preset **#2 Pelvic trauma**
2. Click **Run comparison** and sign in if prompted
3. Review the blinded run, then reveal model identities and the agreement strip

## Stack

Next.js · Tailwind CSS v4 · shadcn/ui · AI SDK v6 · Vercel AI Gateway · Zod

Study posture: same prompt for every model, server-side model whitelist, strict schema validation, no answer repair, no hidden retries.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit:prod
```

## Docs

See [`docs/PROJECT.md`](./docs/PROJECT.md) for architecture and [`design.md`](./design.md) for visual spec.
