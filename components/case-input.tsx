'use client';

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
  selectedPresetId: string;
  onPresetChange: (presetId: string) => void;
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
    minHeight: 'min-h-24',
  },
  {
    key: 'clinical',
    label: 'Vital signs',
    placeholder: 'SBP/HR (shock index) — e.g. BP 95/60 mmHg, HR 112',
    minHeight: 'min-h-14',
  },
  {
    key: 'labs',
    label: 'Laboratory values',
    optional: true,
    placeholder: 'Hb, INR, platelets, lactate (within 6 h)…',
    minHeight: 'min-h-14',
  },
  {
    key: 'ctReport',
    label: 'CT report',
    placeholder:
      'Imaging finding — active extravasation, blush, or pseudoaneurysm and its location…',
    minHeight: 'min-h-20',
  },
];

export function CaseInput({
  fields,
  onFieldChange,
  selectedPresetId,
  onPresetChange,
  disabled = false,
}: CaseInputProps) {
  return (
    <section className="flex flex-col">
      {/* Header: section label + preset picker */}
      <div className="flex items-center justify-between gap-3 border-b border-[#EEEDEC] px-4 py-3">
        <h2 className="text-xs font-medium tracking-wide text-[#67625B] uppercase">
          Case
        </h2>
        <Select
          value={selectedPresetId}
          onValueChange={(value) => {
            if (value !== null) {
              onPresetChange(value);
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger
            id="preset-select"
            aria-label="Preset case"
            className="h-8 w-auto min-w-[200px] rounded-[10px] border-[#EEEDEC] bg-white text-xs shadow-none"
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

      <div className="flex flex-col gap-4 px-4 py-4">
        {FIELD_SPECS.map((spec) => (
          <div key={spec.key} className="flex flex-col gap-1.5">
            <label
              htmlFor={`case-${spec.key}`}
              className="text-xs font-medium tracking-wide text-[#67625B] uppercase"
            >
              {spec.label}
              {spec.optional ? (
                <span className="font-normal text-[#67625B] normal-case">
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
              disabled={disabled}
              className={cn(
                spec.minHeight,
                'resize-y rounded-[12px] border-[#EEEDEC] bg-white text-sm text-[#2E2B29] shadow-none',
                'focus-visible:border-[#67625B] focus-visible:ring-[#EEEDEC]',
              )}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
