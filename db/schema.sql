-- ir-arena spend-cap schema (public schema; auth tables live in neon_auth, managed by Neon Auth).
--
-- Apply to the Neon project with either:
--   * Neon MCP run_sql_transaction, or
--   * psql "$DATABASE_URL" -f db/schema.sql
--
-- All money is stored as integer micro-USD (1 USD = 1,000,000 micro-USD) to avoid
-- floating-point drift when accumulating many small per-request costs.

-- One budget row per authenticated user (neon_auth user id), created lazily on first request.
CREATE TABLE IF NOT EXISTS user_budget (
  user_id            TEXT PRIMARY KEY,              -- neon_auth user id
  spent_micro_usd    BIGINT NOT NULL DEFAULT 0,     -- settled actual cost
  reserved_micro_usd BIGINT NOT NULL DEFAULT 0,     -- outstanding pre-flight reservations
  cap_micro_usd      BIGINT NOT NULL DEFAULT 50000, -- $0.05 lifetime cap; per-row so it can be raised per user
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
