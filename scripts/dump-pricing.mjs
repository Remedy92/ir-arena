import { gateway } from 'ai';

import { STUDY_GENERATION_SETTINGS } from '../lib/study-settings.ts';

const slugs = [
  'openai/gpt-5.5', 'openai/gpt-5.4-mini', 'openai/gpt-5.4-nano',
  'anthropic/claude-opus-4.8', 'anthropic/claude-sonnet-4.6',
  'google/gemini-3.5-flash', 'google/gemma-4-31b-it',
  'xai/grok-4.3',
  'zai/glm-5.2',
  'alibaba/qwen3.7-plus',
  'deepseek/deepseek-v4-flash', 'deepseek/deepseek-v4-pro',
  'moonshotai/kimi-k2.6',
  'minimax/minimax-m3',
  'xiaomi/mimo-v2.5',
  'meta/llama-4-maverick',
];

const { models } = await gateway.getAvailableModels();
const byId = new Map(models.map((m) => [m.id, m]));

// MAX_INPUT_TOKENS mirrors lib/usage/pricing.ts; OUT is derived from the single
// source of truth (STUDY_GENERATION_SETTINGS.maxOutputTokens) so this script and
// the reservation ceiling can never drift after a cap change.
const IN = 4000;
const OUT = STUDY_GENERATION_SETTINGS.maxOutputTokens;

for (const slug of slugs) {
  const m = byId.get(slug);
  if (!m) { console.log(slug, 'NOT FOUND'); continue; }
  const p = m.pricing ?? m.specification?.pricing;
  if (!p) { console.log(slug, 'no pricing', Object.keys(m).join(',')); continue; }
  const inP = Number(p.input);
  const outP = Number(p.output);
  const estUsd = inP * IN + outP * OUT;
  console.log(
    `${slug.padEnd(32)} in=$${(inP * 1e6).toFixed(2)}/M out=$${(outP * 1e6).toFixed(2)}/M  -> ceiling ~${Math.ceil(estUsd * 1e6)} micro-USD ($${estUsd.toFixed(4)})`,
  );
}
