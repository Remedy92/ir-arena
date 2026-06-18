import { describe, expect, it } from 'vitest';

import { computeConsensus, shouldShowConsensus } from './consensus';
import type { TriageResult } from './schema';

const baseResult: TriageResult = {
  decision: 'EMBOLIZATION',
  urgency: 'IMMEDIATE',
  targetVessel: 'Left internal iliac branch',
  embolicAgent: 'Gelfoam',
  alternativePlan: 'Surgery if embolization fails',
  rationale: 'Active arterial hemorrhage with instability.',
  redFlags: ['Shock'],
  confidence: 85,
};

describe('consensus', () => {
  it('only shows consensus once at least two schema-valid responses finish', () => {
    expect(shouldShowConsensus(1)).toBe(false);
    expect(shouldShowConsensus(2)).toBe(true);
  });

  it('excludes unfinished or schema-invalid slots from agreement values', () => {
    const rows = computeConsensus([
      { label: 'A', result: baseResult, finished: true },
      { label: 'B', result: { ...baseResult }, finished: true },
      { label: 'C', result: undefined, finished: false },
    ]);

    const decision = rows.find((row) => row.field === 'decision');
    expect(decision?.agreed).toBe(true);
    expect(decision?.values).toEqual({
      A: 'EMBOLIZATION',
      B: 'EMBOLIZATION',
      C: undefined,
    });
  });
});
