-- ir-arena spend-cap schema (public schema; auth tables live in neon_auth, managed by Neon Auth).
--
-- Apply to the Neon project with either:
--   * Neon MCP run_sql_transaction, or
--   * psql "$DATABASE_URL" -f db/schema.sql
--
-- All money is stored as integer micro-USD (1 USD = 1,000,000 micro-USD) to avoid
-- floating-point drift when accumulating many small per-request costs.

-- One budget row per authenticated user (neon_auth user id), created lazily on first request.
--
-- `cap_micro_usd` doubles as the prepaid WALLET BALANCE: it starts at the $0.50
-- free trial and is raised by Stripe top-ups (see the payments table + the
-- checkout/webhook routes). A run's remaining balance is cap - spent - reserved.
-- Balance is denominated in CUSTOMER micro-USD (what the user paid); runs burn it
-- at the reseller markup (BILLING_MARKUP, applied in lib/usage/pricing + settle).
CREATE TABLE IF NOT EXISTS user_budget (
  user_id            TEXT PRIMARY KEY,              -- neon_auth user id
  spent_micro_usd    BIGINT NOT NULL DEFAULT 0,     -- settled actual cost (marked-up customer micro-USD)
  reserved_micro_usd BIGINT NOT NULL DEFAULT 0,     -- outstanding pre-flight reservations
  cap_micro_usd      BIGINT NOT NULL DEFAULT 500000, -- $0.50 free trial + Stripe top-ups; the wallet balance ceiling
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only ledger of Stripe top-ups (money in). `stripe_session_id` is UNIQUE
-- so the webhook is idempotent: a duplicate delivery inserts nothing and the
-- credit (insert-payment + raise cap, done atomically in one CTE) becomes a no-op.
CREATE TABLE IF NOT EXISTS payments (
  id                    BIGSERIAL PRIMARY KEY,
  user_id               TEXT NOT NULL,             -- neon_auth user id this top-up credits
  stripe_session_id     TEXT NOT NULL UNIQUE,      -- Checkout Session id (idempotency key)
  stripe_payment_intent TEXT,                      -- resolved PaymentIntent id, when known
  amount_paid_cents     BIGINT NOT NULL,           -- what the customer was charged (charge currency)
  currency              TEXT NOT NULL DEFAULT 'usd',
  credited_micro_usd    BIGINT NOT NULL,           -- amount added to user_budget.cap_micro_usd
  status                TEXT NOT NULL DEFAULT 'completed', -- completed (created by the paid webhook)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_user_idx ON payments(user_id);

-- Append-only ledger of every triage call attempt.
CREATE TABLE IF NOT EXISTS usage_events (
  id             BIGSERIAL PRIMARY KEY,
  user_id        TEXT NOT NULL,
  model_slug     TEXT NOT NULL,
  generation_id  TEXT,                              -- providerMetadata.gateway.generationId
  input_tokens   INTEGER,
  output_tokens  INTEGER,
  cost_micro_usd BIGINT,                            -- actual settled cost, or ceiling on lookup failure
  status         TEXT NOT NULL DEFAULT 'reserved',  -- reserved | settled | failed
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS usage_events_user_idx ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS usage_events_gen_idx ON usage_events(generation_id);
CREATE INDEX IF NOT EXISTS usage_events_stale_reserved_idx
  ON usage_events(created_at)
  WHERE status = 'reserved';
