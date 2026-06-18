import { devToolsMiddleware } from '@ai-sdk/devtools';
import {
  extractJsonMiddleware,
  gateway,
  wrapLanguageModel,
  type LanguageModelMiddleware,
} from 'ai';

export function extractFirstJsonObject(text: string): string {
  const trimmed = text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/, '')
    .trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const start = trimmed.indexOf('{');
  if (start === -1) {
    return trimmed;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(start, index + 1);
      }
    }
  }

  return trimmed;
}

function buildMiddleware(): LanguageModelMiddleware[] {
  const stack: LanguageModelMiddleware[] = [
    extractJsonMiddleware({ transform: extractFirstJsonObject }),
  ];

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
