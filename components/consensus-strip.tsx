'use client';

import { DecisionBadge } from '@/components/decision-badge';
import type { ModelCardSlotState } from '@/lib/use-triage-stream';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BlindLabel } from '@/lib/models';
import {
  computeConsensus,
  shouldShowConsensus,
  type ConsensusField,
  type ConsensusRow,
} from '@/lib/consensus';
import type { TriageResult } from '@/lib/schema';
import { cn } from '@/lib/utils';

interface ConsensusStripProps {
  slots: ModelCardSlotState[];
}

const FIELD_LABELS: Record<ConsensusField, string> = {
  decision: 'Decision',
  urgency: 'Urgency',
  targetVessel: 'Target vessel',
  embolicAgent: 'Embolic agent',
};

const URGENCY_LABELS: Record<TriageResult['urgency'], string> = {
  IMMEDIATE: 'Immediate',
  URGENT_2H: 'Urgent (2h)',
  SEMI_ELECTIVE: 'Semi-elective',
};

function formatCellValue(field: ConsensusField, value: string | undefined) {
  if (!value) {
    return '—';
  }

  if (field === 'decision') {
    const decision = value as TriageResult['decision'];
    if (
      decision === 'EMBOLIZATION' ||
      decision === 'SURGERY' ||
      decision === 'CONSERVATIVE' ||
      decision === 'IMAGING_FIRST'
    ) {
      return <DecisionBadge decision={decision} />;
    }
  }

  if (field === 'urgency') {
    const urgency = value as TriageResult['urgency'];
    if (urgency in URGENCY_LABELS) {
      return URGENCY_LABELS[urgency];
    }
  }

  return value;
}

function isAgreedCell(row: ConsensusRow, label: BlindLabel): boolean {
  return row.agreed && row.values[label] !== undefined;
}

export function ConsensusStrip({ slots }: ConsensusStripProps) {
  const finishedCount = slots.filter((slot) => slot.finished).length;
  const labels: BlindLabel[] = slots.map((slot) => slot.blindLabel);

  if (!shouldShowConsensus(finishedCount)) {
    return null;
  }

  const rows = computeConsensus(
    slots.map((slot) => ({
      label: slot.blindLabel,
      result: slot.object as TriageResult | undefined,
      finished: slot.finished,
    })),
  );

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[14px] border border-[#EEEDEC] bg-white">
        <div className="border-b border-[#EEEDEC] px-4 py-3">
          <h2 className="text-sm font-medium text-[#2E2B29]">Agreement</h2>
          <p className="mt-0.5 text-xs text-[#67625B]">
            {finishedCount} of {slots.length} schema-valid responses finished —
            exact matches highlighted
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-[#EEEDEC] hover:bg-transparent">
              <TableHead className="h-9 text-xs text-[#67625B]">Field</TableHead>
              {labels.map((label) => (
                <TableHead
                  key={label}
                  className="h-9 text-center text-xs text-[#67625B]"
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.field} className="border-[#EEEDEC]">
                <TableCell className="text-xs font-medium text-[#67625B]">
                  {FIELD_LABELS[row.field]}
                </TableCell>
                {labels.map((label) => (
                  <TableCell
                    key={`${row.field}-${label}`}
                    className={cn(
                      'text-center text-sm text-[#2E2B29]',
                      isAgreedCell(row, label) && 'bg-[#EDF3EC]',
                    )}
                  >
                    {formatCellValue(row.field, row.values[label])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
