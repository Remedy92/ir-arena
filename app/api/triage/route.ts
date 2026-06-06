import { Output, streamText } from 'ai';
import { ZodError } from 'zod';

import { createTriageModel } from '@/lib/ai-model';
import { GEMMA_EXTRA_PROMPT, SYSTEM_PROMPT } from '@/lib/prompts';
import { triageRequestSchema, triageSchema } from '@/lib/schema';

// Node.js runtime required for @ai-sdk/devtools local capture (fs + .devtools/)
export const runtime = 'nodejs';
export const maxDuration = 60;

function buildUserPrompt(caseText: string, model: string): string {
  if (model.includes('gemma')) {
    return `${caseText}\n\n${GEMMA_EXTRA_PROMPT}`;
  }

  return caseText;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { case: caseText, model } = triageRequestSchema.parse(body);

    const result = streamText({
      model: createTriageModel(model),
      system: SYSTEM_PROMPT,
      prompt: buildUserPrompt(caseText, model),
      output: Output.object({ schema: triageSchema }),
      maxRetries: 0,
      onError: ({ error }) => {
        console.error(`[triage] stream error for ${model}:`, error);
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}