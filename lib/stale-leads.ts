/** Days without a status update or pipeline_notes entry before a warm/hot lead is flagged as stuck. */
export const STALE_DAYS_THRESHOLD = 2

export function daysSince(iso: string): number {
  const then = new Date(iso).getTime()
  if (isNaN(then)) return 0
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24))
}

/** Only warm/hot leads can go stale — tidak_potensial and closed leads are done, not stuck. */
export function isStaleLead(status: string, lastActivityIso: string | undefined, thresholdDays = STALE_DAYS_THRESHOLD): boolean {
  if (!lastActivityIso) return false
  if (status !== "warm" && status !== "hot") return false
  return daysSince(lastActivityIso) >= thresholdDays
}

export function filterKonsumenRowsForUser<T extends { user_id?: string; sales_hunter: string | null }>(
  rows: T[],
  user: { id: string; name: string } | null,
  isAdmin: boolean,
  isTf: boolean,
): T[] {
  if (isAdmin || isTf || !user) return rows
  const name = (user.name || "").toLowerCase()
  return rows.filter(r => r.user_id === user.id || (r.sales_hunter || "").toLowerCase() === name)
}
