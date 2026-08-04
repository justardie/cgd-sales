import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_ROLE_ACCESS,
  TELEMARKETING_NAV_ITEMS,
  accessRoleForUser,
  isSalesTelemarketing,
} from "./access-settings.ts"
import { canonicalProjectTotals, isActiveSalesRole, periodTarget, topClosingBy } from "./dashboard-rules.ts"

test("YTD target multiplies monthly target by current month number", () => {
  assert.equal(periodTarget(50_000_000_000, 6, true), 300_000_000_000)
  assert.equal(periodTarget(50_000_000_000, 6, false), 50_000_000_000)
})

test("Sales Telemarketing is a Sales Person with TM access", () => {
  assert.equal(isSalesTelemarketing("sales_person", true), true)
  assert.equal(isSalesTelemarketing("sales_person", false), false)
  assert.equal(isSalesTelemarketing("telemarketing", true), false)
  assert.equal(accessRoleForUser("sales_person", true), "telemarketing")
})

test("Sales Telemarketing uses the same five menus on every device", () => {
  const expectedItems = [
    { key: "overview", label: "Overview", href: "/" },
    { key: "pipeline", label: "Pipeline", href: "/pipeline" },
    { key: "closing", label: "Closing", href: "/closing" },
    { key: "funnel", label: "Leads Funnel", href: "/funnel" },
    { key: "funnel_summary", label: "Funnel Summary", href: "/funnel-summary" },
  ]
  const expectedKeys = expectedItems.map(item => item.key)

  assert.deepEqual(TELEMARKETING_NAV_ITEMS, expectedItems)
  assert.deepEqual(DEFAULT_ROLE_ACCESS.telemarketing.desktop_menus, expectedKeys)
  assert.deepEqual(DEFAULT_ROLE_ACCESS.telemarketing.tablet_menus, expectedKeys)
  assert.deepEqual(DEFAULT_ROLE_ACCESS.telemarketing.mobile_menus, expectedKeys)
})

test("active sales role is Sales Person only", () => {
  assert.equal(isActiveSalesRole("sales_person"), true)
  assert.equal(isActiveSalesRole("telemarketing"), false)
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
  assert.equal(topClosingBy([
    { sales_hunter: "Lyndon", nilai_hjr: 0 },
    { sales_hunter: "Rina", nilai_hjr: -10 },
  ], "sales_hunter"), null)
  assert.deepEqual(
    topClosingBy([
      { sales_person: "Alvin", nilai_hjr: 100 },
      { sales_person: "Rina", nilai_hjr: 80 },
      { sales_person: "Alvin", nilai_hjr: 50 },
    ], "sales_person"),
    { name: "Alvin", omset: 150 },
  )
})
