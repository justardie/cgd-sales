import assert from "node:assert/strict"
import test from "node:test"
import {
  buildSalesHunterPdfScope,
  canManageRecord,
  filterRecordsForHunterTeam,
} from "./hunter-team-scope.ts"

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

for (const hunter_name of [null, "", "   "]) {
  test(`returns no records when the existing Sales member has Hunter ${JSON.stringify(hunter_name)}`, () => {
    const result = filterRecordsForHunterTeam(records, "unassigned", [
      ...members,
      { id: "unassigned", hunter_name },
    ])
    assert.equal(result.hunterName, null)
    assert.deepEqual(result.records, [])
  })
}

test("Sales can manage only records they own while other roles keep mutation access", () => {
  assert.equal(canManageRecord("sales_person", "sales-a", { user_id: "sales-a" }), true)
  assert.equal(canManageRecord("sales_person", "sales-a", { user_id: "tm-a" }), false)
  assert.equal(canManageRecord("admin", "admin-a", { user_id: "tm-a" }), true)
  assert.equal(canManageRecord("hunter", "hunter-a", { user_id: "tm-a" }), true)
  assert.equal(canManageRecord("task_force", "tf-a", { user_id: "tm-a" }), true)
})

test("Sales PDF attributes the scoped period to its one Hunter and target", () => {
  const result = buildSalesHunterPdfScope(
    " Hunter Alpha ",
    [
      { name: "Hunter Beta", monthly_target: 200 },
      { name: "hunter alpha", monthly_target: 125 },
    ],
    375,
    3,
    true,
  )

  assert.deepEqual(result, {
    mtdTarget: 375,
    topHunter: { name: "Hunter Alpha", omset: 375, pct: 100 },
    allHunters: [{ name: "Hunter Alpha", omset: 375, target: 375 }],
  })
})
