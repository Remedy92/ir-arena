import { gateway } from 'ai';

const slugs = [
  'openai/gpt-5.5', 'openai/gpt-5', 'openai/gpt-4.1',
  'anthropic/claude-opus-4.8', 'anthropic/claude-opus-4', 'anthropic/claude-sonnet-4.5',
  'google/gemini-3.5-flash', 'google/gemini-2.5-pro', 'google/gemma-4-31b-it',
  'xai/grok-4.3', 'deepseek/deepseek-v3', 'meta/llama-4-maverick',
];

const { models } = await gateway.getAvailableModels();
const byId = new Map(models.map((m) => [m.id, m]));

// Ceiling assumes ~2000 input tokens + 900 output tokens (maxOutputTokens), with
// generous reasoning headroom folded into output by tripling it.
const IN = 2000;
const OUT = 900 * 3; // headroom for reasoning tokens

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
