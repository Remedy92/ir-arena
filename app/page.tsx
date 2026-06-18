'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

import { CaseInput } from '@/components/case-input';
import { DisclaimerStrip } from '@/components/disclaimer-strip';
import { ModelPicker } from '@/components/model-picker';
import { ReasoningControl } from '@/components/reasoning-control';
import { TopBar } from '@/components/top-bar';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/client';
import {
  assembleCaseText,
  getCaseDisplay,
  PRESET_CASES,
  presetToCaseFields,
  type CaseField,
  type CaseFields,
} from '@/lib/cases';
import { hasSubstitutionFootnote } from '@/lib/models';
import {
  defaultPendingRunReasoning,
  getPendingRun,
  setPendingRun,
} from '@/lib/run-store';
import {
  getReasoningEffortLabel,
  type ReasoningEffort,
} from '@/lib/reasoning';
import {
  TRIAGE_REQUEST_MAX_CASE_LENGTH,
  TRIAGE_REQUEST_MIN_CASE_LENGTH,
} from '@/lib/schema';
import { useSelectedModels } from '@/lib/use-selected-models';
import { cn } from '@/lib/utils';

const DEFAULT_PRESET = PRESET_CASES[1];

type SetupStep = 'case' | 'models';

export default function SetupPage() {
  const router = useRouter();

  const [step, setStep] = useState<SetupStep>('case');
  const [caseFields, setCaseFields] = useState<CaseFields>(() =>
    presetToCaseFields(DEFAULT_PRESET),
  );
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET.id);
  const [reasoning, setReasoning] = useState<ReasoningEffort>(() =>
    defaultPendingRunReasoning(),
  );
  const [selectedModels, setSelectedModels] = useSelectedModels();
  const { data: session } = authClient.useSession();

  // Restore the last configured case when returning from the run page via
  // "Edit comparison" (models are restored separately from localStorage).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const pending = getPendingRun();
      if (pending) {
        setCaseFields(pending.caseFields);
        if (pending.presetId) {
          setSelectedPresetId(pending.presetId);
        }
        setReasoning(pending.reasoning);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const caseText = useMemo(() => assembleCaseText(caseFields), [caseFields]);
  const caseLength = caseText.trim().length;
  const hasEnoughModels = selectedModels.length >= 2;
  const isCaseTooShort = caseLength < TRIAGE_REQUEST_MIN_CASE_LENGTH;
  const isCaseTooLong = caseLength > TRIAGE_REQUEST_MAX_CASE_LENGTH;
  const isCaseValid = !isCaseTooShort && !isCaseTooLong;
  const canRun = hasEnoughModels && isCaseValid;

  const caseBlockReason = isCaseTooLong
    ? `Case is ${caseLength.toLocaleString()} characters after trimming. Keep it at ${TRIAGE_REQUEST_MAX_CASE_LENGTH.toLocaleString()} or fewer.`
    : isCaseTooShort
      ? `Add at least ${TRIAGE_REQUEST_MIN_CASE_LENGTH} characters of case detail to continue.`
      : undefined;
  const modelsBlockReason = !hasEnoughModels
    ? 'Select at least 2 models to run.'
    : undefined;

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
    if (!canRun) {
      return;
    }
    setPendingRun({
      caseFields,
      presetId: selectedPresetId,
      modelIds: selectedModels.map((model) => model.id),
      reasoning,
    });
    // Run is gated. If signed out, go straight to sign-in with an explicit
    // staged-run callback request instead of pushing /run and bouncing off the
    // proxy. The pending run survives the OAuth round-trip in sessionStorage.
    router.push(session ? '/run' : '/sign-in?callbackURL=%2Frun');
  }, [
    canRun,
    caseFields,
    selectedPresetId,
    selectedModels,
    reasoning,
    router,
    session,
  ]);

  const substitutionFootnote =
    selectedModels.find(hasSubstitutionFootnote)?.footnote;

  const goToModels = useCallback(() => {
    if (isCaseValid) {
      setStep('models');
    }
  }, [isCaseValid]);

  const selectedTitle =
    PRESET_CASES.find((preset) => preset.id === selectedPresetId)?.title ??
    'Custom case';
  const selectedCategory = getCaseDisplay(selectedPresetId)?.category;

  return (
    <div className="flex min-h-full flex-col">
      <TopBar />
      <DisclaimerStrip />

      <main className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pt-6 pb-4">
          {/* Compact editorial header */}
          <header className="flex flex-col gap-1">
            <h1 className="font-['Newsreader',Georgia,serif] text-2xl font-light tracking-tight text-[#2E2B29] sm:text-3xl">
              Which model calls the{' '}
              <em className="relative inline-block not-italic">
                <span className="relative z-10 italic">bleed</span>
                <span
                  aria-hidden
                  className="absolute inset-x-[-0.1em] bottom-[0.08em] z-0 h-[0.5em] rounded-sm bg-[#F4C406]"
                />
              </em>
              ?
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#67625B]">
              Prepare a synthetic case, choose the models, then run a blinded
              side-by-side triage.
            </p>
          </header>

          {/* Progress stepper */}
          <StepHeader
            step={step}
            caseDone={isCaseValid}
            modelsDone={hasEnoughModels}
            canOpenModels={isCaseValid}
            onStep={(next) => {
              if (next === 'case' || isCaseValid) {
                setStep(next);
              }
            }}
          />

          {/* Active step. Each step is a keyed motion.section rendered directly
              (no AnimatePresence): the distinct keys force a remount on step
              change so the entry slide replays, while nothing waits on an exit
              animation to complete. An earlier AnimatePresence mode="wait" here
              deadlocked under the React Compiler — the exiting section froze
              mid-transition and the next step never mounted. */}
          <div className="flex flex-1 flex-col">
            {step === 'case' ? (
              <motion.section
                key="case"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-1 flex-col"
              >
                <CaseInput
                  fields={caseFields}
                  onFieldChange={handleFieldChange}
                  selectedPresetId={selectedPresetId}
                  onPresetChange={handlePresetChange}
                />
              </motion.section>
            ) : (
              <motion.section
                key="models"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto flex w-full max-w-2xl flex-1 flex-col rounded-[14px] border border-[#EEEDEC] bg-white"
              >
                <div>
                  <ModelPicker
                    selectedModels={selectedModels}
                    onSelectionChange={setSelectedModels}
                  />
                </div>
                <ReasoningControl
                  value={reasoning}
                  onValueChange={setReasoning}
                />
              </motion.section>
            )}
          </div>
        </div>

        {/* Step action bar — sticky footer so the primary action stays reachable
            while the page scrolls as one surface */}
        <div className="sticky bottom-0 z-30 border-t border-[#EEEDEC] bg-[#FCFAF8]">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            {step === 'case' ? (
              <>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-[#2E2B29]">
                    <span className="font-medium">{selectedTitle}</span>
                    {selectedCategory ? (
                      <span className="text-[#67625B]"> · {selectedCategory}</span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-[#67625B]">
                    {caseBlockReason ??
                      `Case ready · ${caseLength.toLocaleString()} characters`}
                  </span>
                </div>
                <Button
                  type="button"
                  onClick={goToModels}
                  disabled={!isCaseValid}
                  className="h-10 rounded-[12px] bg-[#2E2B29] px-6 text-sm font-medium text-white hover:bg-[#2E2B29]/90"
                >
                  Next: choose models →
                </Button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[11px] tabular-nums text-[#67625B]">
                    {selectedModels.length}{' '}
                    {selectedModels.length === 1 ? 'model' : 'models'} selected ·{' '}
                    reasoning {getReasoningEffortLabel(reasoning)}
                  </span>
                  {modelsBlockReason ? (
                    <span className="text-[11px] text-[#67625B]">
                      {modelsBlockReason}
                    </span>
                  ) : null}
                  {substitutionFootnote ? (
                    <span className="text-[11px] text-[#67625B]">
                      {substitutionFootnote}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('case')}
                    className="h-10 rounded-[12px] border-[#EEEDEC] bg-white px-4 text-sm font-medium text-[#2E2B29] hover:bg-[#F4F2EF]"
                  >
                    ← Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRun}
                    disabled={!canRun}
                    className="h-10 rounded-[12px] bg-[#2E2B29] px-6 text-sm font-medium text-white hover:bg-[#2E2B29]/90"
                  >
                    Run comparison
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

interface StepHeaderProps {
  step: SetupStep;
  caseDone: boolean;
  modelsDone: boolean;
  canOpenModels: boolean;
  onStep: (step: SetupStep) => void;
}

function StepHeader({
  step,
  caseDone,
  modelsDone,
  canOpenModels,
  onStep,
}: StepHeaderProps) {
  const steps: {
    id: SetupStep;
    n: number;
    label: string;
    done: boolean;
    enabled: boolean;
  }[] = [
    { id: 'case', n: 1, label: 'Case', done: caseDone, enabled: true },
    {
      id: 'models',
      n: 2,
      label: 'Models',
      done: modelsDone,
      enabled: canOpenModels,
    },
  ];

  return (
    <nav aria-label="Setup steps" className="flex items-center gap-3">
      {steps.map((item, index) => {
        const active = step === item.id;
        return (
          <div key={item.id} className="flex flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => onStep(item.id)}
              disabled={!item.enabled}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'group flex items-center gap-2 rounded-full py-1 pr-2.5 pl-1 transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67625B]',
                item.enabled ? 'cursor-pointer' : 'cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors',
                  active
                    ? 'bg-[#2E2B29] text-white'
                    : item.done
                      ? 'bg-[#EDF3EC] text-[#346538]'
                      : 'border border-[#D8D5D0] bg-white text-[#67625B]',
                )}
              >
                {item.done && !active ? (
                  <svg
                    viewBox="0 0 16 16"
                    className="size-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                ) : (
                  item.n
                )}
              </span>
              <span
                className={cn(
                  'text-sm transition-colors',
                  active
                    ? 'font-medium text-[#2E2B29]'
                    : 'text-[#67625B] group-hover:text-[#2E2B29]',
                )}
              >
                {item.label}
              </span>
            </button>
            {index < steps.length - 1 ? (
              <span aria-hidden className="h-px flex-1 bg-[#EEEDEC]" />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
