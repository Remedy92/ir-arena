import { Output, streamText } from 'ai';
import { ZodError } from 'zod';

import { createTriageModel } from '@/lib/ai-model';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { triageRequestSchema, triageSchema } from '@/lib/schema';
import { STUDY_GENERATION_SETTINGS } from '@/lib/study-settings';

// Node.js runtime required for @ai-sdk/devtools local capture (fs + .devtools/)
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { case: caseText, model } = triageRequestSchema.parse(body);

    const result = streamText({
      model: createTriageModel(model),
      system: SYSTEM_PROMPT,
      prompt: caseText,
      output: Output.object({ schema: triageSchema }),
      ...STUDY_GENERATION_SETTINGS,
      onError: ({ error }) => {
        console.error(`[triage] stream error for ${model}:`, error);
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: 'Invalid triage request' }, { status: 400 });
    }

    console.error('[triage] request failed:', error);
    return Response.json({ error: 'Triage request failed' }, { status: 500 });
  }
}
