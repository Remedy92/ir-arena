import { z } from 'zod';

import { verifyFreshSession } from '@/lib/auth/dal';
import { getSql } from '@/lib/db';
import { isKnownModelSlug } from '@/lib/models';
import { TRIAGE_REQUEST_MAX_CASE_LENGTH } from '@/lib/schema';

export const runtime = 'nodejs';

const modelSnapshotSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
  blindLabel: z.string().trim().min(1).max(4),
  decision: z.string().trim().max(40).nullable(),
  urgency: z.string().trim().max(40).nullable(),
  targetVessel: z.string().trim().max(300).nullable(),
  embolicAgent: z.string().trim().max(300).nullable(),
  confidence: z.number().int().min(0).max(100).nullable(),
  latencyMs: z.number().int().min(0).max(600000).nullable(),
  status: z.enum(['finished', 'error', 'pending']),
});

const requestSchema = z.object({
  runUuid: z.string().trim().min(8).max(64),
  caseId: z.string().trim().max(80),
  caseText: z.string().trim().min(1).max(TRIAGE_REQUEST_MAX_CASE_LENGTH),
  reasoning: z.string().trim().max(40),
  blindedAtVote: z.boolean(),
  winnerSlug: z.string().trim().min(1).max(120),
  winnerLabel: z.string().trim().min(1).max(4),
  models: z.array(modelSnapshotSchema).min(2).max(12),
});

/**
 * Persist a user's "winner" pick for a blinded comparison run. Upserts on
 * (user_id, run_uuid) so re-saving the same run replaces the prior pick. 401 when
 * unauthenticated; 400 on bad input or a winner that is not one of the run's arms.
 */
export async function POST(req: Request) {
  try {
    const session = await verifyFreshSession();
    if (!session) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const body: unknown = await req.json();
    const input = requestSchema.parse(body);

    // The winner must be one of the run's arms and a recognized catalog slug.
    const winnerInRun = input.models.some(
      (model) => model.slug === input.winnerSlug,
    );
    if (!winnerInRun || !isKnownModelSlug(input.winnerSlug)) {
      return Response.json({ error: 'invalid_winner' }, { status: 400 });
    }

    const rows = await getSql()`
      INSERT INTO run_votes (
        user_id, run_uuid, case_id, case_text, reasoning,
        blinded_at_vote, winner_slug, winner_label, models
      )
      VALUES (
        ${userId}, ${input.runUuid}, ${input.caseId}, ${input.caseText}, ${input.reasoning},
        ${input.blindedAtVote}, ${input.winnerSlug}, ${input.winnerLabel},
        ${JSON.stringify(input.models)}::jsonb
      )
      ON CONFLICT (user_id, run_uuid) DO UPDATE SET
        case_id = EXCLUDED.case_id,
        case_text = EXCLUDED.case_text,
        reasoning = EXCLUDED.reasoning,
        blinded_at_vote = EXCLUDED.blinded_at_vote,
        winner_slug = EXCLUDED.winner_slug,
        winner_label = EXCLUDED.winner_label,
        models = EXCLUDED.models,
        updated_at = NOW()
      RETURNING id
    `;

    return Response.json({ id: Number(rows[0]?.id ?? 0), saved: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'invalid_vote' }, { status: 400 });
    }
    console.error('[votes] failed:', error);
    return Response.json({ error: 'vote_failed' }, { status: 500 });
  }
}
