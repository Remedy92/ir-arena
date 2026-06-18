'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  isReasoningEffort,
  REASONING_EFFORT_OPTIONS,
  type ReasoningEffort,
} from '@/lib/reasoning';

interface ReasoningControlProps {
  value: ReasoningEffort;
  onValueChange: (value: ReasoningEffort) => void;
  disabled?: boolean;
}

export function ReasoningControl({
  value,
  onValueChange,
  disabled = false,
}: ReasoningControlProps) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#EEEDEC] px-4 py-3">
      <h2 className="text-xs font-medium tracking-wide text-[#67625B] uppercase">
        Reasoning
      </h2>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (isReasoningEffort(nextValue)) {
            onValueChange(nextValue);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger
          id="reasoning-select"
          aria-label="Reasoning effort"
          className="h-8 w-auto min-w-[150px] rounded-[10px] border-[#EEEDEC] bg-white text-xs shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-[14px] border-[#EEEDEC]">
          {REASONING_EFFORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex w-full items-center justify-between gap-4">
                <span>{option.label}</span>
                <span className="text-[11px] text-[#67625B]">
                  {option.description}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
