import { createTextStreamResponse, streamText } from 'ai';
import { after } from 'next/server';
import { ZodError } from 'zod';

import { createTriageModel } from '@/lib/ai-model';
import { verifyFreshSession } from '@/lib/auth/dal';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { triageRequestSchema } from '@/lib/schema';
import {
  getGatewayRoutingOverride,
  STUDY_GENERATION_SETTINGS,
} from '@/lib/study-settings';
import { triageOutput } from '@/lib/triage-output';
import { reserveBudget } from '@/lib/usage/guard';
import {
  markUsageGeneration,
  repairStaleUsageReservations,
  settleUsage,
} from '@/lib/usage/settle';

// Node.js runtime required for @ai-sdk/devtools local capture (fs + .devtools/),
// and for next/server `after()` used to reconcile spend post-response.
export const runtime = 'nodejs';
// Heavy reasoners (e.g. moonshotai/kimi-k2.6) can think for ~2 min before emitting
// JSON; 180s keeps slow-but-valid streams from being killed mid-reasoning. Vercel
// allows up to 300s on all plans. Tough cases can still exhaust the token cap well
// inside this window — that is a model limit, not a timeout (see study-settings).
export const maxDuration = 180;

function getGatewayGenerationId(metadata: unknown): string | undefined {
  if (typeof metadata !== 'object' || metadata === null) {
    return undefined;
  }
  const gateway = (metadata as { gateway?: unknown }).gateway;
  if (typeof gateway !== 'object' || gateway === null) {
    return undefined;
  }
  const generationId = (gateway as { generationId?: unknown }).generationId;
  return typeof generationId === 'string' ? generationId : undefined;
}

function getErrorGenerationId(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const generationId = (error as { generationId?: unknown }).generationId;
  return typeof generationId === 'string' ? generationId : undefined;
}

export async function POST(req: Request) {
  try {
    // Every model call is attributed to a signed-in user and counted against
    // their lifetime spend cap. Verify auth here (not just in the proxy).
    const session = await verifyFreshSession();
    if (!session) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return Response.json(
        { error: 'Expected JSON request body' },
        { status: 415 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: 'Invalid JSON request body' },
        { status: 400 },
      );
    }
    const {
      case: caseText,
      model,
      reasoning,
    } = triageRequestSchema.parse(body);

    await repairStaleUsageReservations();

    // Pre-flight: atomically reserve this call's worst-case cost. Reject BEFORE
    // hitting the model if it would push the user over their wallet cap. This
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

    let capturedGenerationId: string | undefined;
    let markGenerationPromise: Promise<void> | undefined;
    const captureGenerationId = (generationId: string | undefined) => {
      if (!generationId || capturedGenerationId) {
        return markGenerationPromise;
      }
      capturedGenerationId = generationId;
      markGenerationPromise = markUsageGeneration({
        reservationId: reservation.reservationId,
        userId,
        generationId,
      });
      return markGenerationPromise;
    };

    const result = streamText({
      model: createTriageModel(model),
      instructions: SYSTEM_PROMPT,
      prompt: caseText,
      reasoning,
      output: triageOutput(),
      ...STUDY_GENERATION_SETTINGS,
      // Attribute gateway spend to the user (visible in the gateway dashboard).
      // This is metadata only — it is NOT injected into the prompt.
      providerOptions: {
        gateway: {
          user: userId,
          zeroDataRetention: true,
          ...getGatewayRoutingOverride(model),
        },
      },
      onChunk: ({ chunk }) => {
        return captureGenerationId(
          getGatewayGenerationId(
            (chunk as { providerMetadata?: unknown }).providerMetadata,
          ),
        );
      },
      onError: ({ error }) => {
        void captureGenerationId(getErrorGenerationId(error));
        console.error(`[triage] stream error for ${model}:`, error);
      },
    });

    // Reconcile the reservation to the gateway's ACTUAL cost after the response
    // has streamed. The result promises resolve once the stream completes, so we
    // read cost/usage from them rather than racing the onEnd callback. If the
    // stream errored (no generation), settleUsage releases the reservation.
    after(async () => {
      let generationId: string | undefined;
      let usage: { inputTokens?: number; outputTokens?: number } | undefined;
      try {
        await markGenerationPromise;
        const [finalStep, resolvedUsage] = await Promise.all([
          result.finalStep,
          result.usage,
        ]);
        generationId =
          getGatewayGenerationId(finalStep.providerMetadata) ??
          capturedGenerationId;
        usage = {
          inputTokens: resolvedUsage?.inputTokens,
          outputTokens: resolvedUsage?.outputTokens,
        };
      } catch (error) {
        console.warn(`[triage] no usage for ${model} (stream error):`, error);
        generationId = capturedGenerationId;
      }

      await settleUsage({
        reservationId: reservation.reservationId,
        userId,
        ceilingMicroUsd: reservation.ceilingMicroUsd,
        generationId,
        usage,
      });
    });

    return createTextStreamResponse({ stream: result.textStream });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: 'Invalid triage request' }, { status: 400 });
    }

    console.error('[triage] request failed:', error);
    return Response.json({ error: 'Triage request failed' }, { status: 500 });
  }
}
