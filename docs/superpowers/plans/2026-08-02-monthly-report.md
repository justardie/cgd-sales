# Monthly Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate `/monthly-report` page that snapshots and downloads a Hunter's full-calendar-month closing, current Hot pipeline, monthly visit Pivot, and next-month activity plan.

**Architecture:** Reuse the existing weekly report data types, Pivot parser, visit calculation, and HTML generator. Add a `monthly` rendering mode and a calendar-month range helper, keep both report types in `weekly_reports` with an explicit discriminator, and implement one new client page following the existing report flow.

**Tech Stack:** Next.js 16.2.4 App Router, React 19.2.4, TypeScript, Supabase JS 2.105.1, SheetJS, Node test runner, Tailwind CSS 4.

## Global Constraints

- `/report` remains behaviorally weekly.
- `/monthly-report` is a separate route for Hunter and Admin.
- Monthly closing uses the complete selected calendar month; Hot pipeline remains unfiltered by date.
- Pivot visit parsing uses only the selected month and year.
- Reuse installed dependencies and existing report helpers; add no packages.
- Finalized history is separated by `report_type` and downloaded from its stored snapshot.

---

### Task 1: Calendar-month period and report rendering mode

**Files:**
- Modify: `lib/weekly-report.test.ts`
- Modify: `lib/weekly-report.ts`

**Interfaces:**
- Produces: `getMonthRange(monthValue: string): { start: string; end: string }`
- Produces: `buildReportHtml(data: ReportSnapshot, reportType?: "weekly" | "monthly"): string`
- Preserves: omitted `reportType` renders the existing weekly report.

- [ ] **Step 1: Write failing tests**

Add imports and assertions:

```ts
import { buildReportHtml, calculateVisitSummary, getMonthRange, getMtdRange, getPreviousWeekPeriod, normalizePersonName } from "./weekly-report.ts"

test("month input expands to the complete calendar month", () => {
  assert.deepEqual(getMonthRange("2026-02"), { start: "2026-02-01", end: "2026-02-28" })
  assert.deepEqual(getMonthRange("2028-02"), { start: "2028-02-01", end: "2028-02-29" })
})

test("monthly report uses monthly copy while weekly remains unchanged", () => {
  const data = { hunterName: "Andre", periodStart: "2026-07-01", periodEnd: "2026-07-31", coverage: [], monthlyTarget: 100, winOrDieTarget: 50, closings: [], pipelines: [], hunterVisits: 0, salesVisits: [], activities: [] }
  const monthly = buildReportHtml(data, "monthly")
  assert.match(monthly, /SALES MONTHLY REPORT/)
  assert.match(monthly, /Closing Bulanan/)
  assert.match(monthly, /Rencana Aktivitas Bulan Depan/)
  assert.match(buildReportHtml(data), /SALES WEEKLY REPORT/)
})
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm.cmd run test:report`

Expected: FAIL because `getMonthRange` and monthly rendering mode do not exist.

- [ ] **Step 3: Implement the minimal helper and copy switches**

In `lib/weekly-report.ts`, compute the month end without timezone drift:

```ts
export function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number)
  const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { start: `${monthValue}-01`, end: `${monthValue}-${String(endDay).padStart(2, "0")}` }
}
```

Change `buildReportHtml` to accept `reportType = "weekly"`, derive four strings (`reportTitle`, `closingLabel`, `closingPeriodLabel`, `activityLabel`), and use those strings in the existing single HTML template. Do not duplicate the template.

- [ ] **Step 4: Run report tests**

Run: `npm.cmd run test:report`

Expected: all report tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add lib/weekly-report.ts lib/weekly-report.test.ts
git commit -m "feat: support monthly report periods and output"
```

---

### Task 2: Persist weekly and monthly snapshots separately

**Files:**
- Create: `supabase/043_monthly_reports.sql`
- Modify: `app/report/page.tsx`
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Database column: `weekly_reports.report_type TEXT NOT NULL DEFAULT 'weekly' CHECK (report_type IN ('weekly','monthly'))`
- Unique key: `(user_id, report_type, period_start, period_end)`
- Weekly page always reads and writes `report_type = "weekly"`.

- [ ] **Step 1: Add a failing contract check**

In `scripts/revision-contract.test.mjs`, read `supabase/043_monthly_reports.sql` and assert it contains `report_type`, both allowed values, and the four-column unique constraint. Assert `app/report/page.tsx` filters `.eq("report_type", "weekly")` and includes `report_type: "weekly"` in its payload.

- [ ] **Step 2: Run contracts and verify failure**

Run: `npm.cmd run test:contracts`

Expected: FAIL because the migration and weekly discriminator are absent.

- [ ] **Step 3: Add the migration**

Create `supabase/043_monthly_reports.sql`:

```sql
ALTER TABLE weekly_reports
  ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'weekly'
  CHECK (report_type IN ('weekly', 'monthly'));

ALTER TABLE weekly_reports
  DROP CONSTRAINT IF EXISTS weekly_reports_user_id_period_start_period_end_key;

ALTER TABLE weekly_reports
  ADD CONSTRAINT weekly_reports_user_report_type_period_key
  UNIQUE (user_id, report_type, period_start, period_end);
```

- [ ] **Step 4: Isolate weekly page queries**

In `app/report/page.tsx`:

- Add `.eq("report_type", "weekly")` to report history loading.
- Add `report_type: "weekly"` to the finalization payload.
- Change `onConflict` to `user_id,report_type,period_start,period_end`.
- Keep deletion by report `id` unchanged.

- [ ] **Step 5: Run contract and report tests**

Run: `npm.cmd run test:contracts`

Run: `npm.cmd run test:report`

Expected: both commands PASS.

- [ ] **Step 6: Commit**

```powershell
git add supabase/043_monthly_reports.sql app/report/page.tsx scripts/revision-contract.test.mjs
git commit -m "feat: separate weekly and monthly report snapshots"
```

---

### Task 3: Monthly report page

**Files:**
- Create: `app/monthly-report/page.tsx`

**Interfaces:**
- Consumes: `getMonthRange`, `monthsInRange`, `parsePivotSheet`, `calculateVisitSummary`, and `buildReportHtml(snapshot, "monthly")` from `lib/weekly-report.ts`.
- Consumes: `weekly_reports.report_type = "monthly"` from Task 2.
- Produces: `/monthly-report` client page.

- [ ] **Step 1: Create the page using the weekly flow**

Copy only the page-level flow from `app/report/page.tsx`, then make these exact substitutions:

```ts
const [reportMonth, setReportMonth] = useState(iso(new Date()).slice(0, 7))
const { start: periodStart, end: periodEnd } = useMemo(() => getMonthRange(reportMonth), [reportMonth])
```

Operational data rules:

```ts
supabase.from("konsumen")
  .select("sales_person,name,project,unit,nilai_hjr,visit_date,closing_date")
  .eq("status", "closing")
  .eq("sales_hunter", user.name)
  .gte("closing_date", periodStart)
  .lte("closing_date", periodEnd)
```

Keep the existing Hot pipeline query unchanged. Parse Pivot with `monthsInRange(periodStart, periodEnd)`. Load history with `.eq("report_type", "monthly")`; save `report_type: "monthly"` and conflict target `user_id,report_type,period_start,period_end`.

- [ ] **Step 2: Apply monthly labels and download name**

Use:

```ts
buildReportHtml(data, "monthly")
`Monthly Report - ${data.hunterName} - ${data.periodStart.slice(0, 7)}.html`
```

Visible copy must include `MONTHLY REPORT`, `Monthly Sales Report · MASCOL Division`, `Bulan Laporan`, `Closing Bulanan`, `Omset Bulanan`, and `Rencana Aktivitas Bulan Depan`.

- [ ] **Step 3: Add page contract assertions**

Extend `scripts/revision-contract.test.mjs` to assert that `app/monthly-report/page.tsx` contains the monthly report discriminator, `getMonthRange`, monthly HTML mode, full-month closing range, and unchanged Hot pipeline condition.

- [ ] **Step 4: Run tests and type checking**

Run: `npm.cmd run test:report`

Run: `npm.cmd run test:contracts`

Run: `npm.cmd run typecheck`

Expected: all commands PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/monthly-report/page.tsx scripts/revision-contract.test.mjs
git commit -m "feat: add monthly sales report page"
```

---

### Task 4: Desktop navigation and configurable access

**Files:**
- Modify: `components/Header.tsx`
- Modify: `lib/access-settings.ts`
- Create: `supabase/044_monthly_report_access.sql`
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Adds menu key `monthly_report` with route `/monthly-report`.
- Admin and Hunter desktop defaults include `monthly_report`; tablet/mobile defaults remain unchanged.

- [ ] **Step 1: Add failing navigation contract assertions**

Assert the header and access settings contain `/monthly-report`, `MONTHLY REPORT`, and `monthly_report`, and that the new migration appends that key only for admin/Hunter desktop access rows.

- [ ] **Step 2: Run contracts and verify failure**

Run: `npm.cmd run test:contracts`

Expected: FAIL because the menu route and stored defaults are absent.

- [ ] **Step 3: Add the header and access-setting menu item**

Add after the weekly report item:

```ts
{ href: "/monthly-report", label: "MONTHLY REPORT", reportAccess: true }
```

Add to `MENU_ITEMS`:

```ts
{ key: "monthly_report", label: "MONTHLY REPORT", href: "/monthly-report" }
```

Append `monthly_report` beside `report` in admin and Hunter `desktop_menus` only.

- [ ] **Step 4: Migrate existing stored access settings**

Create `supabase/044_monthly_report_access.sql`:

```sql
UPDATE role_access_settings
SET desktop_menus = array_append(desktop_menus, 'monthly_report'), updated_at = NOW()
WHERE role_key IN ('admin', 'hunter')
  AND 'report' = ANY(desktop_menus)
  AND NOT ('monthly_report' = ANY(desktop_menus));
```

- [ ] **Step 5: Run contracts, lint, and build**

Run: `npm.cmd run test:contracts`

Run: `npm.cmd run lint`

Run: `npm.cmd run build`

Expected: all commands PASS.

- [ ] **Step 6: Commit**

```powershell
git add components/Header.tsx lib/access-settings.ts supabase/044_monthly_report_access.sql scripts/revision-contract.test.mjs
git commit -m "feat: expose monthly report navigation"
```

---

### Task 5: Final verification

**Files:**
- Verify only; fix only defects caused by Tasks 1–4.

**Interfaces:**
- Verifies the full monthly report feature and weekly regression safety.

- [ ] **Step 1: Run the focused suites**

Run: `npm.cmd run test:report`

Run: `npm.cmd run test:contracts`

Expected: PASS.

- [ ] **Step 2: Run static and production checks**

Run: `npm.cmd run typecheck`

Run: `npm.cmd run lint`

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff HEAD~4 --check`

Run: `git status --short`

Expected: no whitespace errors; only the user's pre-existing untracked files may remain.
