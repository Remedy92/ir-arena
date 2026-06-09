// Integration test for the per-user spend cap. Hits the REAL Neon DB and REAL AI
// Gateway, using a synthetic throwaway user so it never touches real account data.
// Replicates the exact SQL from lib/usage/guard.ts + settle.ts and the ceiling
// formula from lib/usage/pricing.ts.
//
//   node --env-file=.env.local scripts/test-cap.mjs
import { gateway, streamText } from 'ai';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const USER = 'test-cap-user-DELETEME';
const MICRO = 1_000_000;
const MAX_IN = 4_000;
const MAX_OUT = 2_000;

async function ceilingMicro(slug) {
  const { models } = await gateway.getAvailableModels();
  const m = models.find((x) => x.id === slug);
  const p = m?.pricing ?? m?.specification?.pricing;
  return Math.ceil((Number(p.input) * MAX_IN + Number(p.output) * MAX_OUT) * MICRO);
}

async function reserve(slug) {
  const ceil = await ceilingMicro(slug);
  await sql`INSERT INTO user_budget (user_id) VALUES (${USER}) ON CONFLICT (user_id) DO NOTHING`;
  const reserved = await sql`
    UPDATE user_budget SET reserved_micro_usd = reserved_micro_usd + ${ceil}, updated_at = NOW()
    WHERE user_id = ${USER}
      AND spent_micro_usd + reserved_micro_usd + ${ceil} <= cap_micro_usd
    RETURNING reserved_micro_usd`;
  if (reserved.length === 0) return { ok: false, ceil };
  const ins = await sql`INSERT INTO usage_events (user_id, model_slug, cost_micro_usd, status)
    VALUES (${USER}, ${slug}, ${ceil}, 'reserved') RETURNING id`;
  return { ok: true, reservationId: Number(ins[0].id), ceil };
}

async function settle(reservationId, ceil, slug) {
  const result = streamText({
    model: gateway(slug),
    prompt: '40yo trauma, hypotensive, suspected splenic bleed. One-sentence triage.',
    maxOutputTokens: 200,
  });
  for await (const _c of result.textStream) void _c;
  const pm = await result.providerMetadata;
  const usage = await result.usage;
  const genId = pm?.gateway?.generationId;

  let actual = 0;
  let status = 'failed';
  const deadline = Date.now() + 30_000;
  let wait = 4_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, wait));
    wait = 3_000;
    try {
      const info = await gateway.getGenerationInfo({ id: genId });
      if (typeof info?.totalCost === 'number') {
        actual = Math.round(info.totalCost * MICRO);
        status = 'settled';
        break;
      }
    } catch {
      /* not propagated yet */
    }
  }
  if (status === 'failed') actual = ceil; // fail-safe: charge the ceiling

  await sql`UPDATE user_budget
    SET spent_micro_usd = spent_micro_usd + ${actual},
        reserved_micro_usd = GREATEST(0, reserved_micro_usd - ${ceil}), updated_at = NOW()
    WHERE user_id = ${USER}`;
  await sql`UPDATE usage_events
    SET generation_id = ${genId}, input_tokens = ${usage?.inputTokens ?? null},
        output_tokens = ${usage?.outputTokens ?? null}, cost_micro_usd = ${actual}, status = ${status}
    WHERE id = ${reservationId}`;
  return { genId, actual, status, usage };
}

const fmt = (micro) => `${(micro / 10_000).toFixed(2)}¢ (${micro}µ)`;
const budget = async () => (await sql`SELECT spent_micro_usd, reserved_micro_usd, cap_micro_usd FROM user_budget WHERE user_id=${USER}`)[0];

await sql`DELETE FROM usage_events WHERE user_id=${USER}`;
await sql`DELETE FROM user_budget WHERE user_id=${USER}`;

console.log('=== Spend-cap integration test (synthetic user, real DB + gateway) ===');

console.log('\n[1] Cheap model under cap: reserve → run → settle REAL cost');
const r1 = await reserve('deepseek/deepseek-v3');
console.log(`  reserve ok=${r1.ok}, ceiling=${fmt(r1.ceil)}`);
const s1 = await settle(r1.reservationId, r1.ceil, 'deepseek/deepseek-v3');
console.log(`  settled status=${s1.status}, REAL cost=${fmt(s1.actual)} (tokens in/out=${s1.usage?.inputTokens}/${s1.usage?.outputTokens})`);
console.log(`  -> real cost ${s1.actual < r1.ceil ? 'BELOW' : '>='} ceiling — reservation released, spent=actual`);
const b1 = await budget();
console.log(`  budget now: spent=${fmt(+b1.spent_micro_usd)} reserved=${fmt(+b1.reserved_micro_usd)} cap=${fmt(+b1.cap_micro_usd)}`);

console.log('\n[2] Frontier model on a FRESH $0.05 cap (single call exceeds cap)');
await sql`UPDATE user_budget SET spent_micro_usd=0, reserved_micro_usd=0, cap_micro_usd=50000 WHERE user_id=${USER}`;
const r2 = await reserve('anthropic/claude-opus-4');
console.log(`  opus-4 ceiling=${fmt(r2.ceil)} -> reserve ok=${r2.ok}  ${r2.ok ? '' : '✓ 402 budget_exceeded (correct — one Opus call > $0.05)'}`);

console.log('\n[3] Crossing the cap mid-budget: spent already 4.9¢, try another model');
await sql`UPDATE user_budget SET spent_micro_usd=49000, reserved_micro_usd=0, cap_micro_usd=50000 WHERE user_id=${USER}`;
const r3 = await reserve('google/gemini-3.5-flash');
console.log(`  gemini-flash ceiling=${fmt(r3.ceil)}, remaining=1.00¢ -> reserve ok=${r3.ok}  ${r3.ok ? '' : '✓ 402 budget_exceeded (correct)'}`);

console.log('\n[4] A model that DOES fit the remaining budget still passes');
await sql`UPDATE user_budget SET spent_micro_usd=45000, reserved_micro_usd=0, cap_micro_usd=50000 WHERE user_id=${USER}`;
const r4 = await reserve('google/gemma-4-31b-it');
console.log(`  gemma ceiling=${fmt(r4.ceil)}, remaining=5.00¢ -> reserve ok=${r4.ok}  ${r4.ok ? '✓ allowed (fits)' : ''}`);

await sql`DELETE FROM usage_events WHERE user_id=${USER}`;
await sql`DELETE FROM user_budget WHERE user_id=${USER}`;
console.log('\nCleaned up synthetic user. Done.');
