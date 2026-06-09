import { Output, streamText } from 'ai';
import { after } from 'next/server';
import { ZodError } from 'zod';

import { createTriageModel } from '@/lib/ai-model';
import { verifySession } from '@/lib/auth/dal';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { triageRequestSchema, triageSchema } from '@/lib/schema';
import { STUDY_GENERATION_SETTINGS } from '@/lib/study-settings';
import { reserveBudget } from '@/lib/usage/guard';
import { settleUsage } from '@/lib/usage/settle';

// Node.js runtime required for @ai-sdk/devtools local capture (fs + .devtools/),
// and for next/server `after()` used to reconcile spend post-response.
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { case: caseText, model } = triageRequestSchema.parse(body);

    // Every model call is attributed to a signed-in user and counted against
    // their lifetime spend cap. Verify auth here (not just in the proxy).
    const session = await verifySession();
    if (!session) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // Pre-flight: atomically reserve this call's worst-case cost. Reject BEFORE
    // hitting the model if it would push the user over their $0.05 cap. This
    // correctly bounds the 2–12 parallel fan-out and a brand-new user's first run.
    const reservation = await reserveBudget(userId, model);
    if (!reservation.ok) {
      return Response.json(
        {
          error: 'budget_exceeded',
          message: 'Spend cap reached for this account.',
        },
        { status: 402 },
      );
    }

    const result = streamText({
      model: createTriageModel(model),
      system: SYSTEM_PROMPT,
      prompt: caseText,
      output: Output.object({ schema: triageSchema }),
      ...STUDY_GENERATION_SETTINGS,
      // Attribute gateway spend to the user (visible in the gateway dashboard).
      // This is metadata only — it is NOT injected into the prompt.
      providerOptions: { gateway: { user: userId } },
      onError: ({ error }) => {
        console.error(`[triage] stream error for ${model}:`, error);
      },
    });

    // Reconcile the reservation to the gateway's ACTUAL cost after the response
    // has streamed. The result promises resolve once the stream completes, so we
    // read cost/usage from them rather than racing the onFinish callback. If the
    // stream errored (no generation), settleUsage releases the reservation.
    after(async () => {
      let generationId: string | undefined;
      let usage: { inputTokens?: number; outputTokens?: number } | undefined;
      try {
        const [providerMetadata, resolvedUsage] = await Promise.all([
          result.providerMetadata,
          result.usage,
        ]);
        const gateway = providerMetadata?.gateway as
          | { generationId?: string }
          | undefined;
        generationId = gateway?.generationId;
        usage = {
          inputTokens: resolvedUsage?.inputTokens,
          outputTokens: resolvedUsage?.outputTokens,
        };
      } catch (error) {
        console.warn(`[triage] no usage for ${model} (stream error):`, error);
      }

      await settleUsage({
        reservationId: reservation.reservationId,
        userId,
        ceilingMicroUsd: reservation.ceilingMicroUsd,
        generationId,
        usage,
      });
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
