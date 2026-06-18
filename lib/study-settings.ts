export const STUDY_GENERATION_SETTINGS = {
  maxRetries: 0,
  // Reasoning tokens are billed and counted as OUTPUT tokens, so they draw down
  // this same budget BEFORE the JSON object is emitted. At the old 900 cap,
  // reasoning models (e.g. zai/glm-5.2, deepseek/deepseek-v4-*) routinely spent
  // the entire budget thinking and hit `finishReason: 'length'` with zero text
  // tokens — surfacing as a false "no response"/empty-stream outcome rather than
  // a real measurement. Note `reasoning: 'none'` does NOT reliably suppress this
  // via the Gateway. This value is the single source of truth for the worst-case
  // output budget: `getCeilingMicroUsd` (lib/usage/pricing.ts) DERIVES its
  // reservation ceiling from it, so raising the cap stays billing-consistent by
  // construction and lets every model finish reasoning AND return the schema
  // object. Observed worst case across GLM/DeepSeek at this setting is ~740
  // output tokens, so 2000 is generous headroom.
  // We intentionally do NOT force native structured outputs: the study measures
  // each model's *natural* schema compliance, so constraining decoding to the
  // schema would corrupt the measured outcome.
  maxOutputTokens: 2000,
  temperature: 0,
} as const;

type GatewayRoutingOverride = {
  order?: string[];
};

const GATEWAY_ROUTING_OVERRIDES: Record<string, GatewayRoutingOverride> = {
  // Fireworks currently streams Qwen's reasoning until the cap and returns an
  // empty object for this schema. TogetherAI is a ZDR-capable fallback and
  // returns schema-valid triage JSON for the same Gateway slug.
  'alibaba/qwen3.7-plus': { order: ['togetherai'] },
};

export function getGatewayRoutingOverride(
  modelSlug: string,
): GatewayRoutingOverride {
  return GATEWAY_ROUTING_OVERRIDES[modelSlug] ?? {};
}

// NOTE: We deliberately do NOT pin `providerOptions.gateway.only`. An earlier
// version pinned `only: [slug.split('/')[0]]`, but the slug prefix is the model
// *namespace*, not a Gateway *provider* name — so it (a) stripped every fallback
// route (`fallbacksAvailable: []`), which breaks Zero-Data-Retention routing
// (e.g. forcing `google` instead of the ZDR-capable `vertex` for Gemini), and
// (b) was invalid for models whose namespace is not a provider (e.g.
// `meta/llama-4-maverick` — there is no `meta` provider, so it could never
// route). The model is uniquely identified by the full slug regardless of which
// provider serves it, so letting the Gateway route freely (with fallbacks) is
// both correct and what the AI Gateway docs recommend. If strict per-provider
// reproducibility is ever required, add a per-model map of REAL provider names
// (e.g. `['vertex']`) rather than the namespace prefix.
//
// Zero-Data-Retention is enabled on /api/triage via
// `providerOptions: { gateway: { zeroDataRetention: true } }`. Keep the catalog
// limited to slugs with at least one ZDR-attested route.
