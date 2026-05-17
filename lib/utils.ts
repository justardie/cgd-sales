export function formatRupiah(value: number): string {
  if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toFixed(1)}M`
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(0)}Jt`
  return `Rp${value.toLocaleString('id-ID')}`
}

export function formatRupiahFull(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

export function getCurrentMonth(): number { return new Date().getMonth() + 1 }
export function getCurrentYear(): number { return new Date().getFullYear() }

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export function getMonthName(month: number): string {
  const names = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des']
  return names[month - 1] || ''
}

export function pct(actual: number, target: number): number {
  if (target === 0) return 0
  return Math.min(Math.round((actual / target) * 100), 999)
}

export function spBadgeColor(level: number): string {
  if (level === 0) return 'bg-green-500/20 text-green-400'
  if (level === 1) return 'bg-blue-500/20 text-blue-400'
  if (level === 2) return 'bg-yellow-500/20 text-yellow-400'
  if (level >= 3) return 'bg-red-500/20 text-red-400'
  return 'bg-gray-500/20 text-gray-400'
}

export const MONTHS = [
  { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
  { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' }, { value: 12, label: 'Desember' },
]

/** Canonical payment methods — always shown in this fixed order; extra DB values appended */
export const CANONICAL_CARA_BAYAR = [
  "Cash Keras",
  "KPR Indent",
  "KPR UM",
  "KPR Express",
  "Cash Bertahap",
  "SOB",
] as const

/** Annual team omset target (Rp 50 Miliar) */
export const TEAM_TARGET_ANNUAL = 50_000_000_000

/** Monthly team omset target shown on dashboard hero card (Rp 50 Miliar) */
export const TEAM_MONTHLY_TARGET = 50_000_000_000

/** Canonical project names — single source of truth for all pages & DB */
export const PROJECT_NAMES = [
  "CH",
  "CT",
  "MRD CRBA+CBA",
  "CRT",
  "MRD CRTU",
  "MRD CLH",
  "SCC - Hillside",
  "SCC - Valleyside",
] as const

export type ProjectName = typeof PROJECT_NAMES[number]

/**
 * Normalise any project string (from DB or user input) to canonical abbreviated name.
 * Returns the raw string if unrecognised — investigate those records.
 * NOTE: standalone "MRD" or "residential" is NOT valid; must be CRBA+CBA / CRTU / CLH.
 */
export function normalizeProject(project: string | null | undefined): string {
  if (!project) return ""
  const p = project.trim()
  if (/central.?hills|^CH$/i.test(p))                              return "CH"
  if (/central.?tiban(?!.*raya)|^CT$/i.test(p))                   return "CT"
  if (/central.?(raya.?)?batu|^(CBA|CRBA|MRD[\s-]*CRBA)$/i.test(p)) return "MRD CRBA+CBA"
  if (/central.?raya.?tiban(?!.*uncang)|^CRT$/i.test(p))          return "CRT"
  if (/tanjung|uncang|^(CRTU|MRD[\s-]*CRTU)$/i.test(p))          return "MRD CRTU"
  if (/laguna|^(CLH|CLB|MRD[\s-]*CLH)$/i.test(p))                return "MRD CLH"
  if (/hillside/i.test(p))                                        return "SCC - Hillside"
  if (/valleyside/i.test(p))                                      return "SCC - Valleyside"
  // Standalone "MRD" or "residential" — not a valid standalone project, return as-is to surface in UI
  return p
}
