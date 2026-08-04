import assert from "node:assert/strict"
import test from "node:test"
import { filterRecordsForHunterTeam } from "./hunter-team-scope.ts"

const members = [
  { id: "sales-a", hunter_name: " Hunter Alpha " },
  { id: "tm-a", hunter_name: "hunter alpha" },
  { id: "sales-b", hunter_name: "Hunter Beta" },
]

const records = [
  { id: "self", user_id: "sales-a", sales_hunter: "Sales A" },
  { id: "teammate", user_id: "tm-a", sales_hunter: "TM A" },
  { id: "hunter-owned", user_id: "hunter-a", sales_hunter: " HUNTER ALPHA " },
  { id: "other-member", user_id: "sales-b", sales_hunter: "Sales B" },
  { id: "other-hunter", user_id: "hunter-b", sales_hunter: "Hunter Beta" },
]

test("filters records to Sales members under the same Hunter", () => {
  const result = filterRecordsForHunterTeam(records, "sales-a", members)
  assert.equal(result.hunterName, "Hunter Alpha")
  assert.deepEqual(result.records.map(record => record.id), ["self", "teammate", "hunter-owned"])
})

test("returns no records when the Sales user has no Hunter", () => {
  const result = filterRecordsForHunterTeam(records, "missing", members)
  assert.equal(result.hunterName, null)
  assert.deepEqual(result.records, [])
})
