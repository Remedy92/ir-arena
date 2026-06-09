import { gateway } from 'ai';

const MICRO_USD_PER_USD = 1_000_000;

// Conservative token bounds for one triage call: input covers a large structured
// case; output covers maxOutputTokens (900) plus generous reasoning-token
// headroom (reasoning tokens are billed and can dominate cost — see gemini).
const MAX_INPUT_TOKENS = 4_000;
const MAX_OUTPUT_TOKENS = 2_000;

// Per-slug fallback ceilings (micro-USD), used ONLY if live gateway pricing can't
// be fetched. Derived from observed gateway pricing at the bounds above;
// regenerate with `node --env-file=.env.local scripts/dump-pricing.mjs`.
const STATIC_FALLBACK_MICRO_USD: Record<string, number> = {
  'openai/gpt-5.5': 80_000,
  'openai/gpt-5': 25_000,
  'openai/gpt-4.1': 24_000,
  'anthropic/claude-opus-4.8': 70_000,
  'anthropic/claude-opus-4': 210_000,
  'anthropic/claude-sonnet-4.5': 42_000,
  'google/gemini-3.5-flash': 24_000,
  'google/gemini-2.5-pro': 25_000,
  'google/gemma-4-31b-it': 1_360,
  'xai/grok-4.3': 10_000,
  'deepseek/deepseek-v3': 3_320,
  'meta/llama-4-maverick': 2_900,
};

// Generous default for any unknown slug (above any single frontier call).
const DEFAULT_FALLBACK_MICRO_USD = 100_000;

interface Pricing {
  input: number;
  output: number;
}

const PRICING_TTL_MS = 60 * 60 * 1000; // 1 hour
let pricingCache: { fetchedAt: number; map: Map<string, Pricing> } | null = null;

async function loadPricing(): Promise<Map<string, Pricing>> {
  if (pricingCache && Date.now() - pricingCache.fetchedAt < PRICING_TTL_MS) {
    return pricingCache.map;
  }
  try {
    const { models } = await gateway.getAvailableModels();
    const map = new Map<string, Pricing>();
    for (const model of models) {
      const pricing =
        (model as { pricing?: Partial<Pricing> }).pricing ??
        (model as { specification?: { pricing?: Partial<Pricing> } }).specification
          ?.pricing;
      const input = Number(pricing?.input);
      const output = Number(pricing?.output);
      if (Number.isFinite(input) && Number.isFinite(output)) {
        map.set(model.id, { input, output });
      }
    }
    pricingCache = { fetchedAt: Date.now(), map };
    return map;
  } catch {
    // Stale cache beats nothing; otherwise the caller uses static fallbacks.
    return pricingCache?.map ?? new Map();
  }
}

/**
 * Worst-case cost CEILING for one triage call, in micro-USD. Computed from the
 * gateway's LIVE per-token pricing so the reservation is always >= the real cost
 * — the invariant the hard $0.05 cap depends on (an under-reservation could let a
 * call settle above the cap). Falls back to a static per-slug map, then a high
 * default, if pricing can't be fetched.
 *
 * Note: with a $0.05 cap, frontier models legitimately exceed the cap in a single
 * call (e.g. Opus-4 ≈ $0.23), so a fresh user's reservation for them is rejected
 * outright — that is correct, intended enforcement, not a bug.
 */
export async function getCeilingMicroUsd(modelSlug: string): Promise<number> {
  const pricing = (await loadPricing()).get(modelSlug);
  if (pricing) {
    const usd =
      pricing.input * MAX_INPUT_TOKENS + pricing.output * MAX_OUTPUT_TOKENS;
    return Math.ceil(usd * MICRO_USD_PER_USD);
  }
  return STATIC_FALLBACK_MICRO_USD[modelSlug] ?? DEFAULT_FALLBACK_MICRO_USD;
}
