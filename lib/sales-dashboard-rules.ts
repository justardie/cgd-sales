export interface FunnelCounters {
  new: number
  tidak_aktif: number
  bisa_dihub_tidak_angkat: number
  angkat_tertarik: number
  angkat_tidak_tertarik: number
  visit_dijadwalkan: number
  sudah_visit: number
  closing: number
  lost: number
}

export type PipelineStatusFilter = "all" | "active" | "warm" | "hot" | "tidak_potensial"

export type FunnelKpiFilter =
  | "all"
  | "new"
  | "follow_up"
  | "visit_dijadwalkan"
  | "sudah_visit"
  | "closing"
  | "dead"

const FUNNEL_KPI_STATUSES: Record<Exclude<FunnelKpiFilter, "all">, readonly string[]> = {
  new: ["new"],
  follow_up: ["bisa_dihub_tidak_angkat", "angkat_tertarik"],
  visit_dijadwalkan: ["visit_dijadwalkan"],
  sudah_visit: ["sudah_visit"],
  closing: ["closing"],
  dead: ["angkat_tidak_tertarik", "tidak_aktif", "lost"],
}

export function getFunnelMetrics(c: FunnelCounters) {
  const followUp = c.bisa_dihub_tidak_angkat + c.angkat_tertarik
  const closing = c.closing
  const dead = c.tidak_aktif + c.angkat_tidak_tertarik + c.lost
  return {
    contacted: followUp + c.visit_dijadwalkan + c.sudah_visit + closing + dead,
    new: c.new,
    followUp,
    closing,
    dead,
    visitScheduled: c.visit_dijadwalkan,
    visited: c.sudah_visit,
  }
}

export function matchesPipelineStatus(status: string, filter: PipelineStatusFilter) {
  if (filter === "all") return true
  if (filter === "active") return status === "warm" || status === "hot"
  return status === filter
}

export function matchesFunnelKpiStatus(status: string, filter: FunnelKpiFilter): boolean {
  return filter === "all" || FUNNEL_KPI_STATUSES[filter].includes(status)
}

export function countFunnelKpiLeads<T extends { status: string }>(leads: readonly T[], filter: FunnelKpiFilter): number {
  return filter === "all" ? leads.length : leads.filter((lead) => matchesFunnelKpiStatus(lead.status, filter)).length
}

export function filterFunnelKpiLeads<T extends { name: string; phone: string; status: string }>(
  leads: readonly T[],
  filter: FunnelKpiFilter,
  search: string,
): T[] {
  const statusFiltered = leads.filter((lead) => matchesFunnelKpiStatus(lead.status, filter))
  return search.trim()
    ? statusFiltered.filter((lead) => lead.name.toLowerCase().includes(search.toLowerCase()) || lead.phone.includes(search))
    : statusFiltered
}

export function getFunnelEmptyStateMessage(search: string, filter: FunnelKpiFilter, isTm: boolean): string {
  if (search.trim()) return "Tidak ada lead yang cocok dengan pencarian."
  if (filter !== "all") return "Tidak ada leads dengan status ini."
  return isTm ? "Belum ada leads yang di-assign untukmu periode ini." : "Belum ada leads untuk periode & filter ini."
}

export function formatSalesPerson(salesPerson: string | null, agentName: string | null) {
  if (!salesPerson) return "—"
  if (salesPerson !== "Agent") return salesPerson
  return agentName?.trim() ? `Agent — ${agentName.trim()}` : "Agent"
}
