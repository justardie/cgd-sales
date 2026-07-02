import assert from "node:assert/strict"
import test from "node:test"

import { canonicalProjectTotals, isActiveSalesRole, periodTarget } from "./dashboard-rules.ts"

test("YTD target multiplies monthly target by current month number", () => {
  assert.equal(periodTarget(50_000_000_000, 6, true), 300_000_000_000)
  assert.equal(periodTarget(50_000_000_000, 6, false), 50_000_000_000)
})

test("active sales roles include sales person and telemarketing", () => {
  assert.equal(isActiveSalesRole("sales_person"), true)
  assert.equal(isActiveSalesRole("telemarketing"), true)
  assert.equal(isActiveSalesRole("sales_hunter"), false)
})

test("canonical projects remain visible with zero revenue", () => {
  assert.deepEqual(
    canonicalProjectTotals({ A: 10 }, ["A", "B"]),
    [{ name: "A", value: 10 }, { name: "B", value: 0 }],
  )
})
