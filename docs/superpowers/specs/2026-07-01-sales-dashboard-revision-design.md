# Sales Dashboard Revision Design

**Date:** 2026-07-01
**Status:** Approved for implementation planning
**Scope:** Branding, session persistence, Admin, Team, Funnel Summary, Closing, Pipeline, and dashboard revisions.

## Goals

- Simplify interfaces that contain obsolete Target Visit and SP warning controls.
- Keep login valid across tabs and browser restarts until explicit logout.
- Make Funnel Summary, Closing, Pipeline, and dashboard metrics match current business definitions.
- Add first-class Agent names without overloading notes or Sales Person names.
- Preserve historical sales data while hiding resigned Hunters from current operational choices and cards.

## Chosen Approach

Use targeted page changes, a small set of shared UI helpers for repeated Closing/Pipeline behavior, and one backward-compatible database migration. Do not perform a full rewrite of the large page components. Do not disable lint rules to accommodate the changes.

## Branding and Authentication

### Header logo

- Keep the colored logo on the login page.
- Render the post-login header logo as white, using the existing header asset with a deterministic white treatment rather than introducing a second branding flow.

### Cross-tab session

- Replace `sessionStorage` persistence with `localStorage`.
- A valid login remains available across tabs and browser restarts.
- The session ends only when the user presses Logout.
- During rollout, read the previous `sessionStorage` key as a fallback, migrate it into `localStorage`, and remove the old key. This prevents an unnecessary login immediately after deployment.
- Logout clears both storage locations for safety.

## Admin Panel

- Remove Target Visit from the users table.
- Remove Target Visit from create/edit forms.
- Stop sending `visit_target` in Admin save payloads, so editing a user does not overwrite an existing value.
- Keep the database column and its default unchanged for compatibility with historical code and data.

## Team Page

The label “SP” in the removed feature means the old warning level applied to Sales Persons who did not close, not the Sales Person entity itself.

- Remove the `SP0`–`SP5` warning badge and explanatory copy.
- Remove the increase/decrease SP controls and the `adjustSP` update flow.
- Stop selecting `sp_level` where it is no longer needed by the page.
- Preserve Sales Person rows, Hunter relationships, closing details, and omzet totals.
- Do not delete the `sp_level` database column or historical values in this revision.

## Funnel Summary

Add the following metrics to both the team summary and every TM card:

- **Sudah Dihubungi:** `Follow Up + Pipeline + Closing + Dead`, equivalent to every lead except `new`.
- **Visit Dijadwalkan:** count of `visit_dijadwalkan`.
- **Sudah Visit:** count of `sudah_visit`.

Existing grouping remains:

- Follow Up: `bisa_dihub_tidak_angkat`.
- Pipeline: `angkat_tertarik + visit_dijadwalkan + sudah_visit`.
- Closing: `closing`.
- Dead: `tidak_aktif + angkat_tidak_tertarik + lost`.

Visit Dijadwalkan and Sudah Visit are displayed separately but remain subsets of Pipeline; they are not added a second time when calculating Sudah Dihubungi.

## Agent Data Model and Forms

Create migration `037_add_agent_name.sql`:

- Add nullable text column `agent_name` to `konsumen`.
- Do not rewrite existing rows.
- Existing rows with `sales_person = 'Agent'` and no `agent_name` remain valid and display simply as `Agent`.

Closing and Pipeline forms must:

- Reveal a Nama Agent input when Sales Person is `Agent`.
- Require a non-empty Agent name before save.
- Clear the form's Agent name when Sales Person changes away from `Agent`.
- Persist the value to `agent_name` on create and edit.
- Display the value as `Agent — Nama Agent` in tables and details.

The migration must be applied before deploying frontend code that writes `agent_name`.

## Closing Page

### Active Hunters

- Build current Hunter cards and filter choices only from `users` where role is `hunter` and status is `active`.
- Roy Ferdinan, Frans, and other resigned Hunters must not appear as current cards or filter options.
- Historical Closing rows retain and display their stored Hunter names.

### Table layout

- Combine Project and Unit into one column: Project on the first line, Unit on the second line.
- Combine Hunter and Sales into one column: Hunter on the first line, Sales Person or `Agent — Nama Agent` on the second line.

### Cancel Closing

- Add a visible **Batal Closing** action inside the edit flow, separate from closing the modal.
- Require confirmation before changing the record.
- Return the same `konsumen` record to Pipeline with status `hot`.
- Preserve customer, Hunter, Sales/Agent, project, unit, payment method, potential value, visit date, and notes.
- Clear closing-only values: `nilai_hjr`, `closing_date`, `closing_month`, and `closing_year`.
- Refresh the Closing list after success; the record should then appear on Pipeline as Hot.

### Filters

Place controls above the table in this exact order:

1. Search
2. Hunter
3. Project
4. Cara Bayar

Search covers customer name, Hunter, Sales/Agent, project, and unit.

## Pipeline Page

### Table layout

Use the same two-line Project/Unit and Hunter/Sales presentation as Closing.

### Filters

Place controls above the table in this exact order:

1. Search
2. Hunter
3. Project
4. Cara Bayar
5. Status

Status choices and meanings:

- Semua: no status restriction.
- Aktif: `warm` or `hot`.
- Warm: `warm` only.
- Hot: `hot` only.
- Tdk Potensial: `tidak_potensial` only.

Search covers customer name, Hunter, Sales/Agent, project, unit, and notes.

## Dashboard

### Remove chart

- Remove the entire Grafik Performa section and chart-only state, derived data, imports, and controls that become unused.

### Target Omset Alert

- Add a card visually related to Win-Or-Die Alert.
- Show every active Hunter whose current-month omzet is below `monthly_target`.
- Show current omzet, monthly target, achievement percentage, and remaining gap.
- Sort from lowest achievement percentage to highest.
- This card always uses the current calendar month, independent of another dashboard date filter.

### Pipeline Hot

- Rename `Pipeline Aktif` to `Pipeline Hot`.
- Count only Pipeline-board `konsumen` rows with status `hot`.
- Sum `potensi_closing` only for those Hot rows.

## Shared UI Boundaries

- Introduce a small shared filter-bar component or shared filter configuration for Closing and Pipeline so control order and styling cannot drift.
- Introduce a shared Agent-name field/display helper where it removes duplicated validation and formatting.
- Keep page-specific Supabase queries and mutations in their pages; this revision does not introduce a new data-access framework.

## Error Handling

- Agent forms show an inline validation message when Agent is selected without a name.
- Batal Closing does not update local UI until Supabase confirms success.
- Failed mutations keep the modal open and show an actionable error message.
- Loading and empty states remain visible after filter changes.
- Legacy Agent rows without names render safely.

## Verification

Automated checks:

- ESLint returns zero errors and warnings.
- TypeScript `--noEmit` passes.
- Next.js production build passes.
- No new inline lint suppression is introduced.

Browser checks:

- Login in one tab, then open a second tab and confirm no PIN prompt.
- Close and reopen the browser, confirm the session remains until Logout.
- Confirm Target Visit is absent from Admin create/edit/table views.
- Confirm Team has no SP warning levels or adjustment buttons while Sales Person sales data remains.
- Confirm Funnel Summary calculations at team and TM levels.
- Confirm resigned Hunters are absent from current Closing cards and filters.
- Create/edit Agent records in Pipeline and Closing and verify display.
- Cancel a Closing and verify it reappears as Hot in Pipeline.
- Verify filter order and every filter combination on desktop and narrow screens.
- Verify Dashboard has no performance chart, Target Omset Alert uses the current month, and Pipeline Hot matches Hot rows.

## Out of Scope

- Deleting `visit_target` or `sp_level` database columns.
- Removing or rewriting historical records owned by resigned Hunters.
- Replacing the current client-side authentication model with server authentication.
- Full decomposition of the large Closing, Pipeline, Team, or dashboard page components.
