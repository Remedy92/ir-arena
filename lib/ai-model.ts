import { devToolsMiddleware } from '@ai-sdk/devtools';
import {
  extractJsonMiddleware,
  gateway,
  wrapLanguageModel,
  type LanguageModelMiddleware,
} from 'ai';

function buildMiddleware(): LanguageModelMiddleware[] {
  const stack: LanguageModelMiddleware[] = [extractJsonMiddleware()];

  if (process.env.NODE_ENV === 'development') {
    stack.push(devToolsMiddleware());
  }

  return stack;
}

export function createTriageModel(modelSlug: string) {
  return wrapLanguageModel({
    model: gateway(modelSlug),
    middleware: buildMiddleware(),
  });
}