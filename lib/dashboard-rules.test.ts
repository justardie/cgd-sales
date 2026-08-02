import assert from "node:assert/strict"
import test from "node:test"

import { canonicalProjectTotals, isActiveSalesRole, periodTarget, topClosingBy } from "./dashboard-rules.ts"

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

test("top closing comes only from positive closing rows", () => {
  assert.equal(topClosingBy([], "sales_hunter"), null)
  assert.equal(topClosingBy([{ sales_hunter: "Lyndon", nilai_hjr: 0 }], "sales_hunter"), null)
  assert.deepEqual(
    topClosingBy([
      { sales_person: "Alvin", nilai_hjr: 100 },
      { sales_person: "Rina", nilai_hjr: 80 },
      { sales_person: "Alvin", nilai_hjr: 50 },
    ], "sales_person"),
    { name: "Alvin", omset: 150 },
  )
})
