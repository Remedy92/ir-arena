import { streamText, Output } from 'ai';
import { ZodError } from 'zod';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { triageRequestSchema, triageSchema } from '@/lib/schema';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { case: caseText, model } = triageRequestSchema.parse(body);

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      prompt: caseText,
      output: Output.object({ schema: triageSchema }),
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