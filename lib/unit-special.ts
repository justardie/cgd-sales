export const UNIT_SPECIAL_CATEGORIES = [
  { value: "unit_buyback", label: "Unit Buyback" },
  { value: "unit_investor", label: "Unit Investor" },
  { value: "stock_sudah_spk", label: "Stock Sudah SPK" },
] as const

export const UNIT_SPECIAL_STATUS_OPTIONS = ["Open", "Sold"] as const
export const UNIT_SPECIAL_PAYMENT_OPTIONS = ["Cash Keras", "CB 36X", "KPR", "SOB"] as const

export type UnitSpecialCategory = typeof UNIT_SPECIAL_CATEGORIES[number]["value"]
export type UnitSpecialStatus = typeof UNIT_SPECIAL_STATUS_OPTIONS[number]

export interface UnitSpecialForm {
  category: UnitSpecialCategory
  project: string
  cluster: string
  unit_no: string
  lt_lb: string
  payment_method: string
  sale_price: string
  notes: string
  status: UnitSpecialStatus
}

export function isUnitSpecialCategory(value: string): value is UnitSpecialCategory {
  return UNIT_SPECIAL_CATEGORIES.some((category) => category.value === value)
}

export function isUnitSpecialStatus(value: string): value is UnitSpecialStatus {
  return UNIT_SPECIAL_STATUS_OPTIONS.includes(value as UnitSpecialStatus)
}

export function formatUnitSpecialPayments(values: string[]): string {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).join(", ")
}

/** Reads a price the user typed (or that was formatted as "1.450.000.000") back into a number. */
export function parseUnitSpecialPrice(value: string): number {
  return Number(value.replace(/[^\d]/g, "")) || 0
}

/**
 * Totals the sale price of the rows being shown. While bulk editing, the draft
 * value in the input wins over the saved one so the total tracks edits live.
 */
export function sumUnitSpecialSalePrice(
  rows: readonly { id: string; sale_price: number }[],
  drafts?: Readonly<Record<string, Pick<UnitSpecialForm, "sale_price">>>,
): number {
  return rows.reduce((total, row) => {
    const draft = drafts?.[row.id]?.sale_price
    return total + (draft === undefined ? (row.sale_price || 0) : parseUnitSpecialPrice(draft))
  }, 0)
}

export function buildEmptyUnitSpecialForm(category: UnitSpecialCategory): UnitSpecialForm {
  return {
    category,
    project: "",
    cluster: "",
    unit_no: "",
    lt_lb: "",
    payment_method: "",
    sale_price: "",
    notes: "",
    status: "Open",
  }
}
