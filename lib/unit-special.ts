export const UNIT_SPECIAL_CATEGORIES = [
  { value: "unit_buyback", label: "Unit Buyback" },
  { value: "unit_investor", label: "Unit Investor" },
  { value: "stock_sudah_spk", label: "Stock Sudah SPK" },
] as const

export const UNIT_SPECIAL_STATUS_OPTIONS = ["Open", "Sold"] as const
export const UNIT_SPECIAL_PAYMENT_OPTIONS = ["Cash", "KPR", "Inhouse"] as const

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
