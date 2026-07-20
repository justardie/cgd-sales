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

test("dashboard applies period-independent KPIs and includes both active sales roles", async () => {
  const source = await read("app/page.tsx")
  assert.match(source, /periodTarget/)
  assert.match(source, /isActiveSalesRole/)
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

test("Funnel pages expose approved cards without Pipeline", async () => {
  const funnel = await read("app/funnel/page.tsx")
  const summary = await read("app/funnel-summary/page.tsx")
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
  assert.match(page, /Activities Analysis/)
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

test("Weekly Report date picker uses a larger white calendar icon", async () => {
  const page = await read("app/report/page.tsx")
  const css = await read("app/globals.css")
  assert.match(page, /report-date-input/)
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
