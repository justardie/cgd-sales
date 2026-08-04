# Funnel Summary Responsive Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Funnel Summary cards compact and readable on mobile and tablet while preserving the existing desktop layout.

**Architecture:** Reuse the current data aggregation, `StatPill`, and `ProgressBar`. Add semantic class hooks to the existing markup and keep all viewport-specific presentation in `app/globals.css`, with tablet rules at 1024px and mobile rules at 640px.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS media queries, Node test runner.

## Global Constraints

- Apply responsive card changes only at viewport widths up to 1024px.
- Remove the redundant status legend at every viewport size.
- Do not change queries, aggregation, role visibility, metric colors, loading states, or empty states.
- Do not add dependencies or duplicate responsive markup.
- Prevent horizontal overflow at 320px, 768px, and 1024px.

---

### Task 1: Compact Funnel Summary cards

**Files:**
- Modify: `scripts/revision-contract.test.mjs`
- Modify: `app/funnel-summary/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: Existing `TmStat`, `getFunnelMetrics`, `StatPill`, and `ProgressBar` behavior.
- Produces: Responsive class hooks prefixed with `funnel-summary-`; no new exported API.

- [ ] **Step 1: Write the failing responsive contract**

Add this test after the existing Funnel pages contract in `scripts/revision-contract.test.mjs`:

```js
test("Funnel Summary uses compact responsive cards without a legend", async () => {
  const summary = await read("app/funnel-summary/page.tsx")
  const css = await read("app/globals.css")

  assert.doesNotMatch(summary, /\{\/\* Legend \*\/\}/)
  for (const className of [
    "funnel-summary-card",
    "funnel-summary-card__header",
    "funnel-summary-card__metrics",
    "funnel-summary-card__progress",
    "funnel-summary-metric__value",
  ]) {
    assert.match(summary, new RegExp(className))
  }
  assert.match(css, /@media \(max-width: 1024px\)[\s\S]*\.funnel-summary-card__metrics\s*\{[^}]*grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\)/)
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.funnel-summary-card__metrics\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/)
})
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```powershell
node --test scripts/revision-contract.test.mjs
```

Expected: FAIL because the legend still exists and the responsive class hooks are absent.

- [ ] **Step 3: Add semantic class hooks and remove the legend**

In `app/funnel-summary/page.tsx`:

- Remove the complete `{/* Legend */}` block.
- Update `StatPill` so its wrapper, value, and label use these class names while preserving their current desktop inline styles:

```tsx
<div className="funnel-summary-metric" style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "52px" }}>
  <span className="funnel-summary-metric__value" style={{ fontSize: "16px", fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
  <span className="funnel-summary-metric__label" style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px", textAlign: "center", lineHeight: 1.2, maxWidth: "54px" }}>{label}</span>
</div>
```

- Add `funnel-summary-card funnel-summary-card--team` to the team aggregate card, `funnel-summary-card` to every per-TM card, and these hooks to their existing children:

```tsx
className="funnel-summary-card__header"
className="funnel-summary-card__identity"
className="funnel-summary-card__content"
className="funnel-summary-card__total"
className="funnel-summary-card__divider"
className="funnel-summary-card__metrics"
className="funnel-summary-card__progress"
className="funnel-summary-card__progress-label"
```

- Group only the six `StatPill` elements inside `funnel-summary-card__metrics`; keep the total block outside that grid.
- Change the progress caption from `{contactedPct}% reached` to `{contactedPct}% dihubungi`.

- [ ] **Step 4: Add tablet and mobile presentation**

Append this CSS to `app/globals.css`:

```css
@media (max-width: 1024px) {
  .funnel-summary-card {
    padding: 16px !important;
  }

  .funnel-summary-card__header {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center !important;
    gap: 12px !important;
  }

  .funnel-summary-card__identity {
    min-width: 0 !important;
    flex: initial !important;
  }

  .funnel-summary-card__content {
    display: contents !important;
  }

  .funnel-summary-card__total {
    grid-column: 2;
    grid-row: 1;
  }

  .funnel-summary-card__divider {
    display: none;
  }

  .funnel-summary-card__metrics {
    grid-column: 1 / -1;
    display: grid !important;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    width: 100%;
    gap: 12px 8px !important;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }

  .funnel-summary-metric {
    min-width: 0 !important;
  }

  .funnel-summary-metric__value {
    font-size: 24px !important;
  }

  .funnel-summary-metric__label {
    max-width: none !important;
    font-size: 11px !important;
  }

  .funnel-summary-card__progress {
    margin-top: 14px !important;
  }
}

@media (max-width: 640px) {
  .funnel-summary-card {
    padding: 14px !important;
  }

  .funnel-summary-card__metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px 8px !important;
  }

  .funnel-summary-metric__value {
    font-size: 26px !important;
  }

  .funnel-summary-card__total > span:first-child {
    font-size: 28px !important;
  }

  .funnel-summary-card__progress-label {
    font-size: 11px !important;
  }
}
```

- [ ] **Step 5: Run focused verification and verify GREEN**

Run:

```powershell
node --test scripts/revision-contract.test.mjs
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: every command exits with code 0.

- [ ] **Step 6: Review and commit**

Confirm the diff modifies only the three planned implementation files, then run:

```powershell
git add scripts/revision-contract.test.mjs app/funnel-summary/page.tsx app/globals.css
git commit -m "feat: refine responsive funnel summary cards"
```
