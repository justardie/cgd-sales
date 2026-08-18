import test from "node:test"
import assert from "node:assert/strict"
import {
  UNIT_SPECIAL_CATEGORIES,
  UNIT_SPECIAL_PAYMENT_OPTIONS,
  buildEmptyUnitSpecialForm,
  formatUnitSpecialPayments,
  isUnitSpecialCategory,
  isUnitSpecialStatus,
  parseUnitSpecialPrice,
  sumUnitSpecialSalePrice,
} from "./unit-special.ts"

test("defines the three Unit Special submenus", () => {
  assert.deepEqual(UNIT_SPECIAL_CATEGORIES.map((category) => category.label), [
    "Unit Buyback",
    "Unit Investor",
    "Stock Sudah SPK",
  ])
})

test("validates editable unit special statuses", () => {
  assert.equal(isUnitSpecialStatus("Open"), true)
  assert.equal(isUnitSpecialStatus("Sold"), true)
  assert.equal(isUnitSpecialStatus("Hold"), false)
})

test("builds an empty unit special form for new rows", () => {
  assert.deepEqual(buildEmptyUnitSpecialForm("unit_buyback"), {
    category: "unit_buyback",
    project: "",
    cluster: "",
    unit_no: "",
    lt_lb: "",
    payment_method: "",
    sale_price: "",
    notes: "",
    status: "Open",
  })
  assert.equal(isUnitSpecialCategory("stock_sudah_spk"), true)
  assert.equal(isUnitSpecialCategory("unknown"), false)
})

test("formats multiple payment methods for storage and display", () => {
  assert.deepEqual(UNIT_SPECIAL_PAYMENT_OPTIONS, ["Cash Keras", "CB 36X", "KPR", "SOB"])
  assert.equal(formatUnitSpecialPayments(["Cash Keras", "KPR"]), "Cash Keras, KPR")
  assert.equal(formatUnitSpecialPayments(["SOB", "SOB", ""]), "SOB")
})

test("reads a typed or thousand-separated price back into a number", () => {
  assert.equal(parseUnitSpecialPrice("1.450.000.000"), 1_450_000_000)
  assert.equal(parseUnitSpecialPrice("Rp 875.500.000"), 875_500_000)
  assert.equal(parseUnitSpecialPrice(""), 0)
  assert.equal(parseUnitSpecialPrice("abc"), 0)
})

test("totals the sale price of the rows shown", () => {
  const rows = [
    { id: "a", sale_price: 1_450_000_000 },
    { id: "b", sale_price: 875_500_000 },
    { id: "c", sale_price: 0 },
  ]
  assert.equal(sumUnitSpecialSalePrice(rows), 2_325_500_000)
  assert.equal(sumUnitSpecialSalePrice([]), 0)
})

test("prefers the bulk-edit draft price so the total tracks edits live", () => {
  const rows = [
    { id: "a", sale_price: 1_450_000_000 },
    { id: "b", sale_price: 875_500_000 },
  ]
  // Only "a" is being edited — "b" keeps its saved price.
  assert.equal(
    sumUnitSpecialSalePrice(rows, { a: { sale_price: "2.000.000.000" } }),
    2_875_500_000,
  )
  // Clearing the input counts as zero, not as "fall back to the saved price".
  assert.equal(sumUnitSpecialSalePrice(rows, { a: { sale_price: "" } }), 875_500_000)
})
