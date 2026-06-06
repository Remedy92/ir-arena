'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PRESET_CASES } from '@/lib/cases';
import { cn } from '@/lib/utils';

interface CaseInputProps {
  caseText: string;
  onCaseTextChange: (text: string) => void;
  selectedPresetId: string;
  onPresetChange: (presetId: string) => void;
  onRun: () => void;
  isRunning: boolean;
  disabled?: boolean;
}

export function CaseInput({
  caseText,
  onCaseTextChange,
  selectedPresetId,
  onPresetChange,
  onRun,
  isRunning,
  disabled = false,
}: CaseInputProps) {
  const isDisabled = disabled || isRunning;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="case-text"
            className="text-xs font-medium tracking-wide text-[#67625B] uppercase"
          >
            Case vignette
          </label>
          <Textarea
            id="case-text"
            value={caseText}
            onChange={(event) => onCaseTextChange(event.target.value)}
            placeholder="Paste or edit a synthetic IR triage vignette…"
            disabled={isDisabled}
            className={cn(
              'min-h-36 resize-y rounded-[14px] border-[#EEEDEC] bg-white text-sm text-[#2E2B29] shadow-none',
              'focus-visible:border-[#67625B] focus-visible:ring-[#EEEDEC]',
            )}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label
              htmlFor="preset-select"
              className="text-xs font-medium tracking-wide text-[#67625B] uppercase"
            >
              Preset
            </label>
            <Select
              value={selectedPresetId}
              onValueChange={(value) => {
                if (value !== null) {
                  onPresetChange(value);
                }
              }}
              disabled={isDisabled}
            >
              <SelectTrigger
                id="preset-select"
                className="w-full min-w-[220px] rounded-[14px] border-[#EEEDEC] bg-white shadow-none sm:w-auto"
              >
                <SelectValue placeholder="Select a preset case" />
              </SelectTrigger>
              <SelectContent className="rounded-[14px] border-[#EEEDEC]">
                {PRESET_CASES.map((preset, index) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {index + 1}. {preset.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            onClick={onRun}
            disabled={isDisabled || caseText.trim().length < 10}
            className="h-9 rounded-[14px] bg-[#2E2B29] px-5 text-sm font-medium text-white hover:bg-[#2E2B29]/90"
          >
            {isRunning ? 'Running triage…' : 'Run Triage'}
          </Button>
        </div>
      </div>
    </section>
  );
}