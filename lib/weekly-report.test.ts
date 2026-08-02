import assert from "node:assert/strict"
import test from "node:test"
import { buildReportHtml, calculateVisitSummary, getMonthRange, getMtdRange, getPreviousWeekPeriod, normalizePersonName, parsePivotSheet } from "./weekly-report.ts"

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

test("strict Pivot parsing rejects a missing target month while weekly parsing falls back", () => {
  const raw = [
    ["", "Visit Konsumen", "Accompanied Visit", "Visit Lokasi"],
    [" July 2026", 0, 0, 0],
    ["  Alvin", 1, 2, 3],
    [" August 2026", 0, 0, 0],
    ["  Alvin", 4, 5, 6],
  ]
  const targets = [{ year: 2026, month: 8 }]

  assert.deepEqual(parsePivotSheet(raw, targets), [{ name: "Alvin", visitKonsumen: 4, accompanied: 5, visitLokasi: 6 }])
  assert.throws(() => parsePivotSheet(raw, targets, true), /bulan laporan tidak ditemukan/i)
})

test("month input expands to the complete calendar month", () => {
  assert.deepEqual(getMonthRange("2026-02"), { start: "2026-02-01", end: "2026-02-28" })
  assert.deepEqual(getMonthRange("2028-02"), { start: "2028-02-01", end: "2028-02-29" })
})

test("monthly report uses monthly copy while weekly remains unchanged", () => {
  const data = { hunterName: "Andre", periodStart: "2026-07-01", periodEnd: "2026-07-31", coverage: [], monthlyTarget: 100, winOrDieTarget: 50, visitTarget: 12, closings: [], pipelines: [], hunterVisits: 0, salesVisits: [], activities: [], monthlyReview: { good: "Target tercapai", bad: "Visit kurang", next: "Tambah kunjungan" } }
  const monthly = buildReportHtml(data, "monthly")
  assert.match(monthly, /SALES MONTHLY REPORT/)
  assert.match(monthly, /Closing Bulanan/)
  assert.match(monthly, /Omset Bulanan/)
  assert.match(monthly, /Closing Bulanan sampai/)
  assert.match(monthly, /TOTAL OMSET BULANAN/)
  assert.doesNotMatch(monthly, /MTD/)
  assert.match(monthly, /What's Good/)
  assert.match(monthly, /What's Bad/)
  assert.match(monthly, /What's Next/)
  assert.match(monthly, /Target 12 visit per orang/)
  const weekly = buildReportHtml(data)
  assert.match(weekly, /SALES WEEKLY REPORT/)
  assert.match(weekly, /Omset MTD/)
  assert.match(weekly, /Closing MTD sampai/)
  assert.match(weekly, /TOTAL OMSET MTD/)
  assert.match(weekly, /Rencana Aktivitas Minggu Depan/)
  assert.match(weekly, /Target 40 visit per orang/)
  assert.doesNotMatch(weekly, /What's Good/)
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

test("report HTML uses readable type and visit cards without a detail table", () => {
  const html = buildReportHtml({ hunterName: "Andre", periodStart: "2026-06-22", periodEnd: "2026-06-28", coverage: [], monthlyTarget: 100, winOrDieTarget: 50, closings: [], pipelines: [], hunterVisits: 2, salesVisits: [{ name: "Sales A", visitKonsumen: 1, accompanied: 2, visitLokasi: 3, visits: 6 }], activities: [] })
  assert.match(html, /body\{[^}]*font:12px Arial/)
  assert.match(html, /class="visit-grid"/)
  const visitSection = html.match(/Pencapaian Visit Tim[\s\S]*?Pipeline Hot/)?.[0] || ""
  assert.doesNotMatch(visitSection, /<table>/)
  assert.match(visitSection, /Target 40/)
  assert.match(visitSection, /Belum tercapai/)
  assert.match(visitSection, /⚠/)
})
