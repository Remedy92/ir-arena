'use client';

import { CasePicker, categoryDot } from '@/components/case-picker';
import { Textarea } from '@/components/ui/textarea';
import {
  PRESET_CASES,
  getCaseDisplay,
  type CaseField,
  type CaseFields,
} from '@/lib/cases';
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
  const preset = PRESET_CASES.find((item) => item.id === selectedPresetId);
  const display = getCaseDisplay(selectedPresetId);
  const source = preset?.source;
  const title = preset?.title ?? 'Custom case';
  const category = display?.category;
  const dot = categoryDot(category);

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[minmax(0,7fr)_minmax(0,9fr)]">
      {/* LEFT — selection */}
      <div className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#EEEDEC] bg-white md:overflow-y-auto">
        <CasePicker
          selectedPresetId={selectedPresetId}
          onPresetChange={onPresetChange}
          disabled={disabled}
        />
      </div>

      {/* RIGHT — selected case info + editable fields */}
      <div className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#EEEDEC] bg-white">
        {/* Pinned info header */}
        <div className="shrink-0 border-b border-[#EEEDEC] px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: dot }}
              />
              <span className="truncate text-[10px] font-medium tracking-wide text-[#67625B] uppercase">
                {category ?? 'Case'}
              </span>
              {display?.tier === 'tough' ? (
                <span
                  aria-hidden
                  className="shrink-0 rounded-full bg-[#FBF3DB] px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-[#956400] uppercase"
                >
                  Tough
                </span>
              ) : null}
            </span>
            {source ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[#1F6C9F] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F6C9F]"
              >
                View on PubMed
                <svg
                  viewBox="0 0 16 16"
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6.5 4H4a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V9.5" />
                  <path d="M9.5 3.5h3v3" />
                  <path d="M12.5 3.5 7.5 8.5" />
                </svg>
              </a>
            ) : null}
          </div>
          <h2 className="mt-1 text-base leading-tight font-medium text-[#2E2B29]">
            {title}
          </h2>
        </div>

        {/* Scrollable edit body */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 md:overflow-y-auto">
          <span className="text-[10px] font-medium tracking-wider text-[#67625B] uppercase">
            Edit case
          </span>
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

          {/* Source provenance note */}
          <p className="border-t border-[#EEEDEC] pt-3 text-[11px] leading-snug text-[#A8A39C]">
            {source
              ? `Adapted from ${source.citation} Source facts are kept faithful; values the report did not state are clinically-consistent synthesis. Never sent to the models.`
              : 'Synthetic teaching case — not adapted from a specific published report.'}
          </p>
        </div>
      </div>
    </div>
  );
}
