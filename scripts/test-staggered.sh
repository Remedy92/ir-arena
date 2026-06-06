#!/usr/bin/env bash
set -euo pipefail

CASE='A 72-year-old man presents with brisk hematochezia six hours after uncomplicated cecal polypectomy during screening colonoscopy. He is pale and diaphoretic with blood pressure 95/60 mmHg and heart rate 112. Hemoglobin fell from 9.1 to 7.4 g/dL despite crystalloid resuscitation. CTA demonstrates active arterial extravasation from a branch of the ileocolic artery at the prior polypectomy site. He takes aspirin for coronary disease. IR and surgery are available.'

MODELS=(
  "anthropic/claude-opus-4.8"
  "openai/gpt-5.5"
  "google/gemini-3.5-flash"
  "google/gemma-4-31b-it"
)

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

for i in "${!MODELS[@]}"; do
  MODEL="${MODELS[$i]}"
  SAFE="${MODEL//\//-}"
  (
    sleep $((i * 400))
    curl -s -o "$TMPDIR/$SAFE.json" -X POST http://localhost:3000/api/triage \
      -H "Content-Type: application/json" \
      -d "{\"case\":\"$CASE\",\"model\":\"$MODEL\"}" --max-time 120
  ) &
done
wait

node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { triageSchema } from './lib/schema.ts';

const models = [
  'anthropic/claude-opus-4.8',
  'openai/gpt-5.5',
  'google/gemini-3.5-flash',
  'google/gemma-4-31b-it',
];

for (const model of models) {
  const file = '$TMPDIR/' + model.replaceAll('/', '-') + '.json';
  const raw = readFileSync(file, 'utf8');
  if (!raw.trim()) {
    console.log(model + ': EMPTY');
    continue;
  }
  let data;
  try { data = JSON.parse(raw); } catch { console.log(model + ': INVALID JSON'); continue; }
  const r = triageSchema.safeParse(data);
  console.log(model + ': ' + (r.success ? 'PASS' : r.error.issues.map(i => i.path.join('.') + ': ' + i.message).join('; ')));
  if (data.confidence !== undefined) console.log('  confidence=' + data.confidence);
  if (Array.isArray(data.redFlags)) console.log('  redFlags=' + data.redFlags.length);
}
"