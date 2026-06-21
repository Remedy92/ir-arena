-- Row Level Security migration for IR Arena (SEC-004).
--
-- Enables RLS on the wallet tables (user_budget, payments) so that even if
-- DATABASE_URL leaks, an attacker cannot read or modify other users' wallet
-- balances or payment records without setting the app.current_user_id session
-- variable.
--
-- PREREQUISITE: The Neon serverless HTTP driver (neon()) issues each query as
-- a separate HTTP request, so SET LOCAL session variables don't persist across
-- queries. To use RLS with this driver, either:
--
--   1. Migrate to Neon's WebSocket Pool client (@neondatabase/serverless Pool),
--      which supports persistent connections with session-level SET variables.
--   2. Wrap user-scoped queries in SECURITY DEFINER functions that accept
--      user_id as a parameter and enforce the check inside the function.
--   3. Use the transaction() batch mode to SET LOCAL + query in one batch.
--
-- Apply this migration only after one of the above is in place. Until then,
-- the app relies on application-level authz (WHERE user_id = ${session.user.id})
-- which is already enforced on every query.
--
-- Tables NOT covered by RLS:
--   usage_events — queried cross-user by repairStaleUsageReservations()
--   run_votes    — queried cross-user by the leaderboard aggregation
--   run_arms     — queried cross-user by the leaderboard aggregation
--
-- Apply with: psql "$DATABASE_URL" -f db/rls.sql

-- Enable RLS on wallet tables.
ALTER TABLE user_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- user_budget: users can only see/modify their own wallet row.
CREATE POLICY user_budget_isolation ON user_budget
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- payments: users can only see their own payment ledger rows.
-- (Writes are only done by the webhook handler via withUserContext.)
CREATE POLICY payments_isolation ON payments
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));
