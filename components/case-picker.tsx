'use client';

import { useState } from 'react';

import {
  PRESET_CASES,
  getCaseDisplay,
  type CaseTier,
} from '@/lib/cases';
import { cn } from '@/lib/utils';

interface CasePickerProps {
  selectedPresetId: string;
  onPresetChange: (presetId: string) => void;
  disabled?: boolean;
}

// A calm, distinct dot per clinical domain — adds a little life without the
// scarce mustard accent. Tiny enough that saturation reads as editorial, not loud.
const CATEGORY_DOT: Record<string, string> = {
  Trauma: '#C2563C',
  'GI bleed': '#2F7DA8',
  'Ob/Gyn': '#B5497E',
  Hemoptysis: '#A23C3A',
  Renal: '#5E7F3A',
  'Visceral aneurysm': '#8A6D3B',
  Retroperitoneal: '#6F6BB0',
  Hepatobiliary: '#4F8A6B',
};
const FALLBACK_DOT = '#67625B';

/** Editorial domain color for a case category, shared with the info panel. */
export function categoryDot(category: string | undefined): string {
  if (!category) return FALLBACK_DOT;
  return CATEGORY_DOT[category] ?? FALLBACK_DOT;
}

type TierFilter = 'all' | CaseTier;

const CASES = PRESET_CASES.map((preset) => ({
  preset,
  display: getCaseDisplay(preset.id) ?? {
    category: 'Case',
    tier: 'starter' as CaseTier,
    teaser: '',
  },
}));
const STARTER_CASES = CASES.filter((entry) => entry.display.tier === 'starter');
const TOUGH_CASES = CASES.filter((entry) => entry.display.tier === 'tough');

const SECTIONS: {
  tier: CaseTier;
  label: string;
  blurb: string;
  cases: typeof CASES;
}[] = [
  {
    tier: 'starter',
    label: 'Starter cases',
    blurb: 'Clear-cut active bleeds — a model that misses these is in trouble.',
    cases: STARTER_CASES,
  },
  {
    tier: 'tough',
    label: 'Tough calls',
    blurb:
      'Adapted from real published case reports and built to split the models — no single obvious answer.',
    cases: TOUGH_CASES,
  },
];

const FILTERS: { value: TierFilter; label: string; count: number }[] = [
  { value: 'all', label: 'All', count: CASES.length },
  { value: 'starter', label: 'Starter', count: STARTER_CASES.length },
  { value: 'tough', label: 'Tough calls', count: TOUGH_CASES.length },
];

export function CasePicker({
  selectedPresetId,
  onPresetChange,
  disabled = false,
}: CasePickerProps) {
  const [filter, setFilter] = useState<TierFilter>('all');

  const visibleSections = SECTIONS.filter(
    (section) => filter === 'all' || section.tier === filter,
  );

  return (
    <div className="flex flex-col">
      {/* Sticky header: section label + difficulty filter */}
      <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-[#EEEDEC] bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-medium tracking-wide text-[#67625B] uppercase">
            Choose a case
          </h2>
          <span className="font-mono text-[11px] text-[#A8A39C]">
            {PRESET_CASES.length} presets
          </span>
        </div>
        <div
          role="group"
          aria-label="Filter cases by difficulty"
          className="flex items-center gap-1"
        >
          {FILTERS.map((option) => {
            const active = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => setFilter(option.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67625B]',
                  active
                    ? 'bg-[#2E2B29] text-white'
                    : 'text-[#67625B] hover:bg-[#F4F2EF]',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                {option.label}
                <span
                  className={cn(
                    'font-mono text-[10px] tabular-nums',
                    active ? 'text-white/70' : 'text-[#A8A39C]',
                  )}
                >
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gallery */}
      <div className="flex flex-col gap-3 px-4 py-3">
        {visibleSections.map((section) => (
          <div key={section.tier} className="flex flex-col gap-1.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium tracking-wider text-[#67625B] uppercase">
                {section.label}
              </span>
              <span className="text-[11px] leading-snug text-[#A8A39C]">
                {section.blurb}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {section.cases.map(({ preset, display }) => {
                const isSelected = preset.id === selectedPresetId;
                const dot = categoryDot(display.category);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${preset.title} — ${display.category}`}
                    disabled={disabled}
                    onClick={() => onPresetChange(preset.id)}
                    className={cn(
                      'group flex flex-col gap-1 rounded-[10px] border p-2.5 text-left transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67625B]',
                      isSelected
                        ? 'border-[#2E2B29] bg-[#F4F2EF]'
                        : 'border-[#EEEDEC] bg-white hover:border-[#D8D5D0] hover:bg-[#FCFAF8]',
                      disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          aria-hidden
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: dot }}
                        />
                        <span className="truncate text-[10px] font-medium tracking-wide text-[#67625B] uppercase">
                          {display.category}
                        </span>
                      </span>
                      {isSelected ? (
                        <span
                          aria-hidden
                          className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#2E2B29] text-white"
                        >
                          <svg
                            viewBox="0 0 16 16"
                            className="size-2.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3.5 8.5l3 3 6-7" />
                          </svg>
                        </span>
                      ) : display.tier === 'tough' ? (
                        <span
                          aria-hidden
                          className="shrink-0 rounded-full bg-[#FBF3DB] px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-[#956400] uppercase"
                        >
                          Tough
                        </span>
                      ) : null}
                    </div>
                    <span className="text-sm leading-tight font-medium text-[#2E2B29]">
                      {preset.title}
                    </span>
                    {display.teaser ? (
                      <span className="text-[11px] leading-snug text-[#67625B]">
                        {display.teaser}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
