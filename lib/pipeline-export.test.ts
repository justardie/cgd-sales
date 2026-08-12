import assert from "node:assert/strict"
import test from "node:test"
import { formatPipelineExport } from "./pipeline-export.ts"

test("exports only active pipeline rows with latest structured progress", () => {
  const text = formatPipelineExport([
    { id: "1", salesPerson: "Rina", prospect: "Budi", visited: true, sudahBookingFee: false, project: "CT", unit: "A-1", status: "hot", nilaiPotensi: 1_500_000_000 },
    { id: "2", salesPerson: "Dewi", prospect: "Sari", visited: false, project: "CH", unit: "B-2", status: "tidak_potensial" },
  ], { "1": { kendala: "Menunggu dokumen", nextAction: "Follow up bank", targetClosing: "2026-07-20" } })
  assert.match(text, /Sales: Rina/)
  assert.match(text, /Status Visit: Sudah/)
  assert.match(text, /Status BF: Belum/)
  assert.match(text, /Minat: CT - A-1/)
  assert.match(text, /Nilai Potensi: Rp\s1\.500\.000\.000/)
  assert.match(text, /Kendala: Menunggu dokumen/)
  assert.match(text, /Next Action: Follow up bank/)
  assert.match(text, /Target closing: 20 Juli 2026/)
  assert.doesNotMatch(text, /Dewi|Sari/)
})

test("exports a dash instead of Rp 0 when a row has no potential value", () => {
  const text = formatPipelineExport([
    { id: "1", salesPerson: "Rina", prospect: "Budi", project: "CT", unit: "A-1", status: "warm", nilaiPotensi: 0 },
    { id: "2", salesPerson: "Yosi", prospect: "Tono", project: "CH", unit: "B-2", status: "hot" },
  ], {})
  assert.doesNotMatch(text, /Rp\s0/)
  assert.equal(text.match(/Nilai Potensi: —/g)?.length, 2)
})
