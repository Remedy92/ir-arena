import type { BlindLabel } from './models';
import type { TriageResult } from './schema';

export type ConsensusField =
  | 'decision'
  | 'urgency'
  | 'targetVessel'
  | 'embolicAgent';

export interface ConsensusInput {
  label: BlindLabel;
  result: TriageResult | undefined;
  finished: boolean;
}

export interface ConsensusRow {
  field: ConsensusField;
  values: Record<BlindLabel, string | undefined>;
  agreed: boolean;
}

const CONSENSUS_FIELDS: ConsensusField[] = [
  'decision',
  'urgency',
  'targetVessel',
  'embolicAgent',
];

const ENUM_FIELDS = new Set<ConsensusField>(['decision', 'urgency']);

function normalizeForAgreement(field: ConsensusField, value: string): string {
  if (ENUM_FIELDS.has(field)) {
    return value;
  }
  return value.trim().toLowerCase();
}

function valuesAgree(
  field: ConsensusField,
  values: Record<BlindLabel, string | undefined>,
): boolean {
  const defined = Object.values(values).filter(
    (value): value is string => value !== undefined,
  );

  if (defined.length < 2) {
    return false;
  }

  const normalized = defined.map((value) =>
    normalizeForAgreement(field, value),
  );

  return normalized.every((value) => value === normalized[0]);
}

export function computeConsensus(results: ConsensusInput[]): ConsensusRow[] {
  return CONSENSUS_FIELDS.map((field) => {
    const values: Record<BlindLabel, string | undefined> = {};

    for (const { label, result, finished } of results) {
      values[label] =
        finished && result !== undefined ? result[field] : undefined;
    }

    return {
      field,
      values,
      agreed: valuesAgree(field, values),
    };
  });
}

export function shouldShowConsensus(finishedCount: number): boolean {
  return finishedCount >= 2;
}