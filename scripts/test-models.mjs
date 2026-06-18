import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.local before importing the AI SDK. Gateway auth can be initialized
// during module import in local scripts.
const envPath = resolve(process.cwd(), '.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (!match) {
    continue;
  }

  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  process.env[match[1].trim()] = value;
}

function unwrapModule(module) {
  return module.default ?? module;
}

const [
  ai,
  aiModel,
  models,
  schema,
  prompts,
  studySettings,
  output,
] = await Promise.all([
  import('ai'),
  import('../lib/ai-model.ts'),
  import('../lib/models.ts'),
  import('../lib/schema.ts'),
  import('../lib/prompts.ts'),
  import('../lib/study-settings.ts'),
  import('../lib/triage-output.ts'),
]);

const { streamText } = ai;
const { createTriageModel } = unwrapModule(aiModel);
const { MODEL_CATALOG } = unwrapModule(models);
const { triageSchema } = unwrapModule(schema);
const { SYSTEM_PROMPT } = unwrapModule(prompts);
const { getGatewayRoutingOverride, STUDY_GENERATION_SETTINGS } =
  unwrapModule(studySettings);
const { triageOutput } = unwrapModule(output);

const CASE_TEXT =
  'A 72-year-old man presents with brisk hematochezia six hours after uncomplicated cecal polypectomy during screening colonoscopy. He is pale and diaphoretic with blood pressure 95/60 mmHg and heart rate 112. Hemoglobin fell from 9.1 to 7.4 g/dL despite crystalloid resuscitation. CTA demonstrates active arterial extravasation from a branch of the ileocolic artery at the prior polypectomy site. He takes aspirin for coronary disease. IR and surgery are available.';

async function testModel(slug) {
  const start = Date.now();
  let text = '';
  let streamError = null;

  try {
    const result = streamText({
      model: createTriageModel(slug),
      instructions: SYSTEM_PROMPT,
      prompt: CASE_TEXT,
      output: triageOutput(),
      ...STUDY_GENERATION_SETTINGS,
      providerOptions: {
        gateway: {
          zeroDataRetention: true,
          user: 'ir-arena-test-models-local',
          tags: ['script:test-models', 'zdr:true'],
          ...getGatewayRoutingOverride(slug),
        },
      },
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
        : parseResult.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; '),
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

for (const model of MODEL_CATALOG) {
  console.log(JSON.stringify(await testModel(model.slug), null, 2));
}
