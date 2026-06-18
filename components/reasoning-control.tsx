'use client';

import { useRef } from 'react';
import { motion, MotionConfig } from 'motion/react';

import {
  isReasoningEffort,
  REASONING_EFFORT_OPTIONS,
  type ReasoningEffort,
} from '@/lib/reasoning';
import { cn } from '@/lib/utils';

interface ReasoningControlProps {
  value: ReasoningEffort;
  onValueChange: (value: ReasoningEffort) => void;
  disabled?: boolean;
}

type ReasoningOption = (typeof REASONING_EFFORT_OPTIONS)[number];

// Canonical order. Index 0 is `provider-default`, surfaced as a leading "Auto"
// chip; the remaining six form an increasing intensity ramp (None → Max). An
// inline radiogroup — no portal/popover — so it can never be clipped by the
// overflow-hidden setup column the way the old <Select> dropdown was.
const OPTIONS = REASONING_EFFORT_OPTIONS;
const AUTO = OPTIONS[0];
const RAMP = OPTIONS.slice(1);

function displayLabel(option: ReasoningOption): string {
  return option.value === 'provider-default' ? 'Auto' : option.label;
}

function ariaLabel(option: ReasoningOption): string {
  return option.value === 'provider-default'
    ? 'Auto — native provider behavior'
    : `${option.label} — ${option.description}`;
}

export function ReasoningControl({
  value,
  onValueChange,
  disabled = false,
}: ReasoningControlProps) {
  // Stable across renders; index aligns with OPTIONS so roving focus can move
  // the active radio imperatively (WAI-ARIA radiogroup pattern).
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (next: ReasoningEffort) => {
    // Re-selecting the active effort is a true no-op: don't fire onValueChange
    // for an unchanged value (keeps the control safe to wire to side-effecting
    // handlers, not just React's identity-bailing setState).
    if (disabled || next === value || !isReasoningEffort(next)) return;
    onValueChange(next);
  };

  const onKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (disabled) return;
    let next = index;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = Math.min(index + 1, OPTIONS.length - 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = Math.max(index - 1, 0);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = OPTIONS.length - 1;
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        select(OPTIONS[index].value);
        return;
      default:
        return;
    }
    // Movement both moves focus and selects (standard radiogroup), clamped at
    // the ends so an arrow never teleports across the whole scale.
    event.preventDefault();
    if (next !== index) {
      select(OPTIONS[next].value);
      refs.current[next]?.focus();
    }
  };

  // Inline render helper (not a child component) so chips never remount and the
  // shared-layout fill keeps its identity as the selection moves.
  const renderChip = (
    option: ReasoningOption,
    index: number,
    { shared, className }: { shared: boolean; className?: string },
  ) => {
    const checked = value === option.value;
    return (
      <button
        key={option.value}
        ref={(el) => {
          refs.current[index] = el;
        }}
        type="button"
        role="radio"
        aria-checked={checked}
        aria-label={ariaLabel(option)}
        tabIndex={!disabled && checked ? 0 : -1}
        disabled={disabled}
        onClick={() => select(option.value)}
        onKeyDown={(event) => onKeyDown(event, index)}
        className={cn(
          'relative isolate flex min-h-11 items-center justify-center rounded-[9px] px-2.5 text-xs font-medium whitespace-nowrap transition-colors select-none sm:h-8 sm:min-h-0',
          checked ? 'text-white' : 'text-[#2E2B29] hover:bg-[#F4F2EF]',
          'focus-visible:ring-2 focus-visible:ring-[#67625B] focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:outline-none',
          className,
        )}
      >
        {/* Active fill is decorative; `aria-checked` is the source of truth, so
            any motion edge case degrades to cosmetic. The ramp shares one
            layoutId to slide between segments; the Auto chip uses a plain fill
            so it never flies across the divider gap. */}
        {checked ? (
          shared ? (
            <motion.span
              layoutId="reasoning-fill"
              aria-hidden
              className="absolute inset-0 -z-10 rounded-[9px] bg-[#2E2B29]"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          ) : (
            <span
              aria-hidden
              className="absolute inset-0 -z-10 rounded-[9px] bg-[#2E2B29]"
            />
          )
        ) : null}
        <span className="relative">{displayLabel(option)}</span>
      </button>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex shrink-0 flex-col items-stretch gap-2 border-t border-[#EEEDEC] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h2 className="text-xs font-medium tracking-wide text-[#67625B] uppercase">
          Reasoning
        </h2>
        <div
          role="radiogroup"
          aria-label="Reasoning effort"
          aria-disabled={disabled || undefined}
          className={cn(
            'flex flex-col items-stretch gap-1.5 rounded-[12px] border border-[#EEEDEC] bg-white p-[3px] sm:flex-row sm:items-center',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          {renderChip(AUTO, 0, {
            shared: false,
            className: 'w-full sm:w-auto sm:px-3',
          })}
          {/* Sets Auto off from the intensity ramp: horizontal rule stacked,
              vertical hairline inline. Decorative only. */}
          <div aria-hidden className="h-px w-full bg-[#EEEDEC] sm:h-5 sm:w-px" />
          <div className="grid grid-cols-3 gap-[3px] sm:flex sm:gap-[3px]">
            {RAMP.map((option, index) =>
              renderChip(option, index + 1, { shared: true }),
            )}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
