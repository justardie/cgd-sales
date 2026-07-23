import test from "node:test"
import assert from "node:assert/strict"
import {
  UNIT_SPECIAL_CATEGORIES,
  UNIT_SPECIAL_PAYMENT_OPTIONS,
  buildEmptyUnitSpecialForm,
  formatUnitSpecialPayments,
  isUnitSpecialCategory,
  isUnitSpecialStatus,
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
  assert.deepEqual(UNIT_SPECIAL_PAYMENT_OPTIONS, ["Cash", "KPR", "Inhouse"])
  assert.equal(formatUnitSpecialPayments(["Cash", "KPR"]), "Cash, KPR")
  assert.equal(formatUnitSpecialPayments(["Cash", "Cash", ""]), "Cash")
})
