'use client';

import { AnimatePresence, motion, MotionConfig } from 'motion/react';

import { CasePrompt } from '@/components/run/case-prompt';
import { LiveModelCard } from '@/components/run/model-card';
import { ConsensusStrip } from '@/components/consensus-strip';
import type { CaseFields } from '@/lib/cases';
import type { BlindLabel, ModelConfig } from '@/lib/models';
import type { ModelCardSlotState } from '@/lib/use-triage-stream';

interface ArenaSlot {
  model: ModelConfig;
  blindLabel: BlindLabel;
}

interface RunResultsProps {
  caseFields: CaseFields;
  shuffledSlots: ArenaSlot[];
  slotStateList: ModelCardSlotState[];
  revealModels: boolean;
  caseText: string;
  runId: number;
  getStartDelayMs: (model: ModelConfig, index: number) => number;
  getStableHandler: (label: BlindLabel) => (state: ModelCardSlotState) => void;
  substitutionFootnote?: string;
}

/** Pick a column count that keeps cards comfortably wide for any N. */
function gridColsClass(n: number): string {
  if (n <= 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-1 lg:grid-cols-2';
  if (n === 3) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
  if (n === 4) return 'grid-cols-1 md:grid-cols-2';
  if (n <= 6) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
  return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
}

export function RunResults({
  caseFields,
  shuffledSlots,
  slotStateList,
  revealModels,
  caseText,
  runId,
  getStartDelayMs,
  getStableHandler,
  substitutionFootnote,
}: RunResultsProps) {
  const total = shuffledSlots.length;

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
        <CasePrompt fields={caseFields} />

        {/* Card grid */}
        <motion.div layout className={`grid gap-4 ${gridColsClass(total)}`}>
          <AnimatePresence>
            {shuffledSlots.map((slot, index) => (
              <LiveModelCard
                key={`${slot.blindLabel}-${runId}`}
                blindLabel={slot.blindLabel}
                model={slot.model}
                revealModels={revealModels}
                caseText={caseText}
                runId={runId}
                slotIndex={index}
                startDelayMs={getStartDelayMs(slot.model, index)}
                onStateChange={getStableHandler(slot.blindLabel)}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {substitutionFootnote ? (
          <p className="text-center text-[11px] text-[#67625B]">
            {substitutionFootnote}
          </p>
        ) : null}

        <ConsensusStrip slots={slotStateList} />
      </div>
    </MotionConfig>
  );
}
