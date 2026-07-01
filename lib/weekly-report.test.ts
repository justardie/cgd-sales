import assert from "node:assert/strict"
import test from "node:test"
import { buildReportHtml, calculateVisitSummary, getMtdRange, normalizePersonName } from "./weekly-report.ts"

test("normalizes punctuation and letter case in Pivot names", () => {
  assert.equal(normalizePersonName(" M. Fadjri Saputra "), "M FADJRI SAPUTRA")
})

test("calculates Hunter accompanied visits and each active Sales Person total", () => {
  const result = calculateVisitSummary([
    { name: "Alvin", visitKonsumen: 2, accompanied: 3, visitLokasi: 4 },
    { name: "Amos", visitKonsumen: 1, accompanied: 2, visitLokasi: 1 },
  ], ["Alvin"])
  assert.equal(result.hunterVisits, 3)
  assert.deepEqual(result.sales, [{ name: "Alvin", visits: 9 }])
})

test("MTD starts on first day of end date month", () => {
  assert.deepEqual(getMtdRange("2026-06-30"), { start: "2026-06-01", end: "2026-06-30" })
})

test("report HTML is print-ready and escapes user content", () => {
  const html = buildReportHtml({ hunterName: "Aida <script>", periodStart: "2026-06-23", periodEnd: "2026-06-29", coverage: [], monthlyTarget: 0, winOrDieTarget: 0, closings: [], pipelines: [], hunterVisits: 0, salesVisits: [], activities: [] })
  assert.match(html, /@page[^}]*landscape/)
  assert.doesNotMatch(html, /Aida <script>/)
  assert.match(html, /Aida &lt;script&gt;/)
})
