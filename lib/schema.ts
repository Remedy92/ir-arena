import { z } from 'zod';

const DECISIONS = [
  'EMBOLIZATION',
  'SURGERY',
  'CONSERVATIVE',
  'IMAGING_FIRST',
] as const;

const URGENCIES = ['IMMEDIATE', 'URGENT_2H', 'SEMI_ELECTIVE'] as const;

type Decision = (typeof DECISIONS)[number];
type Urgency = (typeof URGENCIES)[number];

const SNAKE_CASE_ALIASES: Record<string, keyof TriageResultShape> = {
  target_vessel: 'targetVessel',
  embolic_agent: 'embolicAgent',
  red_flags: 'redFlags',
  alternative_plan: 'alternativePlan',
};

interface TriageResultShape {
  decision: Decision;
  urgency: Urgency;
  targetVessel: string;
  embolicAgent: string;
  alternativePlan: string;
  rationale: string;
  redFlags: string[];
  confidence: number;
}

function inferDecisionFromText(text: string): Decision | undefined {
  const lower = text.toLowerCase();
  if (lower.includes('embol')) return 'EMBOLIZATION';
  if (lower.includes('surg')) return 'SURGERY';
  if (lower.includes('conserv') || lower.includes('observ')) {
    return 'CONSERVATIVE';
  }
  if (lower.includes('imag') || lower.includes('cta') || lower.includes('ct ')) {
    return 'IMAGING_FIRST';
  }
  return undefined;
}

function inferUrgencyFromText(text: string): Urgency | undefined {
  const lower = text.toLowerCase();
  if (
    lower.includes('immediate') ||
    lower === 'high' ||
    lower.includes('emergent')
  ) {
    return 'IMMEDIATE';
  }
  if (lower.includes('urgent') || lower.includes('2h') || lower.includes('2 h')) {
    return 'URGENT_2H';
  }
  if (
    lower.includes('semi') ||
    lower.includes('elective') ||
    lower === 'medium' ||
    lower === 'low'
  ) {
    return 'SEMI_ELECTIVE';
  }
  return undefined;
}

function normalizeConfidence(value: unknown): number | undefined {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : Number.NaN;

  if (Number.isNaN(numeric)) {
    return undefined;
  }

  if (numeric > 0 && numeric <= 1) {
    return Math.round(numeric * 100);
  }

  return Math.round(Math.min(100, Math.max(0, numeric)));
}

function normalizeEnumToken(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  return value.trim().toUpperCase().replace(/\s+/g, '_');
}

function normalizeTriageInput(input: unknown): unknown {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return input;
  }

  const raw = input as Record<string, unknown>;
  const normalized: Record<string, unknown> = { ...raw };

  for (const [snake, camel] of Object.entries(SNAKE_CASE_ALIASES)) {
    if (raw[snake] !== undefined && normalized[camel] === undefined) {
      normalized[camel] = raw[snake];
    }
  }

  if (typeof normalized.decision === 'string') {
    const token = normalizeEnumToken(normalized.decision);
    if (token && DECISIONS.includes(token as Decision)) {
      normalized.decision = token;
    }
  }

  if (typeof normalized.urgency === 'string') {
    const token = normalizeEnumToken(normalized.urgency);
    if (token && URGENCIES.includes(token as Urgency)) {
      normalized.urgency = token;
    }
  }

  if (normalized.decision === undefined) {
    const intervention = String(raw.intervention ?? raw.management ?? '');
    const inferred = inferDecisionFromText(intervention);
    if (inferred) {
      normalized.decision = inferred;
    }
  }

  if (normalized.urgency === undefined) {
    const priority = String(raw.priority ?? raw.urgency_level ?? '');
    const inferred = inferUrgencyFromText(priority);
    if (inferred) {
      normalized.urgency = inferred;
    }
  }

  if (
    normalized.rationale === undefined &&
    typeof raw.management_strategy === 'string'
  ) {
    normalized.rationale = raw.management_strategy;
  }

  if (
    normalized.rationale === undefined &&
    typeof raw.diagnosis === 'string' &&
    typeof raw.intervention === 'string'
  ) {
    normalized.rationale = `${raw.diagnosis}. Recommended intervention: ${raw.intervention}.`;
  }

  if (normalized.alternativePlan === undefined) {
    const fallback = raw.management_strategy ?? raw.intervention;
    if (typeof fallback === 'string' && fallback.length > 0) {
      normalized.alternativePlan = `If primary plan fails: escalate to surgery or repeat imaging. Original plan: ${fallback}`;
    }
  }

  if (typeof normalized.redFlags === 'string') {
    normalized.redFlags = [normalized.redFlags];
  }

  if (Array.isArray(normalized.redFlags)) {
    normalized.redFlags = normalized.redFlags
      .filter((flag): flag is string => typeof flag === 'string' && flag.length > 0)
      .slice(0, 4);
  }

  const confidence = normalizeConfidence(normalized.confidence);
  if (confidence !== undefined) {
    normalized.confidence = confidence;
  }

  return normalized;
}

const triageObjectSchema = z.object({
  decision: z.enum(DECISIONS),
  urgency: z.enum(URGENCIES),
  targetVessel: z.string().describe('Most likely culprit vessel, anatomic name'),
  embolicAgent: z.string().describe('Preferred agent/device, or n/a'),
  alternativePlan: z.string(),
  rationale: z.string().describe('3-4 sentences, clinical reasoning'),
  redFlags: z.array(z.string()).max(4),
  confidence: z.coerce.number().min(0).max(100),
});

/** Server-side: preprocess snake_case / Gemma aliases before validation */
export const triageSchema = z.preprocess(
  normalizeTriageInput,
  triageObjectSchema,
);

/** Client-side: same preprocess so useObject final validation matches server tolerance */
export const triageClientSchema = triageSchema;

export type TriageResult = z.infer<typeof triageObjectSchema>;
export type TriagePartial = Partial<TriageResult>;

export const triageRequestSchema = z.object({
  case: z.string().min(10),
  model: z.string().min(3),
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