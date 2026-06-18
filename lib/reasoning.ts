import type { LanguageModelCallOptions } from 'ai';

export const REASONING_EFFORTS = [
  'provider-default',
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
] as const satisfies readonly NonNullable<
  LanguageModelCallOptions['reasoning']
>[];

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export const DEFAULT_REASONING_EFFORT: ReasoningEffort = 'provider-default';

export const REASONING_EFFORT_OPTIONS: Array<{
  value: ReasoningEffort;
  label: string;
  description: string;
}> = [
  {
    value: 'provider-default',
    label: 'Provider default',
    description: 'Native behavior',
  },
  { value: 'none', label: 'None', description: 'No extra reasoning' },
  { value: 'minimal', label: 'Minimal', description: 'Smallest budget' },
  { value: 'low', label: 'Low', description: 'Faster calls' },
  { value: 'medium', label: 'Medium', description: 'Balanced' },
  { value: 'high', label: 'High', description: 'More depth' },
  { value: 'xhigh', label: 'Max', description: 'Largest budget' },
];

const REASONING_EFFORT_SET = new Set<string>(REASONING_EFFORTS);

export function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return typeof value === 'string' && REASONING_EFFORT_SET.has(value);
}

export function coerceReasoningEffort(value: unknown): ReasoningEffort {
  return isReasoningEffort(value) ? value : DEFAULT_REASONING_EFFORT;
}

export function getReasoningEffortLabel(value: ReasoningEffort): string {
  return (
    REASONING_EFFORT_OPTIONS.find((option) => option.value === value)?.label ??
    'Provider default'
  );
}
