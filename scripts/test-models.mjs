import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { streamText, Output, gateway } from 'ai';
import { triageSchema } from '../lib/schema.ts';
import { SYSTEM_PROMPT } from '../lib/prompts.ts';

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const CASE_TEXT =
  'A 72-year-old man presents with brisk hematochezia six hours after uncomplicated cecal polypectomy during screening colonoscopy. He is pale and diaphoretic with blood pressure 95/60 mmHg and heart rate 112. Hemoglobin fell from 9.1 to 7.4 g/dL despite crystalloid resuscitation. CTA demonstrates active arterial extravasation from a branch of the ileocolic artery at the prior polypectomy site. He takes aspirin for coronary disease. IR and surgery are available.';

const MODELS = [
  'anthropic/claude-opus-4.8',
  'openai/gpt-5.5',
  'google/gemini-3.5-flash',
  'google/gemma-4-31b-it',
];

async function testModel(slug) {
  const start = Date.now();
  let text = '';
  let streamError = null;

  try {
    const result = streamText({
      model: gateway(slug),
      system: SYSTEM_PROMPT,
      prompt: CASE_TEXT,
      output: Output.object({ schema: triageSchema }),
      onError: ({ error }) => {
        streamError = error;
      },
    });

    for await (const chunk of result.textStream) {
      text += chunk;
    }

    const output = await result.output;
    const parseResult = triageSchema.safeParse(output);

    return {
      slug,
      ms: Date.now() - start,
      textLen: text.length,
      textPreview: text.slice(0, 200),
      streamError: streamError?.message ?? null,
      output,
      zod: parseResult.success
        ? 'PASS'
        : parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    };
  } catch (error) {
    return {
      slug,
      ms: Date.now() - start,
      textLen: text.length,
      textPreview: text.slice(0, 200),
      streamError: streamError?.message ?? null,
      thrown: error instanceof Error ? error.message : String(error),
      zod: 'THROWN',
    };
  }
}

for (const slug of MODELS) {
  console.log(JSON.stringify(await testModel(slug), null, 2));
}