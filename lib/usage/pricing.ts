import { gateway } from 'ai';

import { applyMarkup } from '@/lib/billing';
import { STUDY_GENERATION_SETTINGS } from '@/lib/study-settings';

const MICRO_USD_PER_USD = 1_000_000;

// Conservative token bounds for one triage call: input covers a large structured
// case; output is the hard generation cap (covering reasoning + JSON in one
// budget — reasoning tokens are billed as output and can dominate cost, see
// gemini/glm/deepseek). MAX_OUTPUT_TOKENS is DERIVED from the study setting
// rather than duplicated, so the wallet invariant "reservation >= what
// generation can emit" holds by construction and the two can never drift.
const MAX_INPUT_TOKENS = 4_000;
const MAX_OUTPUT_TOKENS = STUDY_GENERATION_SETTINGS.maxOutputTokens;

// Per-slug fallback ceilings (raw micro-USD, pre-markup), used ONLY if live
// gateway pricing can't be fetched. Sampled from gateway pricing at the bounds
// above (MAX_OUTPUT_TOKENS tracks STUDY_GENERATION_SETTINGS.maxOutputTokens, now
// 4000). After any cap change, regenerate so these stay >= the live ceiling:
//   pnpm exec tsx --env-file=.env.local scripts/dump-pricing.mjs
const STATIC_FALLBACK_MICRO_USD: Record<string, number> = {
  'openai/gpt-5.5': 140_000,
  'openai/gpt-5.4-mini': 21_000,
  'openai/gpt-5.4-nano': 5_800,
  'anthropic/claude-opus-4.8': 120_001,
  'anthropic/claude-sonnet-4.6': 72_001,
  'google/gemini-3.5-flash': 42_000,
  'google/gemma-4-31b-it': 2_160,
  'xai/grok-4.3': 15_000,
  'zai/glm-5.2': 24_000,
  'alibaba/qwen3.7-plus': 8_000,
  'deepseek/deepseek-v4-flash': 1_680,
  'deepseek/deepseek-v4-pro': 5_220,
  'moonshotai/kimi-k2.6': 19_800,
  'minimax/minimax-m3': 6_000,
  'xiaomi/mimo-v2.5': 1_680,
  'meta/llama-4-maverick': 4_841,
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
