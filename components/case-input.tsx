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
import { PRESET_CASES, type CaseField, type CaseFields } from '@/lib/cases';
import { cn } from '@/lib/utils';

interface CaseInputProps {
  fields: CaseFields;
  onFieldChange: (field: CaseField, value: string) => void;
  canRun: boolean;
  selectedPresetId: string;
  onPresetChange: (presetId: string) => void;
  onRun: () => void;
  isRunning: boolean;
  disabled?: boolean;
}

interface FieldSpec {
  key: CaseField;
  label: string;
  optional?: boolean;
  placeholder: string;
  minHeight: string;
}

// Mirrors the protocol §3.3 "must-have" extraction variables.
const FIELD_SPECS: FieldSpec[] = [
  {
    key: 'demographics',
    label: 'Patient',
    placeholder: 'Age, sex — e.g. 72-year-old man',
    minHeight: 'min-h-10',
  },
  {
    key: 'anamnesis',
    label: 'Clinical context',
    placeholder:
      'Presentation, scenario, history, anticoagulant use, prior interventions, available resources…',
    minHeight: 'min-h-28',
  },
  {
    key: 'clinical',
    label: 'Vital signs',
    placeholder: 'SBP/HR (shock index) — e.g. BP 95/60 mmHg, HR 112',
    minHeight: 'min-h-16',
  },
  {
    key: 'labs',
    label: 'Laboratory values',
    optional: true,
    placeholder: 'Hb, INR, platelets, lactate (within 6 h)…',
    minHeight: 'min-h-16',
  },
  {
    key: 'ctReport',
    label: 'CT report',
    placeholder:
      'Imaging finding — active extravasation, blush, or pseudoaneurysm and its location…',
    minHeight: 'min-h-24',
  },
];

export function CaseInput({
  fields,
  onFieldChange,
  canRun,
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
        {FIELD_SPECS.map((spec) => (
          <div key={spec.key} className="flex flex-col gap-2">
            <label
              htmlFor={`case-${spec.key}`}
              className="text-xs font-medium tracking-wide text-[#67625B] uppercase"
            >
              {spec.label}
              {spec.optional ? (
                <span className="font-normal text-[#9A958E] normal-case">
                  {' '}
                  (optional)
                </span>
              ) : null}
            </label>
            <Textarea
              id={`case-${spec.key}`}
              value={fields[spec.key]}
              onChange={(event) => onFieldChange(spec.key, event.target.value)}
              placeholder={spec.placeholder}
              disabled={isDisabled}
              className={cn(
                spec.minHeight,
                'resize-y rounded-[14px] border-[#EEEDEC] bg-white text-sm text-[#2E2B29] shadow-none',
                'focus-visible:border-[#67625B] focus-visible:ring-[#EEEDEC]',
              )}
            />
          </div>
        ))}

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
            disabled={isDisabled || !canRun}
            className="h-9 rounded-[14px] bg-[#2E2B29] px-5 text-sm font-medium text-white hover:bg-[#2E2B29]/90"
          >
            {isRunning ? 'Running triage…' : 'Run Triage'}
          </Button>
        </div>
      </div>
    </section>
  );
}
