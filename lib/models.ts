/**
 * A blind label shown in place of a model's identity (A, B, C, … and, beyond
 * the alphabet, AA, AB, …). Generalized from the original fixed A–D union so
 * the arena can compare any number of selected models.
 */
export type BlindLabel = string;

export interface ModelConfig {
  id: string;
  label: string;
  slug: string;
  provider: string;
  dotColor: string;
  substituted?: boolean;
  footnote?: string;
}

/**
 * Curated catalog of models offered in the picker. Every slug is a real entry
 * in the installed AI Gateway `GatewayModelId` union — the server whitelist
 * (`isKnownModelSlug`) is derived from this list, so the gateway is never an
 * open proxy.
 */
export const MODEL_CATALOG: ModelConfig[] = [
  {
    id: 'gpt-5.5',
    label: 'GPT-5.5',
    slug: 'openai/gpt-5.5',
    provider: 'OpenAI',
    dotColor: '#10A37F',
  },
  {
    id: 'gpt-5',
    label: 'GPT-5',
    slug: 'openai/gpt-5',
    provider: 'OpenAI',
    dotColor: '#10A37F',
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    slug: 'openai/gpt-4.1',
    provider: 'OpenAI',
    dotColor: '#10A37F',
  },
  {
    id: 'claude-opus-4.8',
    label: 'Claude Opus 4.8',
    slug: 'anthropic/claude-opus-4.8',
    provider: 'Anthropic',
    dotColor: '#D97757',
  },
  {
    id: 'claude-opus-4',
    label: 'Claude Opus 4',
    slug: 'anthropic/claude-opus-4',
    provider: 'Anthropic',
    dotColor: '#D97757',
  },
  {
    id: 'claude-sonnet-4.5',
    label: 'Claude Sonnet 4.5',
    slug: 'anthropic/claude-sonnet-4.5',
    provider: 'Anthropic',
    dotColor: '#D97757',
  },
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    slug: 'google/gemini-3.5-flash',
    provider: 'Google',
    dotColor: '#4285F4',
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    slug: 'google/gemini-2.5-pro',
    provider: 'Google',
    dotColor: '#4285F4',
  },
  {
    id: 'gemma-4-31b',
    label: 'Gemma 4 31B',
    slug: 'google/gemma-4-31b-it',
    provider: 'Google',
    dotColor: '#34A853',
    substituted: true,
    footnote:
      'MedGemma unavailable via gateway — this arm uses Gemma 4 31B and should not be analyzed as MedGemma',
  },
  {
    id: 'grok-4.3',
    label: 'Grok 4.3',
    slug: 'xai/grok-4.3',
    provider: 'xAI',
    dotColor: '#1DA1F2',
  },
  {
    id: 'deepseek-v3',
    label: 'DeepSeek V3',
    slug: 'deepseek/deepseek-v3',
    provider: 'DeepSeek',
    dotColor: '#6B4FBB',
  },
  {
    id: 'llama-4-maverick',
    label: 'Llama 4 Maverick',
    slug: 'meta/llama-4-maverick',
    provider: 'Meta',
    dotColor: '#0866FF',
  },
];

/** Default comparison: the four verified-active arms from the original study. */
export const DEFAULT_MODEL_IDS: string[] = [
  'gpt-5.5',
  'claude-opus-4.8',
  'gemini-3.5-flash',
  'gemma-4-31b',
];

export const MODEL_SLUGS = MODEL_CATALOG.map((model) => model.slug);

export function getModelBySlug(slug: string): ModelConfig | undefined {
  return MODEL_CATALOG.find((model) => model.slug === slug);
}

export function getModelById(id: string): ModelConfig | undefined {
  return MODEL_CATALOG.find((model) => model.id === id);
}

export function defaultSelectedModels(): ModelConfig[] {
  return DEFAULT_MODEL_IDS.map((id) => getModelById(id)).filter(
    (model): model is ModelConfig => model !== undefined,
  );
}

export function isKnownModelSlug(slug: string): boolean {
  return MODEL_SLUGS.includes(slug);
}

export function hasSubstitutionFootnote(model: ModelConfig): boolean {
  return model.substituted === true && typeof model.footnote === 'string';
}

/**
 * Spreadsheet-style label for a slot index: 0→A, 25→Z, 26→AA, 27→AB, …
 * Correct for any non-negative integer; in practice only A–L are used.
 */
export function labelFromIndex(index: number): BlindLabel {
  let n = index;
  let label = '';
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

export function labelsForCount(count: number): BlindLabel[] {
  return Array.from({ length: count }, (_, index) => labelFromIndex(index));
}
