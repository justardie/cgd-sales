import assert from "node:assert/strict"
import test from "node:test"
import { existsSync, readFileSync } from "node:fs"
import { activeAsOf, buildTracker, classify, goldStage, parseCSV, periods, type Row } from "./tracker-metrics.ts"

const lead = (o: Partial<Record<string, string>>): Row => ({
  "Lead ID": "1", "Nama Leads": "Budi", "Project": "Central Hills", "Salesperson": "SYARAH MUSTIKA",
  "Sales Team": "HOD Ardiawan - Sales Leader Andriansyah Pulungan", "Status": "Warm", "Di Leads Nurture": "Tidak",
  "Source": "Meta Ads FB", "Medium": "DIGITAL MARKETING", "Created On": "20/10/2026 10:00", "Last Updated On": "22/10/2026 10:00", ...o,
} as Row)
const act = (id: string, date: string, type = "Prospect (Call / Chat)", who = "SYARAH MUSTIKA"): Row =>
  ({ "Lead ID": id, "Completion Date": date, "Assigned To": who, "Activity Type": type })

test("parses quoted CSV with either delimiter and a BOM", () => {
  assert.deepEqual(parseCSV('﻿"a";"b"\n"1;x";"say ""hi"""\n'), [{ a: "1;x", b: 'say "hi"' }])
  assert.deepEqual(parseCSV("a,b\r\n1,2\r\n"), [{ a: "1", b: "2" }])
})

test("maps medium and source to the four agreed sources", () => {
  assert.equal(classify("DIGITAL MARKETING", "Ecommerce").group, "marcomm")
  assert.equal(classify("CONVENTIONAL", "Events & Community").group, "marcomm")
  assert.deepEqual(classify("SALES ACTIVITY & NETWORKING", "Canvassing"), { group: "offline", sub: "Canvassing" })
  assert.deepEqual(classify("SALES ACTIVITY & NETWORKING", "ECommerce"), { group: "dgmsales", sub: "ECommerce" })
  assert.deepEqual(classify("SALES ACTIVITY & NETWORKING", "Member by Sales"), { group: "lain", sub: "EMS" })
  assert.deepEqual(classify("SALES CHANNEL OPTIMIZE", "BANK BNI"), { group: "lain", sub: "Bank" })
  assert.deepEqual(classify("SALES ACTIVITY & NETWORKING", "Scan Iphone"), { group: "lain", sub: "Lainnya (Scan Iphone)" })
})

test("weeks run Monday to the data date and compare the same span last week", () => {
  const P = periods("2026-10-24")
  assert.deepEqual(P.wk, ["2026-10-19", "2026-10-24"])
  assert.deepEqual(P.wkPrev, ["2026-10-12", "2026-10-17"])
  assert.deepEqual(P.mtd, ["2026-10-01", "2026-10-24"])
  assert.deepEqual(P.pmtd, ["2026-09-01", "2026-09-24"])
})

test("a lead is active only with an active status, no nurture, and contact within 7 days", () => {
  const t = buildTracker({
    leadsNew: [lead({ "Lead ID": "1" }), lead({ "Lead ID": "2" }), lead({ "Lead ID": "3", "Di Leads Nurture": "Ya" }), lead({ "Lead ID": "4", "Status": "Cold" })],
    activity: [act("1", "24/10/2026 09:00"), act("2", "17/10/2026 09:00"), act("3", "24/10/2026 09:00"), act("4", "24/10/2026 09:00")],
  })
  assert.equal(t.ref, "2026-10-24")
  assert.equal(t.g1.pool.marcomm.aktif, 1)
  assert.equal(t.g1.cohort.mtd.marcomm.baru, 4)
})

test("prospecting counts face-to-face visits only and closings skip PROCUREMENT MRD", () => {
  const t = buildTracker({
    leadsNew: [lead({})],
    activity: [act("1", "24/10/2026 09:00", "Visit Konsumen"), act("1", "23/10/2026 09:00", "Prospect Pameran / OT"), act("1", "20/10/2026 09:00", "Visit Lokasi")],
    so: [
      { "Status": "Closing", "Closing Date": "21/10/2026", "Cancel Date": "", "Salesperson": "SYARAH MUSTIKA", "Sales Team": "HOD Ardiawan - Sales Leader Andriansyah Pulungan", "Project": "Central Tiban", "Customer": "BUDI", "Nama Leads": "", "Harga Jual Resmi": "1000000000" },
      { "Status": "Pre - SKUP", "Closing Date": "20/10/2026", "Cancel Date": "", "Salesperson": "PROCUREMENT MRD", "Sales Team": "", "Project": "X", "Customer": "Y", "Nama Leads": "", "Harga Jual Resmi": "5" },
    ],
  })
  const row = t.m1.rows[0]
  assert.deepEqual([row.pToday, row.pWk, row.pMtd], [1, 2, 2])
  assert.equal(t.m1.omset[1].realisasi, 1_000_000_000)
  assert.equal(t.sales.find((s) => s.sales === "PROCUREMENT MRD"), undefined)
  assert.equal(goldStage({ leadId: "1", nama: "Budi", week: "2026-10-19" }, t.m1.picker, t.closings), "closing")
  assert.equal(goldStage({ leadId: "1", nama: "Budi", week: "2026-10-26" }, t.m1.picker, t.closings), "potensi")
})

test("archived snapshot counts leads that were active on that date", () => {
  const counts = activeAsOf([lead({ "Lead ID": "9" })], [act("9", "15/10/2026 08:00")], "2026-10-17")
  assert.equal(counts.marcomm, 1)
})

// Optional parity check against the real exports (kept outside the repo).
const dir = process.env.TRACKER_FIXTURE_DIR
test("matches the numbers agreed in the review artifact", { skip: !dir || !existsSync(`${dir}/leadsNew.csv`) }, () => {
  const read = (n: string) => parseCSV(readFileSync(`${dir}/${n}.csv`, "utf8"))
  const t = buildTracker({ leadsNew: read("leadsNew"), leadsUpd: read("leadsUpd"), activity: read("activity"), so: read("so") })
  assert.equal(t.ref, "2026-10-24")
  assert.deepEqual(Object.values(t.g1.vol).map((v) => v.mtd), [421, 952, 1208, 411])
  assert.equal(Object.values(t.g1.pool).reduce((a, v) => a + v.aktif, 0), 1548)
  assert.equal(t.projects.reduce((a, p) => a + p.gap, 0), 91)
  assert.deepEqual(t.m1.omset.map((o) => o.realisasi), [823_500_000, 1_223_950_000])
})
