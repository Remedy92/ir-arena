import { z } from 'zod';

export const triageSchema = z.object({
  decision: z.enum(['EMBOLIZATION', 'SURGERY', 'CONSERVATIVE', 'IMAGING_FIRST']),
  urgency: z.enum(['IMMEDIATE', 'URGENT_2H', 'SEMI_ELECTIVE']),
  targetVessel: z.string().describe('Most likely culprit vessel, anatomic name'),
  embolicAgent: z.string().describe('Preferred agent/device, or n/a'),
  alternativePlan: z.string(),
  rationale: z.string().describe('3-4 sentences, clinical reasoning'),
  redFlags: z.array(z.string()).max(4),
  confidence: z.number().min(0).max(100),
});

export type TriageResult = z.infer<typeof triageSchema>;
export type TriagePartial = Partial<TriageResult>;

export const triageRequestSchema = z.object({
  case: z.string().min(10),
  model: z.string().min(3),
});