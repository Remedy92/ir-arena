export const STUDY_GENERATION_SETTINGS = {
  maxRetries: 0,
  maxOutputTokens: 900,
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
