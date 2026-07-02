# Dashboard, Pipeline, and Closing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct dashboard period logic, reorganize analytics, and simplify Pipeline inactive records.

**Architecture:** Keep page-level data fetching but centralize deterministic dashboard calculations in a small pure helper module. Reuse Recharts and existing page styling; protect behavior with Node contract tests.

**Tech Stack:** Next.js, React, TypeScript, Supabase, Recharts, Node test runner.

## Global Constraints

- No Supabase schema or production-data changes.
- Do not touch `.claude/`.
- Read relevant `node_modules/next/dist/docs/` guidance before code changes.
- Run `test:report`, `test:contracts`, lint, and production build before push.

---

### Task 1: Dashboard calculation rules

**Files:**
- Create: `lib/dashboard-rules.ts`
- Create: `lib/dashboard-rules.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `periodTarget(monthlyTarget, month, isYtd)`, `isActiveSalesRole(role)`, and `canonicalProjectTotals(totals, projects)`.

- [ ] Write tests proving YTD target multiplication, role inclusion, and zero-filled canonical projects.
- [ ] Run the focused test and confirm it fails before implementation.
- [ ] Implement the pure helpers with typed inputs/outputs.
- [ ] Add the focused test to `test:contracts` and confirm it passes.

### Task 2: Overview corrections and analytics

**Files:**
- Modify: `app/page.tsx`
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Consumes Task 1 helpers.

- [ ] Add contract assertions for dynamic YTD KPI/target, current-vs-previous-month independence, both active roles, no WIN-OR-DIE, monthly chart, and always-visible project chart.
- [ ] Run contracts and confirm the new assertions fail.
- [ ] Update queries/calculations and move the annual chart UI into Overview.
- [ ] Add a Recharts donut plus all canonical project cards and a zero-data state.
- [ ] Run focused tests and contracts until they pass.

### Task 3: Closing WIN-OR-DIE relocation

**Files:**
- Modify: `app/closing/page.tsx`
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Uses an independent current-calendar-month closing dataset so page filters cannot affect WIN-OR-DIE.

- [ ] Add contract assertions that Closing contains WIN-OR-DIE and no annual chart.
- [ ] Run contracts and confirm failure.
- [ ] Remove the chart and render WIN-OR-DIE from current-month hunter totals/targets.
- [ ] Run contracts until they pass.

### Task 4: Pipeline inactive collapse and PDF removal

**Files:**
- Modify: `app/pipeline/page.tsx`
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Produces separate active and inactive filtered/sorted row collections with shared row rendering.

- [ ] Add contract assertions for no PDF export and a default-closed inactive section.
- [ ] Run contracts and confirm failure.
- [ ] Remove PDF code/imports and split row rendering into active and collapsible inactive tables.
- [ ] Preserve edit/delete actions and current search/filter/sort behavior.
- [ ] Run contracts until they pass.

### Task 5: Full verification and delivery

**Files:**
- Verify all modified files; no new production dependencies.

- [ ] Run `npm.cmd run test:report` and expect exit 0.
- [ ] Run `npm.cmd run test:contracts` and expect exit 0.
- [ ] Run `npm.cmd run lint` and expect exit 0.
- [ ] Run `npm.cmd run build` and expect exit 0.
- [ ] Review `git diff --check` and confirm `.claude/` remains untracked and untouched.
- [ ] Commit implementation to `master`; push/deploy only after authorization.
