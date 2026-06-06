import type { BlindLabel, ModelConfig } from './models';

const BLIND_LABELS: BlindLabel[] = ['A', 'B', 'C', 'D'];

export interface ShuffledModel {
  model: ModelConfig;
  blindLabel: BlindLabel;
}

export function shuffleModels(models: ModelConfig[]): ShuffledModel[] {
  const shuffled = [...models];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = shuffled[i];
    const swap = shuffled[j];
    if (current !== undefined && swap !== undefined) {
      shuffled[i] = swap;
      shuffled[j] = current;
    }
  }

  return shuffled.map((model, index) => ({
    model,
    blindLabel: BLIND_LABELS[index] as BlindLabel,
  }));
}