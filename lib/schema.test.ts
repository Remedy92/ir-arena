import { describe, expect, it } from 'vitest';

import { triageRequestSchema } from './schema';

describe('triageRequestSchema', () => {
  it('accepts known model slugs with cases inside the study bounds', () => {
    const parsed = triageRequestSchema.parse({
      case: 'Patient: 34-year-old woman with pelvic trauma',
      model: 'openai/gpt-5.5',
    });

    expect(parsed.model).toBe('openai/gpt-5.5');
  });

  it('rejects cases over 8000 characters', () => {
    expect(() =>
      triageRequestSchema.parse({
        case: 'x'.repeat(8001),
        model: 'openai/gpt-5.5',
      }),
    ).toThrow();
  });

  it('rejects unknown gateway slugs', () => {
    expect(() =>
      triageRequestSchema.parse({
        case: 'Patient: 34-year-old woman with pelvic trauma',
        model: 'unknown/model',
      }),
    ).toThrow();
  });
});
