# Funnel Summary Responsive Card Design

## Goal

Make Funnel Summary cards denser and easier to scan on mobile and tablet without changing desktop layout or data behavior.

## Scope

- Apply responsive layout changes at viewport widths up to 1024px.
- Remove the status legend at every viewport size because status labels already appear inside each card.
- Keep queries, aggregation, role visibility, colors, and metrics unchanged.

## Responsive layout

At widths up to 1024px, each team and telemarketing card uses this structure:

```text
Name and contacted progress            Total leads
-------------------------------------------------
Belum       Follow Up       Visit Dijadwalkan
Visit       Closing         Dead
-------------------------------------------------
Segmented progress bar                 100%
```

- Mobile: status metrics use a three-column, two-row grid.
- Tablet: status metrics use six columns when space allows.
- Card padding, internal gaps, and label spacing are reduced.
- Metric values increase to 24–28px and remain color-coded.
- Labels stay centered and may wrap to two lines.
- The progress caption uses Indonesian wording.
- Desktop above 1024px keeps the current horizontal card layout.

## Implementation

- Add semantic class names to the existing Funnel Summary elements.
- Put responsive rules in `app/globals.css`; do not add a component library or duplicate markup.
- Reuse `StatPill` and `ProgressBar` with the existing data flow.

## States and accessibility

- Loading and empty states remain unchanged.
- Text contrast and existing status colors remain unchanged.
- The layout must not overflow at 320px, 768px, or 1024px.

## Verification

- Add one source contract covering legend removal and responsive class hooks.
- Run the focused contract, lint, and production build.
- Visually check mobile and tablet layouts if a local authenticated session is available.
