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

export function formatSalesPerson(salesPerson: string | null, agentName: string | null) {
  if (!salesPerson) return "—"
  if (salesPerson !== "Agent") return salesPerson
  return agentName?.trim() ? `Agent — ${agentName.trim()}` : "Agent"
}
