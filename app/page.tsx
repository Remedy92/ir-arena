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
import {
  assembleCaseText,
  PRESET_CASES,
  presetToCaseFields,
  type CaseField,
  type CaseFields,
} from '@/lib/cases';
import type { BlindLabel, ModelConfig } from '@/lib/models';
import { hasSubstitutionFootnote, MODELS } from '@/lib/models';
import { shuffleModels } from '@/lib/shuffle';

const DEFAULT_PRESET = PRESET_CASES[1];

function getModelStartDelayMs(model: ModelConfig, index: number): number {
  const baseDelay = index * 500;
  if (model.id === 'gemini') {
    return baseDelay + 1000;
  }
  return baseDelay;
}

type ShuffledSlot = {
  model: ModelConfig;
  blindLabel: BlindLabel;
};

const EMPTY_SLOT_STATES: ModelCardSlotState[] = [];

export default function Home() {
  const [caseFields, setCaseFields] = useState<CaseFields>(() =>
    presetToCaseFields(DEFAULT_PRESET),
  );
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET.id);
  const [revealModels, setRevealModels] = useState(false);
  const [runId, setRunId] = useState(0);
  const [shuffledSlots, setShuffledSlots] = useState<ShuffledSlot[]>([]);
  const [slotStates, setSlotStates] = useState<
    Record<BlindLabel, ModelCardSlotState>
  >({} as Record<BlindLabel, ModelCardSlotState>);

  // The triage API takes a single case string, so the structured fields are
  // folded into one labeled prompt (empties omitted) before sending.
  const caseText = useMemo(() => assembleCaseText(caseFields), [caseFields]);
  const canRun = caseText.trim().length >= 10;

  const handleFieldChange = useCallback((field: CaseField, value: string) => {
    setCaseFields((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handlePresetChange = useCallback((presetId: string) => {
    const preset = PRESET_CASES.find((item) => item.id === presetId);
    if (preset) {
      setSelectedPresetId(presetId);
      setCaseFields(presetToCaseFields(preset));
    }
  }, []);

  const handleRun = useCallback(() => {
    setRevealModels(false);
    setShuffledSlots(shuffleModels(MODELS));
    setSlotStates({} as Record<BlindLabel, ModelCardSlotState>);
    setRunId((current) => current + 1);
  }, []);

  // Stable per-label handlers. Creating a fresh closure per render (the prior
  // `makeSlotStateHandler(label)` call site) gave each ModelCard a new
  // onStateChange ref every render; the card's state-reporting effect lists it
  // as a dependency, so it refired → setSlotStates → re-render → new ref → …,
  // an infinite update loop the moment a run started. Keying stable handlers by
  // the fixed A–D labels breaks that cycle.
  const slotStateHandlers = useMemo(() => {
    const labels: BlindLabel[] = ['A', 'B', 'C', 'D'];
    return labels.reduce(
      (handlers, blindLabel) => {
        handlers[blindLabel] = (state: ModelCardSlotState) => {
          setSlotStates((previous) => ({
            ...previous,
            [blindLabel]: state,
          }));
        };
        return handlers;
      },
      {} as Record<BlindLabel, (state: ModelCardSlotState) => void>,
    );
  }, []);

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
          fields={caseFields}
          onFieldChange={handleFieldChange}
          canRun={canRun}
          selectedPresetId={selectedPresetId}
          onPresetChange={handlePresetChange}
          onRun={handleRun}
          isRunning={isRunning}
        />

        {runId > 0 && shuffledSlots.length > 0 ? (
          <section className="mx-auto w-full max-w-7xl px-4 pb-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {shuffledSlots.map((slot, index) => (
                <ModelCard
                  key={`${slot.blindLabel}-${runId}`}
                  blindLabel={slot.blindLabel}
                  model={slot.model}
                  revealModels={revealModels}
                  caseText={caseText}
                  runId={runId}
                  startDelayMs={getModelStartDelayMs(slot.model, index)}
                  onStateChange={slotStateHandlers[slot.blindLabel]}
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