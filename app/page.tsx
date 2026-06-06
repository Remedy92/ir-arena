'use client';

import { useCallback, useMemo, useState } from 'react';

import { CaseInput } from '@/components/case-input';
import { ConsensusStrip } from '@/components/consensus-strip';
import { DisclaimerStrip } from '@/components/disclaimer-strip';
import { Hero } from '@/components/hero';
import {
  ModelCard,
  type ModelCardSlotState,
} from '@/components/model-card';
import { TopBar } from '@/components/top-bar';
import { PRESET_CASES } from '@/lib/cases';
import type { BlindLabel, ModelConfig } from '@/lib/models';
import { hasSubstitutionFootnote, MODELS } from '@/lib/models';
import { shuffleModels } from '@/lib/shuffle';

const DEFAULT_PRESET = PRESET_CASES[1];

type ShuffledSlot = {
  model: ModelConfig;
  blindLabel: BlindLabel;
};

const EMPTY_SLOT_STATES: ModelCardSlotState[] = [];

export default function Home() {
  const [caseText, setCaseText] = useState(DEFAULT_PRESET.vignette);
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET.id);
  const [revealModels, setRevealModels] = useState(false);
  const [runId, setRunId] = useState(0);
  const [shuffledSlots, setShuffledSlots] = useState<ShuffledSlot[]>([]);
  const [slotStates, setSlotStates] = useState<
    Record<BlindLabel, ModelCardSlotState>
  >({} as Record<BlindLabel, ModelCardSlotState>);

  const handlePresetChange = useCallback((presetId: string) => {
    const preset = PRESET_CASES.find((item) => item.id === presetId);
    if (preset) {
      setSelectedPresetId(presetId);
      setCaseText(preset.vignette);
    }
  }, []);

  const handleRun = useCallback(() => {
    setRevealModels(false);
    setShuffledSlots(shuffleModels(MODELS));
    setSlotStates({} as Record<BlindLabel, ModelCardSlotState>);
    setRunId((current) => current + 1);
  }, []);

  const makeSlotStateHandler = useCallback(
    (blindLabel: BlindLabel) => (state: ModelCardSlotState) => {
      setSlotStates((previous) => ({
        ...previous,
        [blindLabel]: state,
      }));
    },
    [],
  );

  const slotStateList = useMemo(() => {
    if (shuffledSlots.length === 0) {
      return EMPTY_SLOT_STATES;
    }

    return shuffledSlots.map(
      (slot) =>
        slotStates[slot.blindLabel] ?? {
          blindLabel: slot.blindLabel,
          model: slot.model,
          object: undefined,
          isLoading: runId > 0,
          error: undefined,
          latencyMs: undefined,
          finished: false,
        },
    );
  }, [shuffledSlots, slotStates, runId]);

  const isRunning = slotStateList.some((slot) => slot.isLoading);

  const substitutionFootnote = MODELS.find(hasSubstitutionFootnote)?.footnote;

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        revealModels={revealModels}
        onRevealChange={setRevealModels}
        isRunning={isRunning}
      />
      <DisclaimerStrip />

      <main className="flex-1">
        <Hero />
        <CaseInput
          caseText={caseText}
          onCaseTextChange={setCaseText}
          selectedPresetId={selectedPresetId}
          onPresetChange={handlePresetChange}
          onRun={handleRun}
          isRunning={isRunning}
        />

        {runId > 0 && shuffledSlots.length > 0 ? (
          <section className="mx-auto w-full max-w-7xl px-4 pb-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {shuffledSlots.map((slot) => (
                <ModelCard
                  key={`${slot.blindLabel}-${runId}`}
                  blindLabel={slot.blindLabel}
                  model={slot.model}
                  revealModels={revealModels}
                  caseText={caseText}
                  runId={runId}
                  onStateChange={makeSlotStateHandler(slot.blindLabel)}
                />
              ))}
            </div>

            {substitutionFootnote ? (
              <p className="mt-4 text-center text-[11px] text-[#67625B]">
                {substitutionFootnote}
              </p>
            ) : null}
          </section>
        ) : null}

        <ConsensusStrip slots={slotStateList} />
      </main>
    </div>
  );
}