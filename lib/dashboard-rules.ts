export function periodTarget(monthlyTarget: number, currentMonth: number, isYtd: boolean): number {
  return monthlyTarget * (isYtd ? currentMonth : 1)
}

export function isActiveSalesRole(role: string): boolean {
  return role === "sales_person"
}

export function canonicalProjectTotals(
  totals: Record<string, number>,
  projects: readonly string[],
): Array<{ name: string; value: number }> {
  return projects.map(name => ({ name, value: totals[name] || 0 }))
}

type ClosingPerformerRow = {
  nilai_hjr?: number | null
  sales_hunter?: string | null
  sales_person?: string | null
}

export function topClosingBy(
  rows: readonly ClosingPerformerRow[],
  key: "sales_hunter" | "sales_person",
): { name: string; omset: number } | null {
  const totals: Record<string, number> = {}
  for (const row of rows) {
    const name = row[key]
    const value = row.nilai_hjr || 0
    if (name && value > 0) totals[name] = (totals[name] || 0) + value
  }

  let best: { name: string; omset: number } | null = null
  for (const [name, omset] of Object.entries(totals)) {
    if (!best || omset > best.omset) best = { name, omset }
  }
  return best
}
