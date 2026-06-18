import { gateway } from 'ai';

import { applyMarkup } from '@/lib/billing';

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
  'openai/gpt-5.4-mini': 12_000,
  'openai/gpt-5.4-nano': 3_300,
  'anthropic/claude-opus-4.8': 70_000,
  'anthropic/claude-sonnet-4.6': 42_000,
  'google/gemini-3.5-flash': 24_000,
  'google/gemma-4-31b-it': 1_360,
  'xai/grok-4.3': 10_000,
  'zai/glm-5.2': 16_000,
  'alibaba/qwen3.7-plus': 4_800,
  'deepseek/deepseek-v4-flash': 1_121,
  'deepseek/deepseek-v4-pro': 3_480,
  'moonshotai/kimi-k2.6': 11_800,
  'minimax/minimax-m3': 3_600,
  'stepfun/step-3.7-flash': 3_100,
  'xiaomi/mimo-v2.5': 1_121,
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
 * Worst-case cost CEILING for one triage call, in CUSTOMER micro-USD (raw gateway
 * cost × BILLING_MARKUP). Computed from the gateway's LIVE per-token pricing so the
 * reservation is always >= the real charge — the invariant the wallet balance
 * depends on (an under-reservation could let a call settle above the balance).
 * Falls back to a static per-slug map, then a high default, if pricing can't be
 * fetched. The markup is applied last so ceiling and settled charge use the same
 * multiplier and stay consistent.
 *
 * Note: expensive multi-model comparisons can still exceed the starter wallet,
 * so a fresh user's reservation for those calls is rejected outright until they
 * top up — that is correct, intended enforcement, not a bug.
 */
export async function getCeilingMicroUsd(modelSlug: string): Promise<number> {
  const pricing = (await loadPricing()).get(modelSlug);
  if (pricing) {
    const usd =
      pricing.input * MAX_INPUT_TOKENS + pricing.output * MAX_OUTPUT_TOKENS;
    return applyMarkup(Math.ceil(usd * MICRO_USD_PER_USD));
  }
  return applyMarkup(
    STATIC_FALLBACK_MICRO_USD[modelSlug] ?? DEFAULT_FALLBACK_MICRO_USD,
  );
}
