---
spec: design.md/v0
project: ir-arena
mode: light-only
sources_of_truth:
  tokens: app/globals.css
  fonts: app/layout.tsx
fonts:
  display: Newsreader   # weight 300, tight tracking, color #67625B
  sans: Inter           # UI body
  mono: Geist Mono      # latency / data values
colors:
  canvas: "#FCFAF8"
  ink: "#2E2B29"
  muted: "#67625B"
  border: "#EEEDEC"
  accent: "#F4C406"     # mustard — hero highlight + streaming indicator only
  card: "#FFFFFF"
  decision:
    EMBOLIZATION: { bg: "#FDEBEC", fg: "#9F2F2D" }
    SURGERY: { bg: "#E1F3FE", fg: "#1F6C9F" }
    CONSERVATIVE: { bg: "#EDF3EC", fg: "#346538" }
    IMAGING_FIRST: { bg: "#FBF3DB", fg: "#956400" }
layout:
  topBarHeight: "56px"
  disclaimerHeight: "12px"
  cardRadius: "14px"
  cardShadow: none
  gridGap: "16px"
  gridCols: "1 / md:2 / xl:4"
motion:
  cardEntry: "opacity 0→1, translateY 4px, 300ms"
---

# IR Arena Design System

Arena.ai-inspired light editorial theme for a blinded LLM comparison demo.

## Principles

1. **Flat and clinical** — white cards, hairline borders, no shadows.
2. **Typographic hierarchy** — Newsreader serif for display only; Inter for UI; Geist Mono for metrics.
3. **Mustard accent is scarce** — used once in hero (`*bleed*` highlight) and as streaming-state indicator.
4. **Research disclaimer always visible** — 12px strip under top bar.

## Color tokens

| Token | Hex | Use |
|-------|-----|-----|
| Canvas | `#FCFAF8` | Page background |
| Ink | `#2E2B29` | Primary text |
| Muted | `#67625B` | Serif display, secondary |
| Border | `#EEEDEC` | Hairlines, card borders |
| Accent | `#F4C406` | Hero highlight, streaming dot |
| Card | `#FFFFFF` | Card surfaces |

## Typography

- **Hero:** Newsreader 300, tight tracking — `Which model calls the *bleed*?`
- **Wordmark:** Newsreader serif — "IR Arena"
- **UI:** Inter — labels, body, buttons
- **Data:** Geist Mono — latency ms, confidence value

## Components

### Top bar (56px)

- Left: serif wordmark "IR Arena"
- Center/right: "Synthetic data" chip + Blinded/Reveal switch
- Bottom edge: 1px `#EEEDEC` border

### Disclaimer strip (12px)

Persistent text: `Synthetic cases only — research demo, not for clinical use.`

### Cards

- Background white, radius 14px, border 1px `#EEEDEC`
- No box-shadow
- Entry animation: fade + 4px rise, 300ms

### Decision badges

Clinical status palette (see YAML `decision` colors). Pill shape, uppercase, wide tracking.

### Confidence bar

4px thin progress bar; value in Geist Mono beside it.

### Consensus table

Compact shadcn Table below grid. Agreed cells: green tint (`#EDF3EC` / `bg-green-50`).

### Streaming state

Mustard (`#F4C406`) pulsing dot or underline on card header while `isLoading`.

## Grid

`grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4` (16px).

## Responsive breakpoints

- 375px: single column, stacked top bar controls
- 1440px: four-column comparison grid