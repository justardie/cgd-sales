export function periodTarget(monthlyTarget: number, currentMonth: number, isYtd: boolean): number {
  return monthlyTarget * (isYtd ? currentMonth : 1)
}

export function isActiveSalesRole(role: string): boolean {
  return role === "sales_person" || role === "telemarketing"
}

export function canonicalProjectTotals(
  totals: Record<string, number>,
  projects: readonly string[],
): Array<{ name: string; value: number }> {
  return projects.map(name => ({ name, value: totals[name] || 0 }))
}
