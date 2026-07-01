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

test("dashboard removes performance chart and exposes Hot pipeline and target alert", async () => {
  const source = await read("app/page.tsx")
  assert.doesNotMatch(source, /Grafik Performa|BarChart|ResponsiveContainer|showCharts/)
  assert.match(source, /Pipeline Hot/)
  assert.match(source, /TARGET OMSET ALERT/)
  assert.match(source, /\.eq\("status", "hot"\)/)
})

test("Weekly Report supports Pivot, drafts, final snapshots, and HTML download", async () => {
  const page = await read("app/report/page.tsx")
  const domain = await read("lib/weekly-report.ts")
  const migration = await read("supabase/038_weekly_reports.sql")
  assert.match(page, /Activities Analysis/)
  assert.match(page, /Simpan Draft/)
  assert.match(page, /Finalisasi &amp; Download/)
  assert.match(domain, /@page\{size:A4 landscape/)
  assert.match(migration, /CREATE TABLE IF NOT EXISTS weekly_reports/)
  assert.match(migration, /project_coverage/)
})

test("Team lets admins manage multi-project coverage", async () => {
  const source = await read("app/team/page.tsx")
  assert.match(source, /Atur Coverage/)
  assert.match(source, /PROJECT_NAMES\.map/)
  assert.match(source, /project_coverage/)
})
