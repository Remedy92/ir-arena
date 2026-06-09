'use client';

import { useCallback, useSyncExternalStore } from 'react';

import {
  defaultSelectedModels,
  getModelById,
  type ModelConfig,
} from '@/lib/models';

const STORAGE_KEY = 'ir-arena-selected-models';

const listeners = new Set<() => void>();

// Cache so getSnapshot returns a referentially stable array between changes —
// useSyncExternalStore compares snapshots with Object.is and would loop on a
// fresh array each render otherwise.
let cachedRaw: string | null = null;
let cachedModels: ModelConfig[] | null = null;
let serverSnapshot: ModelConfig[] | null = null;

function parseSelection(raw: string | null): ModelConfig[] {
  // No stored selection (first visit) or unreadable → the verified defaults.
  if (raw === null) {
    return defaultSelectedModels();
  }

  try {
    const ids: unknown = JSON.parse(raw);
    if (!Array.isArray(ids)) {
      return defaultSelectedModels();
    }

    // Return exactly what was stored (resolved against the catalog), even if
    // it is 0 or 1 model. The "at least 2 to run" rule is a runtime gate, not
    // a storage rewrite — rewriting here would revert live de-selections.
    return ids
      .filter((id): id is string => typeof id === 'string')
      .map((id) => getModelById(id))
      .filter((model): model is ModelConfig => model !== undefined);
  } catch {
    return defaultSelectedModels();
  }
}

function readStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): ModelConfig[] {
  const raw = readStorage();
  if (raw === cachedRaw && cachedModels !== null) {
    return cachedModels;
  }
  cachedRaw = raw;
  cachedModels = parseSelection(raw);
  return cachedModels;
}

function getServerSnapshot(): ModelConfig[] {
  if (serverSnapshot === null) {
    serverSnapshot = defaultSelectedModels();
  }
  return serverSnapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedRaw = null; // force recompute on next getSnapshot
      listener();
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function writeSelection(models: ModelConfig[]): void {
  const ids = models.map((model) => model.id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore quota/availability errors — selection still updates in-memory.
  }
  cachedRaw = null; // invalidate cache so getSnapshot recomputes
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Selected models, persisted to localStorage and synced across tabs. Defaults
 * to the four verified study arms on first visit.
 */
export function useSelectedModels(): [
  ModelConfig[],
  (models: ModelConfig[]) => void,
] {
  const selected = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const setSelected = useCallback((models: ModelConfig[]) => {
    writeSelection(models);
  }, []);

  return [selected, setSelected];
}
