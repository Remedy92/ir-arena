import { describe, expect, it } from 'vitest';

import { formatDisplayError } from './use-triage-stream';

describe('formatDisplayError', () => {
  it('classifies invalid request bodies separately from retryable model failures', () => {
    expect(formatDisplayError(new Error('Invalid triage request'))).toContain(
      'Invalid triage request',
    );
  });

  it('classifies budget rejections clearly', () => {
    expect(formatDisplayError(new Error('budget_exceeded'))).toContain(
      'Spend cap reached',
    );
  });
});
