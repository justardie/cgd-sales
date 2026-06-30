# Sales Dashboard Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved branding, session, Admin, Team, Funnel Summary, Closing, Pipeline, and dashboard revisions while preserving historical data.

**Architecture:** Keep Supabase reads and writes inside their existing pages, extract only deterministic business rules and the repeated Closing/Pipeline filter bar, and add one backward-compatible `agent_name` migration. Pure status/metric/display rules receive Node built-in tests; UI behavior receives static contract checks plus browser verification.

**Tech Stack:** Next.js 16.2.4 App Router, React 19.2.4, TypeScript 5, Supabase JS 2, Tailwind CSS 4, Node.js 24 built-in test runner.

## Global Constraints

- Read relevant guides in `node_modules/next/dist/docs/` before changing Next.js code.
- Keep the colored login logo; only the post-login header logo becomes white.
- Session persists across tabs and browser restarts until explicit Logout.
- Do not delete `visit_target`, `sp_level`, resigned-Hunter history, or legacy Agent rows.
- `Aktif` means `warm` or `hot`; canceled Closing returns to `hot`.
- Agent name is mandatory for new or edited rows when `sales_person === "Agent"`.
- Apply migration `037_add_agent_name.sql` before deploying frontend writes to `agent_name`.
- Do not add inline ESLint suppression or a new runtime dependency.

---

### Task 1: Tested dashboard business rules and Agent migration

**Files:**
- Create: `lib/sales-dashboard-rules.ts`
- Create: `lib/sales-dashboard-rules.test.ts`
- Create: `supabase/037_add_agent_name.sql`
- Modify: `package.json`

**Interfaces:**
- Produces: `getFunnelMetrics(counters)`, `matchesPipelineStatus(status, filter)`, and `formatSalesPerson(salesPerson, agentName)`.
- Produces: nullable `konsumen.agent_name` for Closing and Pipeline.

- [ ] **Step 1: Write failing tests for the approved business rules**

```ts
// lib/sales-dashboard-rules.test.ts
import assert from "node:assert/strict"
import test from "node:test"
import {
  formatSalesPerson,
  getFunnelMetrics,
  matchesPipelineStatus,
} from "./sales-dashboard-rules.ts"

const counters = {
  new: 10,
  tidak_aktif: 2,
  bisa_dihub_tidak_angkat: 3,
  angkat_tertarik: 4,
  angkat_tidak_tertarik: 5,
  visit_dijadwalkan: 6,
  sudah_visit: 7,
  closing: 8,
  lost: 9,
}

test("computes contacted, pipeline, and separate visit metrics", () => {
  assert.deepEqual(getFunnelMetrics(counters), {
    contacted: 44,
    followUp: 3,
    pipeline: 17,
    closing: 8,
    dead: 16,
    visitScheduled: 6,
    visited: 7,
  })
})

test("treats active as warm or hot", () => {
  assert.equal(matchesPipelineStatus("warm", "active"), true)
  assert.equal(matchesPipelineStatus("hot", "active"), true)
  assert.equal(matchesPipelineStatus("tidak_potensial", "active"), false)
  assert.equal(matchesPipelineStatus("hot", "all"), true)
})

test("formats named and legacy Agent rows safely", () => {
  assert.equal(formatSalesPerson("Agent", "Dewi"), "Agent — Dewi")
  assert.equal(formatSalesPerson("Agent", null), "Agent")
  assert.equal(formatSalesPerson("Rina", "ignored"), "Rina")
  assert.equal(formatSalesPerson(null, null), "—")
})
```

- [ ] **Step 2: Run the rule tests and verify RED**

Run: `node --test --experimental-strip-types lib/sales-dashboard-rules.test.ts`

Expected: FAIL because `lib/sales-dashboard-rules.ts` does not exist.

- [ ] **Step 3: Implement the minimal typed rule module**

```ts
// lib/sales-dashboard-rules.ts
export interface FunnelCounters {
  new: number
  tidak_aktif: number
  bisa_dihub_tidak_angkat: number
  angkat_tertarik: number
  angkat_tidak_tertarik: number
  visit_dijadwalkan: number
  sudah_visit: number
  closing: number
  lost: number
}

export type PipelineStatusFilter = "all" | "active" | "warm" | "hot" | "tidak_potensial"

export function getFunnelMetrics(c: FunnelCounters) {
  const followUp = c.bisa_dihub_tidak_angkat
  const pipeline = c.angkat_tertarik + c.visit_dijadwalkan + c.sudah_visit
  const closing = c.closing
  const dead = c.tidak_aktif + c.angkat_tidak_tertarik + c.lost
  return {
    contacted: followUp + pipeline + closing + dead,
    followUp,
    pipeline,
    closing,
    dead,
    visitScheduled: c.visit_dijadwalkan,
    visited: c.sudah_visit,
  }
}

export function matchesPipelineStatus(status: string, filter: PipelineStatusFilter) {
  if (filter === "all") return true
  if (filter === "active") return status === "warm" || status === "hot"
  return status === filter
}

export function formatSalesPerson(salesPerson: string | null, agentName: string | null) {
  if (!salesPerson) return "—"
  if (salesPerson !== "Agent") return salesPerson
  return agentName?.trim() ? `Agent — ${agentName.trim()}` : "Agent"
}
```

- [ ] **Step 4: Add the migration and test script**

```sql
-- supabase/037_add_agent_name.sql
ALTER TABLE konsumen
  ADD COLUMN IF NOT EXISTS agent_name TEXT;

COMMENT ON COLUMN konsumen.agent_name IS
  'Nama agent ketika sales_person bernilai Agent; nullable untuk data lama.';
```

Add to `package.json` scripts:

```json
"test:rules": "node --test --experimental-strip-types lib/sales-dashboard-rules.test.ts"
```

- [ ] **Step 5: Verify GREEN and commit**

Run: `npm.cmd run test:rules`

Expected: 3 tests pass, 0 fail.

```powershell
git add lib/sales-dashboard-rules.ts lib/sales-dashboard-rules.test.ts supabase/037_add_agent_name.sql package.json
git commit -m "feat: add tested sales dashboard rules"
```

---

### Task 2: Persistent session, white header logo, and simplified Admin

**Files:**
- Create: `scripts/revision-contract.test.mjs`
- Modify: `lib/auth.ts`
- Modify: `components/Header.tsx`
- Modify: `app/admin/page.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `AuthUser` and storage key `cgd_user`.
- Produces: a `localStorage` session with one-time migration from `sessionStorage`.

- [ ] **Step 1: Write failing source-contract tests**

```js
// scripts/revision-contract.test.mjs
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")

test("auth persists in localStorage and clears legacy sessionStorage", async () => {
  const source = await read("lib/auth.ts")
  assert.match(source, /const SESSION_KEY = ["']cgd_user["']/)
  assert.match(source, /localStorage\.setItem\(SESSION_KEY/)
  assert.match(source, /sessionStorage\.getItem\(SESSION_KEY/)
  assert.match(source, /localStorage\.removeItem\(SESSION_KEY/)
  assert.match(source, /sessionStorage\.removeItem\(SESSION_KEY/)
})

test("header logo is rendered white", async () => {
  const source = await read("components/Header.tsx")
  assert.match(source, /filter:\s*["']brightness\(0\) invert\(1\)["']/)
})

test("Admin no longer exposes Target Visit", async () => {
  const source = await read("app/admin/page.tsx")
  assert.doesNotMatch(source, /Target Visit|visit_target/)
})
```

Add to `package.json` scripts:

```json
"test:contracts": "node --test scripts/revision-contract.test.mjs"
```

- [ ] **Step 2: Run contract tests and verify RED**

Run: `npm.cmd run test:contracts`

Expected: failures for session persistence, white header logo, and Target Visit removal.

- [ ] **Step 3: Implement storage migration and logout cleanup**

```ts
const SESSION_KEY = "cgd_user"

export function saveSession(user: AuthUser) {
  if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function getSession(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const user = JSON.parse(raw) as AuthUser
    localStorage.setItem(SESSION_KEY, raw)
    sessionStorage.removeItem(SESSION_KEY)
    return user
  } catch {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function clearSession() {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}
```

- [ ] **Step 4: Make only the authenticated header logo white**

Add to the existing header Image style:

```tsx
style={{
  objectFit: "contain",
  height: "44px",
  width: "auto",
  filter: "brightness(0) invert(1)",
}}
```

Do not modify `app/login/page.tsx`.

- [ ] **Step 5: Remove Target Visit only from Admin UI and payloads**

Remove `visit_target` from Admin form state, reset/edit mappings, update payload, table header/body, and modal field. Leave `types/index.ts`, database defaults, and historical data intact.

- [ ] **Step 6: Verify and commit**

Run: `npm.cmd run test:contracts && npm.cmd run lint`

Expected: contract tests pass and ESLint exits 0.

```powershell
git add scripts/revision-contract.test.mjs lib/auth.ts components/Header.tsx app/admin/page.tsx package.json
git commit -m "feat: persist sessions and simplify admin"
```

---

### Task 3: Remove SP warning rules while preserving Sales Person reporting

**Files:**
- Modify: `app/team/page.tsx`
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Consumes: existing user, Hunter, and Closing data.
- Produces: Team rows without warning-level state or mutations.

- [ ] **Step 1: Add a failing Team contract test**

```js
test("Team preserves Sales Persons without SP warning controls", async () => {
  const source = await read("app/team/page.tsx")
  assert.doesNotMatch(source, /sp_level|adjustSP|Turunkan SP|Naikkan SP|SP Level per Sales Person/)
  assert.match(source, /Sales Person/)
  assert.match(source, /spOmsetMap/)
})
```

- [ ] **Step 2: Verify RED**

Run: `npm.cmd run test:contracts`

Expected: Team contract fails on old SP warning identifiers.

- [ ] **Step 3: Remove warning-only state and UI**

In `app/team/page.tsx`:

- Remove `sp_level` from `MemberStatus`, Supabase select, and member mapping.
- Remove `saving`, `adjustSP`, `spBadgeColor`, `TrendingUp`, and `TrendingDown` when unused.
- Replace warning badge contents with a neutral Sales Person avatar such as `SP`.
- Remove SP-level text and both adjustment buttons.
- Keep expand/collapse, closing badges, `spOmsetMap`, `spClosingsMap`, and Sales Person detail tables.
- Change the subtitle to `Omset Hunter & Sales Person · MASCOL Division`.

- [ ] **Step 4: Verify and commit**

Run: `npm.cmd run test:contracts && npm.cmd run lint`

Expected: all contract tests pass and ESLint exits 0.

```powershell
git add app/team/page.tsx scripts/revision-contract.test.mjs
git commit -m "feat: remove obsolete SP warning controls"
```

---

### Task 4: Add contacted and separate visit metrics to Funnel Summary

**Files:**
- Modify: `app/funnel-summary/page.tsx`

**Interfaces:**
- Consumes: `getFunnelMetrics` from Task 1 and existing `TmStat` counters.
- Produces: identical approved metrics at team and individual TM levels.

- [ ] **Step 1: Extend rule tests with total invariants**

```ts
test("contacted excludes only untouched leads", () => {
  const metrics = getFunnelMetrics(counters)
  const total = Object.values(counters).reduce((sum, value) => sum + value, 0)
  assert.equal(metrics.contacted, total - counters.new)
  assert.equal(metrics.visitScheduled, counters.visit_dijadwalkan)
  assert.equal(metrics.visited, counters.sudah_visit)
})
```

- [ ] **Step 2: Run the new test and verify it passes against the approved Task 1 contract**

Run: `npm.cmd run test:rules`

Expected: 4 tests pass. This is a characterization check before UI wiring.

- [ ] **Step 3: Wire metrics into team and TM displays**

For `teamTotal` and each `stat`, call:

```ts
const metrics = getFunnelMetrics(stat)
```

Render these pills in both locations:

```tsx
<StatPill value={metrics.contacted} color="#60a5fa" label="Sudah Dihubungi" />
<StatPill value={metrics.followUp} color="#fbbf24" label="Follow Up" />
<StatPill value={metrics.pipeline} color="#a78bfa" label="Pipeline" />
<StatPill value={metrics.visitScheduled} color="#c084fc" label="Visit Dijadwalkan" />
<StatPill value={metrics.visited} color="#2dd4bf" label="Sudah Visit" />
<StatPill value={metrics.closing} color="#34d399" label="Closing" />
<StatPill value={metrics.dead} color="#f87171" label="Dead" />
```

Keep visit percentage based on `metrics.pipeline / stat.total`; do not add visit metrics twice.

- [ ] **Step 4: Verify and commit**

Run: `npm.cmd run test:rules && npm.cmd run lint`

```powershell
git add app/funnel-summary/page.tsx lib/sales-dashboard-rules.test.ts
git commit -m "feat: expand funnel summary metrics"
```

---

### Task 5: Shared Closing/Pipeline filter bar

**Files:**
- Create: `components/SalesFilterBar.tsx`
- Modify: `app/closing/page.tsx`
- Modify: `app/pipeline/page.tsx`

**Interfaces:**
- Produces: `SalesFilterBar` with ordered Search, Hunter, Project, Cara Bayar, and optional Status controls.
- Consumes: controlled string values and option arrays supplied by each page.

- [ ] **Step 1: Add a failing control-order contract test**

```js
test("shared sales filter bar keeps the approved control order", async () => {
  const source = await read("components/SalesFilterBar.tsx").catch(() => "")
  const labels = ["Search", "Hunter", "Project", "Cara Bayar", "Status"]
  const positions = labels.map((label) => source.indexOf(label))
  assert.equal(positions.every((position) => position >= 0), true)
  assert.deepEqual([...positions].sort((a, b) => a - b), positions)
})
```

Run: `npm.cmd run test:contracts`

Expected: FAIL because `components/SalesFilterBar.tsx` does not exist.

- [ ] **Step 2: Define the exact controlled component interface**

```tsx
export interface FilterOption {
  value: string
  label: string
}

interface SalesFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  hunter: string
  onHunterChange: (value: string) => void
  hunterOptions: FilterOption[]
  project: string
  onProjectChange: (value: string) => void
  projectOptions: FilterOption[]
  caraBayar: string
  onCaraBayarChange: (value: string) => void
  caraBayarOptions: FilterOption[]
  status?: string
  onStatusChange?: (value: string) => void
  statusOptions?: FilterOption[]
}
```

- [ ] **Step 3: Implement controls in mandated order**

Render one search input, then Hunter, Project, Cara Bayar selects, followed by Status only when all three optional status props exist. Use existing CSS/Tailwind form styles and responsive wrapping; do not fetch data inside the component.

- [ ] **Step 4: Wire Closing filters**

Add `search`, `filterHunter`, `filterProject`, and `filterCaraBayar` state if absent. Filter Closing rows with case-insensitive matching over customer, Hunter, current Sales Person, project, and unit, then apply the three dropdown values. Task 7 adds Agent-name matching after `agent_name` enters the row type.

- [ ] **Step 5: Wire Pipeline filters**

Add status options exactly:

```ts
const PIPELINE_STATUS_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "warm", label: "Warm" },
  { value: "hot", label: "Hot" },
  { value: "tidak_potensial", label: "Tdk Potensial" },
]
```

Use `matchesPipelineStatus(row.status, filterStatus)` and search customer, Hunter, current Sales Person, project, unit, and notes. Task 6 adds Agent-name matching after `agent_name` enters the row type.

- [ ] **Step 6: Verify and commit**

Run: `npm.cmd run test:rules && npm.cmd run lint`

```powershell
git add components/SalesFilterBar.tsx app/closing/page.tsx app/pipeline/page.tsx
git commit -m "feat: standardize sales table filters"
```

---

### Task 6: Pipeline Agent capture and compact table columns

**Files:**
- Modify: `app/pipeline/page.tsx`
- Modify: `types/index.ts` only if a shared Konsumen type is extended there

**Interfaces:**
- Consumes: `konsumen.agent_name`, `formatSalesPerson`, `SalesFilterBar`.
- Produces: required Agent-name capture on Pipeline create/edit and two-line Project/Unit plus Hunter/Sales cells.

- [ ] **Step 1: Add a failing Pipeline Agent contract test**

```js
test("Pipeline captures and displays Agent names", async () => {
  const source = await read("app/pipeline/page.tsx")
  assert.match(source, /agent_name/)
  assert.match(source, /Nama Agent/)
  assert.match(source, /formatSalesPerson/)
})
```

Run: `npm.cmd run test:contracts`

Expected: FAIL because Pipeline has no `agent_name` support.

- [ ] **Step 2: Extend Pipeline row and form state**

Add `agent_name: string | null` to the row shape and `agent_name: ""` to `emptyForm`. Include `agent_name` in open-edit mapping and save payload:

```ts
agent_name: form.sales_person === "Agent" ? form.agent_name.trim() : null,
```

- [ ] **Step 3: Add Agent validation before the existing save mutation**

```ts
if (form.sales_person === "Agent" && !form.agent_name.trim()) {
  setFormError("Nama Agent wajib diisi")
  return
}
```

When Sales Person changes away from Agent, update both fields:

```ts
setForm((current) => ({
  ...current,
  sales_person: nextSalesPerson,
  agent_name: nextSalesPerson === "Agent" ? current.agent_name : "",
}))
```

- [ ] **Step 4: Render the conditional field**

```tsx
{form.sales_person === "Agent" && (
  <div>
    <label className="text-xs text-slate-500 block mb-1">Nama Agent</label>
    <input
      required
      value={form.agent_name}
      onChange={(event) => setForm((current) => ({ ...current, agent_name: event.target.value }))}
      className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    />
  </div>
)}
```

- [ ] **Step 5: Merge table columns and Agent-aware search**

Render Project on line one and Unit on a muted second line. Render Hunter on line one and `formatSalesPerson(row.sales_person, row.agent_name)` on line two. Include `row.agent_name` in case-insensitive Search matching. Update table headers, `colSpan`, and sorting keys so removed standalone columns leave no alignment errors.

- [ ] **Step 6: Verify and commit**

Run: `npm.cmd run test:rules && npm.cmd run lint && .\node_modules\.bin\tsc.cmd --noEmit --pretty false`

```powershell
git add app/pipeline/page.tsx types/index.ts
git commit -m "feat: capture Agent names in pipeline"
```

---

### Task 7: Closing active Hunters, Agent capture, compact columns, and cancellation

**Files:**
- Modify: `app/closing/page.tsx`
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Consumes: `konsumen.agent_name`, `formatSalesPerson`, and `SalesFilterBar`.
- Produces: active-Hunter cards/options, required Agent input, compact table columns, and confirmed Closing-to-Hot transition.

- [ ] **Step 1: Add a failing Closing workflow contract test**

```js
test("Closing supports active Hunters, Agent names, and cancellation to Hot", async () => {
  const source = await read("app/closing/page.tsx")
  assert.match(source, /agent_name/)
  assert.match(source, /Nama Agent/)
  assert.match(source, /Batal Closing/)
  assert.match(source, /status:\s*["']hot["']/)
  assert.match(source, /\.eq\(["']status["'],\s*["']active["']\)/)
})
```

Run: `npm.cmd run test:contracts`

Expected: FAIL because Closing has no Agent-name or cancellation workflow and does not restrict Hunter status.

- [ ] **Step 2: Extend Closing row and form state**

Add `agent_name` to the selected fields, `KonsumenRow`, `ClosingFormState`, `blankForm`, edit mapping, insert payload, and update payload. Use the same conditional value as Pipeline:

```ts
agent_name: form.sales_person === "Agent" ? form.agent_name.trim() : null,
```

- [ ] **Step 3: Restrict current Hunters to active users**

Change the Hunter query to:

```ts
supabase
  .from("users")
  .select("id,name,monthly_target,role,status")
  .eq("role", "hunter")
  .eq("status", "active")
```

Build cards, form options, and filter options from this result. Do not filter historical Closing rows by current user status.

- [ ] **Step 4: Add the required Agent field and validation**

Use the same validation and conditional input contract as Task 6. Existing Agent rows with a null name must remain editable; saving such a row requires entering the name.

- [ ] **Step 5: Merge Project/Unit and Hunter/Sales columns**

Use two-line cells and `formatSalesPerson`. Include `agent_name` in Search matching. Update headers, footer `colSpan`, sorting, and narrow-screen layout.

- [ ] **Step 6: Implement confirmed Batal Closing mutation**

Add cancellation state and a destructive secondary action in edit mode. After confirmation, run:

```ts
const { error } = await supabase
  .from("konsumen")
  .update({
    status: "hot",
    nilai_hjr: null,
    closing_date: null,
    closing_month: null,
    closing_year: null,
  })
  .eq("id", editingClosing.id)
```

On error, keep the modal open and set `formError` to `Gagal membatalkan closing: ${error.message}`. On success, close edit mode and refresh Closing data.

- [ ] **Step 7: Verify and commit**

Run: `npm.cmd run test:rules && npm.cmd run lint && .\node_modules\.bin\tsc.cmd --noEmit --pretty false`

```powershell
git add app/closing/page.tsx scripts/revision-contract.test.mjs
git commit -m "feat: improve closing workflow and Agent data"
```

---

### Task 8: Dashboard Pipeline Hot and Target Omset Alert

**Files:**
- Modify: `app/page.tsx`
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Consumes: active Hunter `monthly_target`, current-month Closing totals, and Hot Pipeline records.
- Produces: Pipeline Hot KPI and current-month Target Omset Alert.

- [ ] **Step 1: Add failing dashboard contract tests**

```js
test("dashboard removes performance chart and exposes Hot pipeline and target alert", async () => {
  const source = await read("app/page.tsx")
  assert.doesNotMatch(source, /Grafik Performa|BarChart|ResponsiveContainer|showCharts/)
  assert.match(source, /Pipeline Hot/)
  assert.match(source, /TARGET OMSET ALERT/)
  assert.match(source, /\.eq\("status", "hot"\)/)
})
```

- [ ] **Step 2: Verify RED**

Run: `npm.cmd run test:contracts`

Expected: dashboard contract fails on old chart and missing labels.

- [ ] **Step 3: Fetch Hot Pipeline only**

Replace the multi-status Pipeline query with:

```ts
supabase
  .from("konsumen")
  .select("user_id,potensi_closing,status")
  .eq("status", "hot")
  .or("board.eq.pipeline,board.is.null")
```

Rename the KPI label to `Pipeline Hot`; count and sum only this result.

- [ ] **Step 4: Keep current-month Hunter omzet independent from date-mode filters**

Add a dedicated current-month Closing query when the primary date mode is not guaranteed to be MTD. Aggregate by `sales_hunter`, then create:

```ts
const targetAlertHunters = hunters
  .filter((hunter) => hunter.monthly_target > 0 && hunter.omset_current_month < hunter.monthly_target)
  .sort((a, b) =>
    a.omset_current_month / a.monthly_target - b.omset_current_month / b.monthly_target
  )
```

Extend `HunterStat` with `omset_current_month` rather than reusing date-filtered `omset_mtd`.

- [ ] **Step 5: Render Target Omset Alert and remove the chart**

Render every below-target active Hunter with current omzet, monthly target, percentage, and `monthly_target - omset_current_month` gap. Remove chart state, chart-derived values, chart JSX, and Recharts/chart-only icon imports that become unused.

- [ ] **Step 6: Verify and commit**

Run: `npm.cmd run test:contracts && npm.cmd run lint && .\node_modules\.bin\tsc.cmd --noEmit --pretty false`

```powershell
git add app/page.tsx scripts/revision-contract.test.mjs
git commit -m "feat: correct dashboard pipeline and target alerts"
```

---

### Task 9: Full verification, migration sequencing, and production handoff

**Files:**
- Verify: all files changed in Tasks 1–8
- Apply before frontend deploy: `supabase/037_add_agent_name.sql`

**Interfaces:**
- Consumes: completed commits and an updated Supabase schema.
- Produces: a build-ready revision whose production code never writes a missing column.

- [ ] **Step 1: Run the complete automated suite**

```powershell
npm.cmd run test:rules
npm.cmd run test:contracts
npm.cmd run lint
.\node_modules\.bin\tsc.cmd --noEmit --pretty false
npm.cmd run build
.\node_modules\.bin\eslint.cmd . --no-inline-config
git diff --check
```

Expected: every command exits 0; tests report 0 failures; ESLint reports 0 errors and warnings; production build generates all routes.

- [ ] **Step 2: Apply and verify the database migration before frontend deployment**

Run `supabase/037_add_agent_name.sql` in the connected Supabase project. Verify with:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'konsumen'
  AND column_name = 'agent_name';
```

Expected: one nullable `text` column named `agent_name`.

- [ ] **Step 3: Browser verification on the local build**

Verify each approved flow:

1. Login once, open a second tab, and confirm no PIN prompt.
2. Reload after browser restart and confirm session remains; Logout clears it.
3. Admin contains no Target Visit UI.
4. Team contains Sales Person omzet/detail rows but no SP warning levels or adjustment buttons.
5. Funnel team and TM cards show Sudah Dihubungi, Visit Dijadwalkan, and Sudah Visit with correct counts.
6. Closing current cards/filters omit Roy Ferdinan and Frans while historical rows remain readable.
7. Pipeline and Closing require Agent names and display `Agent — Nama`.
8. Closing cancellation returns the record to Pipeline as Hot.
9. Filter order, combined columns, mobile wrapping, Target Omset Alert, and Pipeline Hot all match the spec.

- [ ] **Step 4: Review repository state and commit any verification-only corrections**

```powershell
git status --short
git log --oneline -10
```

Expected: only the user-owned `.claude/` directory may remain untracked; application changes are committed.

- [ ] **Step 5: Push only after migration verification**

```powershell
git push origin master
```

Expected: Netlify builds the pushed `master` commit and reports Production Published.
