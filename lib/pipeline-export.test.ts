import assert from "node:assert/strict"
import test from "node:test"
import { formatPipelineExport } from "./pipeline-export.ts"

test("exports only active pipeline rows with latest structured progress", () => {
  const text = formatPipelineExport([
    { id: "1", salesPerson: "Rina", prospect: "Budi", visited: true, project: "CT", unit: "A-1", status: "hot" },
    { id: "2", salesPerson: "Dewi", prospect: "Sari", visited: false, project: "CH", unit: "B-2", status: "tidak_potensial" },
  ], { "1": { kendala: "Menunggu dokumen", nextAction: "Follow up bank", targetClosing: "2026-07-20" } })
  assert.match(text, /Sales: Rina/)
  assert.match(text, /Status: Sudah/)
  assert.match(text, /Minat: CT - A-1/)
  assert.match(text, /Kendala: Menunggu dokumen/)
  assert.match(text, /Next Action: Follow up bank/)
  assert.match(text, /Target Closing: 20 Juli 2026/)
  assert.doesNotMatch(text, /Dewi|Sari/)
})
