#!/usr/bin/env bash
set -euo pipefail

CASE='A 72-year-old man presents with brisk hematochezia six hours after uncomplicated cecal polypectomy during screening colonoscopy. He is pale and diaphoretic with blood pressure 95/60 mmHg and heart rate 112. Hemoglobin fell from 9.1 to 7.4 g/dL despite crystalloid resuscitation. CTA demonstrates active arterial extravasation from a branch of the ileocolic artery at the prior polypectomy site. He takes aspirin for coronary disease. IR and surgery are available.'
APP_URL="${IR_ARENA_APP_URL:-http://localhost:3000}"
API_URL="${APP_URL%/}/api/triage"

MODELS=(
  "anthropic/claude-opus-4.8"
  "openai/gpt-5.5"
  "google/gemini-3.5-flash"
  "google/gemma-4-31b-it"
)

if [[ -z "${IR_ARENA_AUTH_COOKIE:-}" ]]; then
  cat >&2 <<EOF
Missing IR_ARENA_AUTH_COOKIE.

/api/triage is authenticated and charges the signed-in user's wallet budget.
Start the app, sign in at ${APP_URL%/}/run, copy the browser's Cookie header
for this local app, then rerun:

  IR_ARENA_AUTH_COOKIE='cookie1=value; cookie2=value' $0
EOF
  exit 1
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

for MODEL in "${MODELS[@]}"; do
  SAFE="${MODEL//\//-}"
  (
    if ! curl -sS -w "%{http_code}" -o "$TMPDIR/$SAFE.json" -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -H "Cookie: $IR_ARENA_AUTH_COOKIE" \
      -d "{\"case\":\"$CASE\",\"model\":\"$MODEL\"}" --max-time 120 \
      > "$TMPDIR/$SAFE.status" 2> "$TMPDIR/$SAFE.err"; then
      : > "$TMPDIR/$SAFE.json"
      echo "000" > "$TMPDIR/$SAFE.status"
    fi
  ) &
done
wait

FAILED=0
for MODEL in "${MODELS[@]}"; do
  SAFE="${MODEL//\//-}"
  STATUS="$(cat "$TMPDIR/$SAFE.status")"
  if [[ "$STATUS" != "200" ]]; then
    FAILED=1
    echo "$MODEL: HTTP $STATUS from $API_URL" >&2
    sed -n '1,4p' "$TMPDIR/$SAFE.err" >&2
    sed -n '1,4p' "$TMPDIR/$SAFE.json" >&2
  fi
done

if [[ "$FAILED" -ne 0 ]]; then
  cat >&2 <<'EOF'

Probe failed before schema validation.
For HTTP 401, refresh IR_ARENA_AUTH_COOKIE from a signed-in browser session.
For HTTP 402, top up/reset the signed-in user's wallet budget or use a cheaper model set.
EOF
  exit 1
fi

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
  else if (data.red_flags) console.log('  red_flags=' + data.red_flags.length);
}
"
