import { Output } from 'ai';

import { triageSchema } from './schema';

export function triageOutput() {
  return Output.object({
    schema: triageSchema,
    name: 'triageRecommendation',
    description:
      'A strict interventional radiology triage recommendation JSON object for blinded study scoring. Return only the schema fields.',
  });
}
