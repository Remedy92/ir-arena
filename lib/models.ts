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
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    slug: 'openai/gpt-5.4-mini',
    provider: 'OpenAI',
    dotColor: '#10A37F',
  },
  {
    id: 'gpt-5.4-nano',
    label: 'GPT-5.4 Nano',
    slug: 'openai/gpt-5.4-nano',
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
    id: 'claude-sonnet-4.6',
    label: 'Claude Sonnet 4.6',
    slug: 'anthropic/claude-sonnet-4.6',
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
    id: 'glm-5.2',
    label: 'GLM 5.2',
    slug: 'zai/glm-5.2',
    provider: 'Z.ai',
    dotColor: '#D946EF',
  },
  {
    id: 'qwen3.7-plus',
    label: 'Qwen 3.7 Plus',
    slug: 'alibaba/qwen3.7-plus',
    provider: 'Alibaba',
    dotColor: '#FF6A00',
  },
  {
    id: 'deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    slug: 'deepseek/deepseek-v4-flash',
    provider: 'DeepSeek',
    dotColor: '#6B4FBB',
  },
  {
    id: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    slug: 'deepseek/deepseek-v4-pro',
    provider: 'DeepSeek',
    dotColor: '#6B4FBB',
  },
  {
    id: 'kimi-k2.6',
    label: 'Kimi K2.6',
    slug: 'moonshotai/kimi-k2.6',
    provider: 'Moonshot AI',
    dotColor: '#111827',
  },
  {
    id: 'minimax-m3',
    label: 'MiniMax M3',
    slug: 'minimax/minimax-m3',
    provider: 'MiniMax',
    dotColor: '#0F766E',
  },
  {
    id: 'mimo-v2.5',
    label: 'MiMo M2.5',
    slug: 'xiaomi/mimo-v2.5',
    provider: 'Xiaomi',
    dotColor: '#FF6900',
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
