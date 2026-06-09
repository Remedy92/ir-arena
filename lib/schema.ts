import { z } from 'zod';

import { isKnownModelSlug } from './models';

const DECISIONS = [
  'EMBOLIZATION',
  'SURGERY',
  'CONSERVATIVE',
  'IMAGING_FIRST',
] as const;

const URGENCIES = ['IMMEDIATE', 'URGENT_2H', 'SEMI_ELECTIVE'] as const;

const nonEmptyStudyString = z.string().trim().min(1);

const triageObjectSchema = z
  .object({
    decision: z
      .enum(DECISIONS)
      .describe('Primary management category selected for this vignette'),
    urgency: z
      .enum(URGENCIES)
      .describe('Recommended time sensitivity for the primary plan'),
    targetVessel: nonEmptyStudyString.describe(
      'Most likely culprit vessel or vascular territory; use n/a only when not inferable or not applicable',
    ),
    embolicAgent: nonEmptyStudyString.describe(
      'Preferred embolic material/device; use n/a when embolization is not recommended or not inferable',
    ),
    alternativePlan: nonEmptyStudyString.describe(
      'Clinically plausible fallback plan if the primary recommendation is not feasible or fails',
    ),
    rationale: nonEmptyStudyString.describe(
      'Concise justification based only on the case vignette; do not include hidden chain-of-thought',
    ),
    redFlags: z
      .array(nonEmptyStudyString)
      .max(4)
      .describe('Up to four findings that increase risk or change management'),
    confidence: z
      .number()
      .int()
      .min(0)
      .max(100)
      .describe('Integer confidence in the recommendation, where 0 is none and 100 is maximal'),
  })
  .strict();

/** Server/client validation is intentionally strict for study use. */
export const triageSchema = triageObjectSchema;
export const triageClientSchema = triageSchema;

export type TriageResult = z.infer<typeof triageObjectSchema>;
export type TriagePartial = Partial<TriageResult>;

/**
 * Display-only cast for streamed partials. Deliberately does not repair keys,
 * infer decisions, or fill missing fields; schema drift is a study outcome.
 */
export function normalizeTriagePartial(input: unknown): TriagePartial | undefined {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return input as TriagePartial | undefined;
  }

  return input as TriagePartial;
}

export const triageRequestSchema = z.object({
  case: z.string().trim().min(10).max(8000),
  model: z
    .string()
    .trim()
    .refine(isKnownModelSlug, { message: 'Unsupported model slug' }),
});

export function formatConfidencePercent(
  confidence: number | undefined,
): number | undefined {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
    return undefined;
  }

  if (confidence > 0 && confidence <= 1) {
    return Math.round(confidence * 100);
  }

  return Math.round(confidence);
}
