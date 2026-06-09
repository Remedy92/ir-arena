'use client';

import { useState } from 'react';

import {
  CASE_FIELD_ORDER,
  CASE_FIELD_PROMPT_LABELS,
  type CaseFields,
} from '@/lib/cases';
import { cn } from '@/lib/utils';

interface CasePromptProps {
  fields: CaseFields;
}

/**
 * The configured case, shown read-only at the top of the run column — the
 * "prompt" every model is answering. Long cases collapse to keep the streaming
 * cards above the fold; a toggle reveals the full text.
 */
export function CasePrompt({ fields }: CasePromptProps) {
  const [expanded, setExpanded] = useState(false);

  const lines = CASE_FIELD_ORDER.map((key) => ({
    key,
    label: CASE_FIELD_PROMPT_LABELS[key],
    value: fields[key].trim(),
  })).filter((line) => line.value.length > 0);

  if (lines.length === 0) {
    return null;
  }

  const collapsible = lines.length > 2;
  const visible = collapsible && !expanded ? lines.slice(0, 2) : lines;

  return (
    <section className="rounded-[14px] border border-[#EEEDEC] bg-white px-4 py-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-medium tracking-wider text-[#67625B] uppercase">
          Case under review
        </h2>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="rounded-md px-1.5 py-0.5 text-[11px] text-[#67625B] transition-colors hover:bg-[#F4F2EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67625B]"
          >
            {expanded ? 'Show less' : `Show all ${lines.length}`}
          </button>
        ) : null}
      </div>

      <dl className="flex flex-col gap-2">
        {visible.map((line) => (
          <div
            key={line.key}
            className="grid grid-cols-1 gap-0.5 sm:grid-cols-[8.5rem_1fr] sm:gap-3"
          >
            <dt className="text-[11px] font-medium tracking-wide text-[#67625B] uppercase">
              {line.label}
            </dt>
            <dd
              className={cn(
                'text-sm leading-relaxed text-[#2E2B29]',
                !expanded && collapsible && 'line-clamp-2',
              )}
            >
              {line.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
