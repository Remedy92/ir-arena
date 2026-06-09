'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CaseInput } from '@/components/case-input';
import { DisclaimerStrip } from '@/components/disclaimer-strip';
import { ModelPicker } from '@/components/model-picker';
import { TopBar } from '@/components/top-bar';
import { Button } from '@/components/ui/button';
import {
  assembleCaseText,
  PRESET_CASES,
  presetToCaseFields,
  type CaseField,
  type CaseFields,
} from '@/lib/cases';
import { hasSubstitutionFootnote } from '@/lib/models';
import { getPendingRun, setPendingRun } from '@/lib/run-store';
import { useSelectedModels } from '@/lib/use-selected-models';

const DEFAULT_PRESET = PRESET_CASES[1];

export default function SetupPage() {
  const router = useRouter();

  const [caseFields, setCaseFields] = useState<CaseFields>(() =>
    presetToCaseFields(DEFAULT_PRESET),
  );
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET.id);
  const [selectedModels, setSelectedModels] = useSelectedModels();

  // Restore the last configured case when returning from the run page via
  // "Edit comparison" (models are restored separately from localStorage).
  useEffect(() => {
    const pending = getPendingRun();
    if (pending) {
      setCaseFields(pending.caseFields);
      if (pending.presetId) {
        setSelectedPresetId(pending.presetId);
      }
    }
  }, []);

  const caseText = useMemo(() => assembleCaseText(caseFields), [caseFields]);
  const canRun = caseText.trim().length >= 10 && selectedModels.length >= 2;

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
    });
    router.push('/run');
  }, [canRun, caseFields, selectedPresetId, selectedModels, router]);

  const substitutionFootnote =
    selectedModels.find(hasSubstitutionFootnote)?.footnote;

  return (
    <div className="flex min-h-full flex-col md:h-dvh md:min-h-0 md:overflow-hidden">
      <TopBar />
      <DisclaimerStrip />

      <main className="flex flex-1 flex-col md:min-h-0 md:overflow-hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 pt-6 pb-4 md:min-h-0 md:overflow-hidden">
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
              Pick the models and prepare a synthetic case, then run a blinded
              side-by-side triage.
            </p>
          </header>

          {/* Two-column config — model picker + case prep */}
          <div className="grid flex-1 gap-5 md:min-h-0 md:grid-cols-[19rem_1fr] md:overflow-hidden lg:grid-cols-[21rem_1fr]">
            <aside className="flex flex-col overflow-hidden rounded-[14px] border border-[#EEEDEC] bg-white md:min-h-0 md:overflow-y-auto">
              <ModelPicker
                selectedModels={selectedModels}
                onSelectionChange={setSelectedModels}
              />
            </aside>

            <section className="flex flex-col overflow-hidden rounded-[14px] border border-[#EEEDEC] bg-white md:min-h-0 md:overflow-y-auto">
              <CaseInput
                fields={caseFields}
                onFieldChange={handleFieldChange}
                selectedPresetId={selectedPresetId}
                onPresetChange={handlePresetChange}
              />
            </section>
          </div>
        </div>

        {/* Run bar — pinned beneath the config, mirrors the comparison input */}
        <div className="shrink-0 border-t border-[#EEEDEC] bg-[#FCFAF8]">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-[11px] tabular-nums text-[#67625B]">
                {selectedModels.length}{' '}
                {selectedModels.length === 1 ? 'model' : 'models'} selected
              </span>
              {!canRun ? (
                <span className="text-[11px] text-[#67625B]">
                  Select at least 2 models and enter a case to run.
                </span>
              ) : null}
              {substitutionFootnote ? (
                <span className="text-[11px] text-[#67625B]">
                  {substitutionFootnote}
                </span>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={handleRun}
              disabled={!canRun}
              className="h-10 rounded-[12px] bg-[#2E2B29] px-6 text-sm font-medium text-white hover:bg-[#2E2B29]/90"
            >
              Run comparison
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
