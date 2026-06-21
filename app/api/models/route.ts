import { gateway } from 'ai';

import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from '@/lib/auth/rate-limit';
import { MODEL_SLUGS } from '@/lib/models';

// Node.js runtime to match the rest of the gateway-backed routes.
export const runtime = 'nodejs';

/**
 * Advisory availability check for the model picker. Reports which catalog slugs
 * the configured AI Gateway key can currently reach. This does NOT widen the
 * server whitelist used by /api/triage — it only informs the UI. Fails open
 * (returns the full catalog) when no key is configured or the gateway is
 * unreachable, so the picker is never left empty in local dev.
 */
export async function GET(req: Request) {
  const ipLimit = checkRateLimit(`models:${getClientIp(req)}`, {
    max: 30,
    windowMs: 60_000,
  });
  if (!ipLimit.ok) {
    return rateLimitResponse(ipLimit.retryAfterMs);
  }

  try {
    const { models } = await gateway.getAvailableModels();
    const catalog = new Set(MODEL_SLUGS);
    const available = models
      .map((model) => model.id)
      .filter((id) => catalog.has(id));

    return Response.json({ available });
  } catch {
    return Response.json({ available: MODEL_SLUGS });
  }
}
