export type BlindLabel = 'A' | 'B' | 'C' | 'D';

export interface ModelConfig {
  id: string;
  label: string;
  slug: string;
  provider: string;
  dotColor: string;
  substituted?: boolean;
  footnote?: string;
}

export const MODELS: ModelConfig[] = [
  {
    id: 'gpt',
    label: 'GPT-5.5',
    slug: 'openai/gpt-5.5',
    provider: 'OpenAI',
    dotColor: '#10A37F',
  },
  {
    id: 'claude',
    label: 'Claude Opus 4.8',
    slug: 'anthropic/claude-opus-4.8',
    provider: 'Anthropic',
    dotColor: '#D97757',
  },
  {
    id: 'gemini',
    label: 'Gemini 3.5 Flash',
    slug: 'google/gemini-3.5-flash',
    provider: 'Google',
    dotColor: '#4285F4',
  },
  {
    id: 'medgemma',
    label: 'MedGemma 1.5',
    slug: 'google/gemma-4-31b-it',
    provider: 'Google',
    dotColor: '#34A853',
    substituted: true,
    footnote:
      'MedGemma unavailable via gateway — substituted with Gemma 4 31B',
  },
];

export function getModelBySlug(slug: string): ModelConfig | undefined {
  return MODELS.find((model) => model.slug === slug);
}

export function hasSubstitutionFootnote(model: ModelConfig): boolean {
  return model.substituted === true && typeof model.footnote === 'string';
}