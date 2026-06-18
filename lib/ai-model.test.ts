import { describe, expect, it } from 'vitest';

import { extractFirstJsonObject } from './ai-model';

describe('extractFirstJsonObject', () => {
  it('keeps plain JSON unchanged', () => {
    expect(extractFirstJsonObject('{"ok":"OK"}')).toBe('{"ok":"OK"}');
  });

  it('strips markdown fences', () => {
    expect(extractFirstJsonObject('```json\n{"ok":"OK"}\n```')).toBe(
      '{"ok":"OK"}',
    );
  });

  it('extracts a JSON object after model prose', () => {
    expect(
      extractFirstJsonObject('Here is the JSON requested:\n{"ok":"OK"}'),
    ).toBe('{"ok":"OK"}');
  });

  it('handles braces inside JSON strings', () => {
    expect(
      extractFirstJsonObject('Result: {"rationale":"brace } in text","ok":"OK"}'),
    ).toBe('{"rationale":"brace } in text","ok":"OK"}');
  });
});
