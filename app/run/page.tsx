'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DisclaimerStrip } from '@/components/disclaimer-strip';
import { RunResults } from '@/components/run/run-results';
import { RunSidebar } from '@/components/run/run-sidebar';
import { TopBar } from '@/components/top-bar';
import {
  assembleCaseText,
  emptyCaseFields,
  type CaseFields,
} from '@/lib/cases';
import {
  getModelById,
  hasSubstitutionFootnote,
  type BlindLabel,
  type ModelConfig,
} from '@/lib/models';
import { getPendingRun } from '@/lib/run-store';
import { shuffleModels } from '@/lib/shuffle';
import type { ModelCardSlotState } from '@/lib/use-triage-stream';

// Stagger request starts so a burst of parallel gateway calls doesn't trip the
// known empty-stream-under-load failure; Gemini Flash gets an extra cushion.
function getModelStartDelayMs(model: ModelConfig, index: number): number {
  const baseDelay = index * 500;
  if (model.id === 'gemini-3.5-flash') {
    return baseDelay + 1000;
  }
  return baseDelay;
}

type ShuffledSlot = {
  model: ModelConfig;
  blindLabel: BlindLabel;
};

const EMPTY_SLOT_STATES: ModelCardSlotState[] = [];

export default function RunPage() {
  const router = useRouter();

  // `hydrated` gates the empty state so we don't flash it before the pending
  // run is read from sessionStorage in the mount effect below.
  const [hydrated, setHydrated] = useState(false);
  const [caseFields, setCaseFields] = useState<CaseFields>(() =>
    emptyCaseFields(),
  );
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [shuffledSlots, setShuffledSlots] = useState<ShuffledSlot[]>([]);
  const [runId, setRunId] = useState(0);
  const [revealModels, setRevealModels] = useState(false);
  const [slotStates, setSlotStates] = useState<
    Record<BlindLabel, ModelCardSlotState>
  >({});

  // Load the configured comparison once, then auto-start the run.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const pending = getPendingRun();
      if (pending) {
        const resolved = pending.modelIds
          .map((id) => getModelById(id))
          .filter((model): model is ModelConfig => model !== undefined);

        if (resolved.length >= 2) {
          setCaseFields(pending.caseFields);
          setModels(resolved);
          setShuffledSlots(shuffleModels(resolved));
          setRunId(1);
        }
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const caseText = useMemo(() => assembleCaseText(caseFields), [caseFields]);

  // Stable per-label handlers (see the same pattern's note in the setup page):
  // a fresh closure per render would refire each card's reporting effect →
  // setSlotStates → re-render → new ref → infinite loop. Cache by label string.
  const handlerCacheRef = useRef<
    Map<BlindLabel, (state: ModelCardSlotState) => void>
  >(new Map());
  const getStableHandler = useCallback((label: BlindLabel) => {
    const cache = handlerCacheRef.current;
    if (!cache.has(label)) {
      cache.set(label, (state: ModelCardSlotState) => {
        setSlotStates((previous) => ({ ...previous, [label]: state }));
      });
    }
    return cache.get(label)!;
  }, []);

  const slotStateList = useMemo<ModelCardSlotState[]>(() => {
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

  // A slot counts as running until it is terminal (finished OR errored). Do NOT
  // derive this from per-card `isLoading`: a card sitting in its stagger delay
  // (or in the brief mount tick before its submit fires) reports isLoading:false
  // while not yet started, which would falsely flip the run to "complete" — and
  // un-gate Reveal / Run again mid-flight, breaking blinding.
  const isRunning =
    runId > 0 &&
    slotStateList.some((slot) => !slot.finished && slot.error === undefined);
  const finishedCount = slotStateList.filter((slot) => slot.finished).length;

  const substitutionFootnote = models.find(hasSubstitutionFootnote)?.footnote;

  const handleRunAgain = useCallback(() => {
    setRevealModels(false);
    setSlotStates({});
    setShuffledSlots(shuffleModels(models));
    setRunId((current) => current + 1);
  }, [models]);

  const handleEdit = useCallback(() => {
    router.push('/');
  }, [router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-full flex-col">
        <TopBar mode="Side by side" />
        <DisclaimerStrip />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <h1 className="font-['Newsreader',Georgia,serif] text-2xl font-light tracking-tight text-[#2E2B29]">
              Preparing comparison
            </h1>
            <p className="text-sm leading-relaxed text-[#67625B]">
              Loading the staged case and selected models.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Nothing staged (e.g. direct navigation to /run) — guide back to setup.
  if (hydrated && shuffledSlots.length === 0) {
    return (
      <div className="flex min-h-full flex-col">
        <TopBar mode="Side by side" />
        <DisclaimerStrip />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <h1 className="font-['Newsreader',Georgia,serif] text-2xl font-light tracking-tight text-[#2E2B29]">
              No comparison configured
            </h1>
            <p className="text-sm leading-relaxed text-[#67625B]">
              Pick the models and prepare a synthetic case to start a blinded
              side-by-side triage.
            </p>
            <button
              type="button"
              onClick={handleEdit}
              className="h-9 rounded-[12px] bg-[#2E2B29] px-5 text-sm font-medium text-white transition-colors hover:bg-[#2E2B29]/90"
            >
              Set up a comparison
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col md:h-dvh md:min-h-0 md:overflow-hidden">
      <TopBar mode="Side by side" isRunning={isRunning} />
      <DisclaimerStrip />

      <main className="flex flex-1 flex-col md:min-h-0 md:flex-row md:overflow-hidden">
        <h1 className="sr-only">Blinded side-by-side IR triage comparison</h1>
        <RunSidebar
          slots={slotStateList}
          revealModels={revealModels}
          onRevealChange={setRevealModels}
          onRunAgain={handleRunAgain}
          onEdit={handleEdit}
          isRunning={isRunning}
          finishedCount={finishedCount}
          total={shuffledSlots.length}
        />

        <div className="min-w-0 flex-1 md:overflow-y-auto">
          {hydrated ? (
            <RunResults
              caseFields={caseFields}
              shuffledSlots={shuffledSlots}
              slotStateList={slotStateList}
              revealModels={revealModels}
              caseText={caseText}
              runId={runId}
              getStartDelayMs={getModelStartDelayMs}
              getStableHandler={getStableHandler}
              substitutionFootnote={substitutionFootnote}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
