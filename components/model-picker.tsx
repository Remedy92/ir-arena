'use client';

import { useEffect, useMemo, useState } from 'react';

import { MODEL_CATALOG, type ModelConfig } from '@/lib/models';
import { cn } from '@/lib/utils';

interface ModelPickerProps {
  selectedModels: ModelConfig[];
  onSelectionChange: (models: ModelConfig[]) => void;
  disabled?: boolean;
}

interface ProviderGroup {
  provider: string;
  models: ModelConfig[];
}

// Catalog grouped by provider, preserving first-seen order.
const PROVIDER_GROUPS: ProviderGroup[] = MODEL_CATALOG.reduce<ProviderGroup[]>(
  (groups, model) => {
    const existing = groups.find((group) => group.provider === model.provider);
    if (existing) {
      existing.models.push(model);
    } else {
      groups.push({ provider: model.provider, models: [model] });
    }
    return groups;
  },
  [],
);

export function ModelPicker({
  selectedModels,
  onSelectionChange,
  disabled = false,
}: ModelPickerProps) {
  const [availableSlugs, setAvailableSlugs] = useState<Set<string> | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    fetch('/api/models')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { available?: string[] } | null) => {
        if (active && data?.available) {
          setAvailableSlugs(new Set(data.available));
        }
      })
      .catch(() => {
        // Advisory only — silently ignore; all models stay selectable.
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedIds = useMemo(
    () => new Set(selectedModels.map((model) => model.id)),
    [selectedModels],
  );

  const selectedCount = selectedIds.size;

  function toggle(model: ModelConfig) {
    if (disabled) {
      return;
    }
    const nextIds = new Set(selectedIds);
    if (nextIds.has(model.id)) {
      nextIds.delete(model.id);
    } else {
      nextIds.add(model.id);
    }
    // Rebuild from catalog order so the selection list stays stable.
    onSelectionChange(MODEL_CATALOG.filter((item) => nextIds.has(item.id)));
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
        <h2 className="text-xs font-medium tracking-wide text-[#67625B] uppercase">
          Models
        </h2>
        <span className="font-mono text-[11px] text-[#67625B]">
          {selectedCount} selected
        </span>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-3">
        {PROVIDER_GROUPS.map((group) => (
          <div key={group.provider} className="flex flex-col gap-1">
            <span className="text-[10px] font-medium tracking-wider text-[#67625B] uppercase">
              {group.provider}
            </span>
            <div className="flex flex-col gap-0.5">
              {group.models.map((model) => {
                const checked = selectedIds.has(model.id);
                const unavailable =
                  availableSlugs !== null && !availableSlugs.has(model.slug);
                return (
                  <button
                    key={model.id}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={
                      unavailable ? `${model.label}, unavailable` : model.label
                    }
                    disabled={disabled}
                    onClick={() => toggle(model)}
                    className={cn(
                      'group flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left transition-colors',
                      'hover:bg-[#F4F2EF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#67625B]',
                      checked && 'bg-[#F4F2EF]',
                      disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                        checked
                          ? 'border-[#2E2B29] bg-[#2E2B29] text-white'
                          : 'border-[#D8D5D0] bg-white',
                      )}
                    >
                      {checked ? (
                        <svg
                          viewBox="0 0 16 16"
                          className="size-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3.5 8.5l3 3 6-7" />
                        </svg>
                      ) : null}
                    </span>
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: model.dotColor }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-[#2E2B29]">
                      {model.label}
                    </span>
                    {unavailable ? (
                      <span className="shrink-0 rounded-full bg-[#F0EFED] px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-[#67625B] uppercase">
                        Unavailable
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedCount < 2 ? (
        <p className="px-4 pb-3 text-[11px] text-[#9F2F2D]">
          Select at least 2 models to run.
        </p>
      ) : null}
    </div>
  );
}
