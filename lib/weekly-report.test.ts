import assert from "node:assert/strict"
import test from "node:test"
import { buildReportHtml, calculateVisitSummary, getMtdRange, getPreviousWeekPeriod, normalizePersonName } from "./weekly-report.ts"

test("report date automatically selects the previous Monday through Sunday", () => {
  assert.deepEqual(getPreviousWeekPeriod("2026-06-29"), { start: "2026-06-22", end: "2026-06-28" })
  assert.deepEqual(getPreviousWeekPeriod("2026-07-01"), { start: "2026-06-22", end: "2026-06-28" })
})

test("normalizes punctuation and letter case in Pivot names", () => {
  assert.equal(normalizePersonName(" M. Fadjri Saputra "), "M FADJRI SAPUTRA")
})

test("calculates Hunter accompanied visits and each active Sales Person total", () => {
  const result = calculateVisitSummary([
    { name: "Alvin", visitKonsumen: 2, accompanied: 3, visitLokasi: 4 },
    { name: "Amos", visitKonsumen: 1, accompanied: 2, visitLokasi: 1 },
  ], ["Alvin"])
  assert.equal(result.hunterVisits, 3)
  assert.deepEqual(result.sales, [{ name: "Alvin", visitKonsumen: 2, accompanied: 3, visitLokasi: 4, visits: 9 }])
})

test("MTD starts on first day of end date month", () => {
  assert.deepEqual(getMtdRange("2026-06-30"), { start: "2026-06-01", end: "2026-06-30" })
})

test("report HTML is print-ready, shows progress and escapes user content", () => {
  const html = buildReportHtml({ hunterName: "Aida <script>", reportDate: "2026-06-30", periodStart: "2026-06-23", periodEnd: "2026-06-29", coverage: [], monthlyTarget: 100, winOrDieTarget: 50, visitTarget: 40, closings: [], pipelines: [], hunterVisits: 0, salesVisits: [], activities: [] })
  assert.match(html, /@page[^}]*landscape/)
  assert.match(html, /Print \/ PDF/)
  assert.match(html, /Progress Target Omset/)
  assert.match(html, /Pencapaian Visit Tim/)
  assert.doesNotMatch(html, /Aida <script>/)
  assert.match(html, /Aida &lt;script&gt;/)
})
