/**
 * Conservative worst-case cost CEILINGS per triage call, in micro-USD
 * (1 USD = 1,000,000 micro-USD).
 *
 * With STUDY_GENERATION_SETTINGS pinning maxOutputTokens=900 and the case prompt
 * bounded to a few thousand input tokens, each call has a knowable upper bound.
 * These values are used ONLY for the pre-flight budget reservation
 * (lib/usage/guard.ts). The authoritative cost is read back from the AI Gateway
 * after the call (lib/usage/settle.ts), so an over-estimate here only trips the
 * $0.05 cap slightly early — it never under-charges. Re-check against live
 * gateway pricing periodically; exact accuracy is not required.
 */
export const MODEL_COST_CEILING_MICRO_USD: Record<string, number> = {
  'openai/gpt-5.5': 12_000,
  'openai/gpt-5': 10_000,
  'openai/gpt-4.1': 6_000,
  'anthropic/claude-opus-4.8': 18_000,
  'anthropic/claude-opus-4': 18_000,
  'anthropic/claude-sonnet-4.5': 6_000,
  'google/gemini-3.5-flash': 800,
  'google/gemini-2.5-pro': 6_000,
  'google/gemma-4-31b-it': 1_500,
  'xai/grok-4.3': 10_000,
  'deepseek/deepseek-v3': 1_500,
  'meta/llama-4-maverick': 2_500,
};

/** Fallback ceiling for any slug missing from the map (deliberately high). */
export const DEFAULT_CEILING_MICRO_USD = 20_000;

export function getCeiling(modelSlug: string): number {
  return MODEL_COST_CEILING_MICRO_USD[modelSlug] ?? DEFAULT_CEILING_MICRO_USD;
}
