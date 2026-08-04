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

test("auth normalizes persisted legacy Telemarketing sessions", async () => {
  const source = await read("lib/auth.ts")
  assert.match(source, /\(user\.role as string\) === 'telemarketing'/)
  assert.match(source, /user\.role = 'sales_person'/)
  assert.match(source, /user\.has_tm_access = true/)
  assert.match(source, /localStorage\.setItem\(SESSION_KEY, JSON\.stringify\(user\)\)/)
})

test("header logo is rendered white", async () => {
  const source = await read("components/Header.tsx")
  assert.match(source, /filter:\s*theme === "dark" \? "brightness\(0\) invert\(1\)" : "none"/)
})

test("Admin no longer exposes Target Visit", async () => {
  const source = await read("app/admin/page.tsx")
  assert.doesNotMatch(source, /Target Visit|visit_target/)
})

test("Team preserves Sales Persons without SP warning controls", async () => {
  const source = await read("app/team/page.tsx")
  assert.doesNotMatch(source, /sp_level|adjustSP|Turunkan SP|Naikkan SP|SP Level per Sales Person/)
  assert.match(source, /Sales Person/)
  assert.match(source, /spOmsetMap/)
})

test("shared sales filter bar keeps the approved control order", async () => {
  const source = await read("components/SalesFilterBar.tsx").catch(() => "")
  const labels = ["Search", "Hunter", "Project", "Cara Bayar", "Status"]
  const positions = labels.map((label) => source.indexOf(label))
  assert.equal(positions.every((position) => position >= 0), true)
  assert.deepEqual([...positions].sort((a, b) => a - b), positions)
})

test("Pipeline captures and displays Agent names", async () => {
  const source = await read("app/pipeline/page.tsx")
  assert.match(source, /agent_name/)
  assert.match(source, /Nama Agent/)
  assert.match(source, /formatSalesPerson/)
})

test("Closing supports active Hunters, Agent names, and cancellation to Hot", async () => {
  const source = await read("app/closing/page.tsx")
  assert.match(source, /agent_name/)
  assert.match(source, /Nama Agent/)
  assert.match(source, /Batal Closing/)
  assert.match(source, /status:\s*["']hot["']/)
  assert.match(source, /\.eq\(["']status["'],\s*["']active["']\)/)
})

test("dashboard applies period-independent KPIs and includes active Sales Persons", async () => {
  const source = await read("app/page.tsx")
  assert.match(source, /periodTarget/)
  assert.match(source, /\.eq\("role", "sales_person"\)\.eq\("status", "active"\)/)
  assert.match(source, /closingsCurrentMonth/)
  assert.match(source, /closingsPreviousMonth/)
  assert.match(source, /Pipeline Hot/)
  assert.match(source, /TARGET OMSET ALERT/)
  assert.match(source, /\.eq\("status", "hot"\)/)
})

test("desktop header navigation uses a sliding hover glider", async () => {
  const header = await read("components/Header.tsx")
  const css = await read("app/globals.css")
  assert.match(header, /nav-glider/)
  assert.match(header, /onMouseEnter/)
  assert.match(header, /onMouseLeave/)
  assert.match(css, /\.nav-glider/)
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
})

test("monthly chart and always-visible project donut live on Overview", async () => {
  const source = await read("app/page.tsx")
  assert.match(source, /Omset Bulanan/)
  assert.match(source, /ResponsiveContainer/)
  assert.match(source, /canonicalProjectTotals/)
  assert.match(source, /PieChart/)
  assert.doesNotMatch(source, /Minimal OR/)
})

test("Closing owns current-month WIN-OR-DIE and no longer owns monthly chart", async () => {
  const source = await read("app/closing/page.tsx")
  assert.match(source, /Minimal OR/)
  assert.match(source, /win_or_die_target/)
  assert.doesNotMatch(source, /Omset Bulanan|LineChart|ResponsiveContainer/)
})

test("Pipeline removes PDF export and collapses inactive records", async () => {
  const source = await read("app/pipeline/page.tsx")
  assert.doesNotMatch(source, /handleSharePDF|Export ke PDF|> PDF/)
  assert.match(source, /showInactive/)
  assert.match(source, /Tampilkan Tidak Potensial/)
  assert.match(source, /inactiveRows/)
})

test("Pipeline exports active filtered rows and stores structured progress", async () => {
  const source = await read("app/pipeline/page.tsx")
  const formatter = await read("lib/pipeline-export.ts")
  const migration = await read("supabase/040_structured_pipeline_progress.sql")
  assert.match(source, /Export Aktif \(\.txt\)/)
  assert.match(source, /formatPipelineExport\(filtered\.map/)
  assert.match(source, /Kendala/)
  assert.match(source, /Next Action/)
  assert.match(source, /Target Closing/)
  assert.match(formatter, /status === "warm" \|\| row\.status === "hot"/)
  assert.match(migration, /kendala TEXT/)
  assert.match(migration, /next_action TEXT/)
  assert.match(migration, /target_closing DATE/)
})

test("Unit Special page exposes three editable stock tables", async () => {
  const page = await read("app/unit-special/page.tsx")
  const helper = await read("lib/unit-special.ts")
  const migration = await read("supabase/041_unit_special.sql")
  const header = await read("components/Header.tsx")
  assert.match(page, /Unit Special/)
  assert.match(page, /UNIT_SPECIAL_CATEGORIES\.map/)
  assert.match(page, /unit_special/)
  assert.match(page, /UnitInvestorTerms/)
  assert.match(page, /Syarat &amp; Ketentuan/)
  assert.match(page, /BCA 061-6391288/)
  assert.match(page, /Export PDF/)
  assert.match(page, /autoTable/)
  assert.match(page, /toggleSort/)
  assert.match(page, /Edit Bulk/)
  assert.match(page, /Simpan Semua/)
  assert.match(page, /handleBulkSave/)
  assert.match(page, /row\.status === "Sold"/)
  assert.match(page, /openEdit/)
  assert.match(page, /handleDelete/)
  assert.match(page, /PROJECT_NAMES/)
  assert.match(helper, /Unit Buyback/)
  assert.match(helper, /Unit Investor/)
  assert.match(helper, /Stock Sudah SPK/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS unit_special/)
  assert.match(migration, /CHECK \(status IN \('Open', 'Sold'\)\)/)
  assert.match(header, /\/unit-special/)
})

test("Non Sales user-facing labels do not use the old role name", async () => {
  const login = await read("app/login/page.tsx")
  const admin = await read("app/admin/page.tsx")
  const taskForce = await read("app/task-force/page.tsx")
  const shell = await read("components/DashboardShell.tsx")
  assert.match(login, /Non Sales/)
  assert.match(admin, /Non Sales/)
  assert.match(taskForce, /Non Sales/)
  assert.doesNotMatch(login, /Task Force/)
  assert.doesNotMatch(admin, /Task Force/)
  assert.doesNotMatch(taskForce, /Task Force/)
  assert.doesNotMatch(shell, /Task Force/)
})

test("Admin documents role access and stores Telemarketing as Sales Person with TM access", async () => {
  const admin = await read("app/admin/page.tsx")
  const roleAccessPage = await read("app/role-access/page.tsx")
  const roleAccessData = await read("lib/role-access.ts")
  const header = await read("components/Header.tsx")
  const types = await read("types/index.ts")
  assert.match(roleAccessPage, /Setting Role &amp; Akses Data/)
  assert.match(roleAccessPage, /ACCESS_ROLES\.map/)
  assert.match(roleAccessData, /Telemarketing/)
  assert.match(admin, /Akses: Overview, Pipeline, Closing, Leads Funnel, Funnel Summary/)
  assert.match(roleAccessData, /menu: "Overview, Pipeline, Closing, Leads Funnel, Funnel Summary"/)
  assert.match(header, /href="\/role-access"/)
  assert.match(header, /Role &amp; Akses Data/)
  assert.match(admin, /Telemarketing is stored as Sales Person/)
  assert.match(admin, /normalizedRole = form\.role === "telemarketing" \? "sales_person" : form\.role/)
  assert.match(admin, /has_tm_access/)
  assert.match(admin, /u\.role === "task_force"\s+\?\s+"Non Sales"/)
  assert.match(types, /has_tm_access\?: boolean/)
})

test("Telemarketing is an access profile, not a database role", async () => {
  const types = await read("types/index.ts")
  const migration = await read("supabase/047_unify_telemarketing_role.sql")
  assert.doesNotMatch(types, /\|\s*'telemarketing'/)
  assert.match(migration, /SET role = 'sales_person', has_tm_access = true/)
  assert.match(migration, /role IN \('admin', 'hunter', 'sales_person', 'dgm', 'admin_dgm', 'task_force'\)/)
  assert.doesNotMatch(migration.match(/ADD CONSTRAINT users_role_check[\s\S]*?;/)?.[0] ?? "", /telemarketing/)

  for (const path of [
    "components/DashboardShell.tsx",
    "app/funnel/page.tsx",
    "app/funnel-summary/page.tsx",
  ]) {
    assert.doesNotMatch(await read(path), /role === "telemarketing"/)
  }

  for (const path of [
    "app/page.tsx",
    "app/pipeline/page.tsx",
    "app/closing/page.tsx",
    "app/task-force/page.tsx",
    "app/report/page.tsx",
    "app/monthly-report/page.tsx",
  ]) {
    assert.doesNotMatch(await read(path), /\["sales_person", "telemarketing"\]/)
  }
})

test("Role Access is editable per role, device, and user data scope", async () => {
  const page = await read("app/role-access/page.tsx")
  const settings = await read("lib/access-settings.ts")
  const migration = await read("supabase/042_access_settings.sql")
  assert.match(page, /Simpan Setting/)
  assert.match(page, /desktop_menus/)
  assert.match(page, /tablet_menus/)
  assert.match(page, /mobile_menus/)
  assert.match(page, /user_access_overrides/)
  assert.match(settings, /MENU_ITEMS/)
  assert.match(settings, /team_only/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS role_access_settings/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS user_access_overrides/)
})

test("Sales Telemarketing navigation is identical on every device and has no mobile FAB", async () => {
  const header = await read("components/Header.tsx")
  const sidebar = await read("components/Sidebar.tsx")
  const settings = await read("lib/access-settings.ts")
  const css = await read("app/globals.css")
  for (const source of [header, sidebar]) {
    assert.match(source, /TELEMARKETING_NAV_ITEMS/)
    assert.match(source, /isSalesTelemarketing/)
    assert.doesNotMatch(source, /role === "telemarketing"/)
  }
  assert.match(header, /salesTelemarketing \? "Telemarketing" : user\?\.role/)
  assert.match(sidebar, /salesTelemarketing[\s\S]*showFab\s*=\s*false/)
  assert.match(sidebar, /bottom-nav\$\{salesTelemarketing \? " bottom-nav--sales-tm" : ""\}/)
  assert.match(css, /\.bottom-nav--sales-tm \.bottom-nav__inner\s*\{[^}]*padding:\s*6px 4px;[^}]*gap:\s*0;/s)
  assert.match(css, /\.bottom-nav--sales-tm \.bottom-nav__item\s*\{[^}]*min-width:\s*0;[^}]*padding:\s*6px 2px;/s)
  assert.match(css, /\.bottom-nav--sales-tm \.bottom-nav__label\s*\{[^}]*white-space:\s*normal;[^}]*text-align:\s*center;[^}]*line-height:\s*1\.1;/s)
  assert.match(settings, /desktop_menus:\s*\[\.\.\.TELEMARKETING_MENU_KEYS\]/)
  assert.match(settings, /tablet_menus:\s*\[\.\.\.TELEMARKETING_MENU_KEYS\]/)
  assert.match(settings, /mobile_menus:\s*\[\.\.\.TELEMARKETING_MENU_KEYS\]/)
})

test("mobile navigation activates only the exact current route", async () => {
  const sidebar = await read("components/Sidebar.tsx")
  assert.match(sidebar, /return pathname === href/)
  assert.doesNotMatch(sidebar, /pathname\.startsWith\(href\)/)
})

test("Telemarketing rollout preflights schema before changing users", async () => {
  const migration = await read("supabase/047_unify_telemarketing_role.sql")
  const lock = migration.indexOf("LOCK TABLE public.users IN SHARE ROW EXCLUSIVE MODE")
  const preflight = migration.indexOf("Role schema preflight passed")
  const update = migration.indexOf("UPDATE public.users")
  const drop = migration.indexOf("ALTER TABLE public.users DROP CONSTRAINT")

  assert.ok(preflight > 0)
  assert.ok(lock > 0)
  assert.ok(lock < preflight)
  assert.ok(preflight < update)
  assert.ok(preflight < drop)
  assert.match(migration, /column_name = 'role'/)
  assert.match(migration, /column_name = 'has_tm_access'[\s\S]*data_type <> 'boolean'/)
  assert.match(migration, /conname = 'users_role_check'/)
  assert.match(migration, /Unexpected public\.users users_role_check definition/)
  assert.match(migration, /DROP CONSTRAINT users_role_check;/)
  assert.doesNotMatch(migration, /DROP CONSTRAINT IF EXISTS users_role_check/)
})

test("Funnel pages expose approved cards without Pipeline", async () => {
  const funnel = await read("app/funnel/page.tsx")
  const summary = await read("app/funnel-summary/page.tsx")
  assert.match(funnel, /const \[kpiFilter, setKpiFilter\]/)
  assert.match(funnel, /filterFunnelKpiLeads/)
  assert.match(funnel, /aria-pressed=\{k\.filter === kpiFilter\}/)
  for (const source of [funnel, summary]) {
    assert.match(source, /Visit Dijadwalkan/)
    assert.match(source, /label="Visit"|label:\s*"Visit"/)
    assert.doesNotMatch(source, /label="Pipeline"|label:\s*"Pipeline"/)
  }
})

test("Weekly Report supports Pivot, final snapshots, deletion, and HTML download", async () => {
  const page = await read("app/report/page.tsx")
  const domain = await read("lib/weekly-report.ts")
  const migration = await read("supabase/038_weekly_reports.sql")
  assert.match(page, /activities analysis/)
  assert.match(page, /Tanggal Laporan/)
  assert.match(page, /Periode Otomatis \(Senin–Minggu\)/)
  assert.match(page, /getPreviousWeekPeriod/)
  assert.doesNotMatch(page, /Simpan Draft|save\("draft"\)/)
  assert.match(page, /Finalisasi &amp; Download/)
  assert.match(page, /deleteReport/)
  assert.match(page, /Hapus report ini\?/)
  assert.match(domain, /@page\{size:A4 landscape/)
  assert.match(domain, /Print \/ PDF/)
  assert.match(domain, /Progress Target Omset/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS weekly_reports/)
  assert.match(migration, /project_coverage/)
})

test("weekly snapshots are isolated from monthly snapshots", async () => {
  const page = await read("app/report/page.tsx")
  const migration = await read("supabase/043_monthly_reports.sql")
  assert.match(migration, /report_type/)
  assert.match(migration, /'weekly'/)
  assert.match(migration, /'monthly'/)
  assert.match(migration, /UNIQUE \(user_id, report_type, period_start, period_end\)/)
  assert.match(page, /\.eq\("report_type", "weekly"\)/)
  assert.match(page, /report_type: "weekly"/)
  assert.match(page, /onConflict: "user_id,report_type,period_start,period_end"/)
})

test("Monthly Report uses a full-month final snapshot with required review fields", async () => {
  const page = await read("app/monthly-report/page.tsx")
  assert.match(page, /report_type", "monthly"/)
  assert.match(page, /getMonthRange/)
  assert.match(page, /buildReportHtml\(data, "monthly"\)/)
  assert.match(page, /\.gte\("closing_date", periodStart\)/)
  assert.match(page, /\.lte\("closing_date", periodEnd\)/)
  assert.match(page, /\.eq\("status", "hot"\).*\.eq\("sales_hunter", user\.name\).*\.or\("board\.eq\.pipeline,board\.is\.null"\)/s)
  for (const label of ["What's Good", "What's Bad", "What's Next"]) assert.match(page, new RegExp(label))
  assert.match(page, /Isi What's Good, What's Bad, dan What's Next sebelum finalisasi\./)
})

test("Monthly Report clears period-bound Pivot data and ignores stale loads", async () => {
  const page = await read("app/monthly-report/page.tsx")
  assert.match(page, /function changeReportMonth\(value: string\) \{ if \(!\/\^\\d\{4\}-\(0\[1-9\]\|1\[0-2\]\)\$\/\.test\(value\)\) return; \+\+operationalRequest\.current; \+\+pivotRequest\.current; setOperationalPeriod\(""\); setVisits\(\{ hunterVisits: 0, sales: \[\] \}\); setPivotFilename\(""\); setClosings\(\[\]\); setPipelines\(\[\]\); setMonthlyReview\(\{ good: "", bad: "", next: "" \}\); setReportMonth\(value\) \}/)
  assert.match(page, /onChange=\{changeReportMonth\}/)
  assert.doesNotMatch(page, /useEffect\(\(\) => \{ setOperationalPeriod/)
  assert.match(page, /const requestId = \+\+operationalRequest\.current/)
  assert.match(page, /if \(requestId !== operationalRequest\.current\) return/)
  assert.match(page, /const requestId = \+\+pivotRequest\.current/)
  assert.match(page, /if \(requestId !== pivotRequest\.current\) return/)
  assert.match(page, /parsePivotSheet\(raw, monthsInRange\(periodStart, periodEnd\), true\)/)
})

test("Monthly Report initializes from local time and surfaces history load failures", async () => {
  const page = await read("app/monthly-report/page.tsx")
  assert.match(page, /const localMonth = \(date: Date\) => `\$\{date\.getFullYear\(\)\}-\$\{String\(date\.getMonth\(\) \+ 1\)\.padStart\(2, "0"\)\}`/)
  assert.match(page, /useState\(localMonth\(new Date\(\)\)\)/)
  assert.match(page, /const \{ data, error \} = await query/)
  assert.match(page, /if \(error\) \{[\s\S]*?setMessage\(errorMessage\); showToast\(errorMessage, "error"\)[\s\S]*?return[\s\S]*?\}/)
  assert.match(page, /\}, \[user, isAdmin, showToast\]\)/)
})

test("Monthly Report is available to weekly-report desktop roles only", async () => {
  const header = await read("components/Header.tsx")
  const settings = await read("lib/access-settings.ts")
  const migration = await read("supabase/044_monthly_report_access.sql")
  assert.match(header, /\{ href: "\/monthly-report", label: "MONTHLY REPORT", reportAccess: true \}/)
  assert.match(header, /\{ href: "\/report",\s+label: "REPORT",\s+reportAccess: true\s+\},\r?\n  \{ href: "\/monthly-report"/)
  assert.match(settings, /\{ key: "monthly_report", label: "MONTHLY REPORT", href: "\/monthly-report" \}/)
  assert.match(settings, /admin:[\s\S]*desktop_menus: \[[^\]]*"report", "monthly_report"/)
  assert.match(settings, /hunter:[\s\S]*desktop_menus: \[[^\]]*"report", "monthly_report"/)
  for (const role of ["sales_person", "telemarketing", "task_force"]) {
    const roleSettings = settings.match(new RegExp(`${role}: \\{[\\s\\S]*?\\n  \\},`))?.[0] ?? ""
    assert.doesNotMatch(roleSettings, /"monthly_report"/)
  }
  assert.match(migration, /role_key IN \('admin', 'hunter'\)/)
  assert.match(migration, /array_append\(desktop_menus, 'monthly_report'\)/)
  assert.match(migration, /'report' = ANY\(desktop_menus\)/)
  assert.match(migration, /NOT \('monthly_report' = ANY\(desktop_menus\)\)/)
})

test("Monthly Report waits for the current operational load before accepting a Pivot", async () => {
  const page = await read("app/monthly-report/page.tsx")
  assert.match(page, /const \[operationalPeriod, setOperationalPeriod\] = useState\(""\)/)
  assert.match(page, /const operationalReady = operationalPeriod === `\$\{periodStart\}:\$\{periodEnd\}`/)
  assert.match(page, /if \(requestId !== operationalRequest\.current\) return[\s\S]*setOperationalPeriod\(`\$\{periodStart\}:\$\{periodEnd\}`\)/)
  assert.match(page, /disabled=\{!operationalReady\}/)
  assert.equal((page.match(/if \(!operationalReady\)/g) || []).length, 2)
  assert.match(page, /setMessage\(loadMessage\); showToast\(loadMessage, "error"\)/)
})

test("Report date and month pickers use a larger white calendar icon", async () => {
  const page = await read("app/report/page.tsx")
  const monthlyPage = await read("app/monthly-report/page.tsx")
  const css = await read("app/globals.css")
  assert.match(page, /report-date-input/)
  assert.match(monthlyPage, /\["date", "month"\]\.includes\(type\)[\s\S]*?report-date-input/)
  assert.match(css, /report-date-input::-webkit-calendar-picker-indicator/)
  assert.match(css, /filter:\s*brightness\(0\) invert\(1\)/)
  assert.match(css, /width:\s*20px/)
})

test("Team lets admins manage multi-project coverage", async () => {
  const source = await read("app/team/page.tsx")
  assert.match(source, /Atur Coverage/)
  assert.match(source, /PROJECT_NAMES\.map/)
  assert.match(source, /project_coverage/)
})

test("Pipeline and Closing share the Hunter team scope", async () => {
  for (const path of ["app/pipeline/page.tsx", "app/closing/page.tsx"]) {
    const source = await read(path)
    assert.match(source, /filterRecordsForHunterTeam/)
    assert.match(source, /select\("id,name,hunter_name,status"\)/)
    assert.match(source, /user\.role === "sales_person"/)
    assert.match(source, /Sales Hunter belum ditentukan/)
  }

  const closing = await read("app/closing/page.tsx")
  const salesBranch = closing.match(/else if \(user && user\.role === "sales_person"\) \{[\s\S]*?\n    \} else \{/)?.[0] ?? ""
  assert.match(salesBranch, /setClosings\(scoped\.records\)/)
  assert.match(salesBranch, /setPeriodClosings\(scoped\.records\)/)
})

test("Pipeline and Closing bind ownership checks to mutation handlers and controls", async () => {
  const pipeline = await read("app/pipeline/page.tsx")
  const closing = await read("app/closing/page.tsx")

  for (const [name, nextName] of [
    ["openEdit", "openClosingConfirm"],
    ["openClosingConfirm", "handleClosingConfirm"],
    ["handleClosingConfirm", "handleSalesPersonChange"],
    ["handleDelete", "const filtered"],
  ]) {
    const block = pipeline.match(new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?(?=\\n  (?:async )?function ${nextName}|\\n  ${nextName})`))?.[0] ?? ""
    assert.match(block, /canManageRecord\(user\?\.role, user\?\.id,/)
  }
  const pipelineSave = pipeline.match(/async function handleSave\([\s\S]*?(?=\n  function canDelete)/)?.[0] ?? ""
  assert.match(pipelineSave, /editing && !canManageRecord\(user\?\.role, user\?\.id, editing\)/)
  assert.match(pipeline, /canManageRecord\(user\?\.role, user\?\.id, r\) \? <RowActionsMenu/)
  assert.match(pipeline, /<PipelineNotes[\s\S]*canManage=\{canManageRecord\(user\?\.role, user\?\.id, editing\)\}/)

  for (const [name, nextName] of [
    ["handleEditSave", "openEdit"],
    ["openEdit", "handleCancelClosing"],
    ["handleCancelClosing", "openTargetEdit"],
  ]) {
    const block = closing.match(new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?(?=\\n  (?:async )?function ${nextName}|\\n  ${nextName})`))?.[0] ?? ""
    assert.match(block, /canManageRecord\(user\?\.role, user\?\.id, editingClosing|canManageRecord\(user\?\.role, user\?\.id, c\)/)
  }
  assert.match(closing, /canManageRecord\(user\?\.role, user\?\.id, c\) && \(\s*<button onClick=\{\(\) => openEdit\(c\)\}/)
})

test("Sales Closing PDF consumes the persisted single-Hunter scope", async () => {
  const closing = await read("app/closing/page.tsx")
  const salesFetch = closing.match(/else if \(user && user\.role === "sales_person"\) \{[\s\S]*?\n    \} else \{/)?.[0] ?? ""
  assert.match(salesFetch, /setScopedHunterName\(scoped\.hunterName\)/)

  const report = closing.match(/async function handleReportClosing\([\s\S]*?(?=\n  const hunterKey)/)?.[0] ?? ""
  assert.match(report, /buildSalesHunterPdfScope\(scopedHunterName, hunters, periodValue, monthsElapsed, ytdMode\)/)
  assert.match(report, /mtdTarget:\s*salesPdfScope\?\.mtdTarget \?\? periodTargetTeam/)
  assert.match(report, /topHunter:\s*salesPdfScope\?\.topHunter \?\? topHunter/)
  assert.match(report, /allHunters:\s*salesPdfScope\?\.allHunters \?\? allHunters/)
})
