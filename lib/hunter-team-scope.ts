export interface HunterTeamMember {
  id: string
  hunter_name: string | null
}

export interface HunterScopedRecord {
  user_id: string
  sales_hunter: string | null
}

export function canManageRecord(
  role: string | null | undefined,
  currentUserId: string | null | undefined,
  record: Pick<HunterScopedRecord, "user_id">,
): boolean {
  return role !== "sales_person" || record.user_id === currentUserId
}

function normalizeHunterName(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase("id-ID") ?? ""
}

export function filterRecordsForHunterTeam<T extends HunterScopedRecord>(
  records: T[],
  currentUserId: string,
  members: HunterTeamMember[],
): { records: T[]; hunterName: string | null } {
  const currentMember = members.find(member => member.id === currentUserId)
  const hunterName = currentMember?.hunter_name?.trim() || null
  const hunterKey = normalizeHunterName(hunterName)
  if (!hunterKey) return { records: [], hunterName: null }

  const memberIds = new Set(
    members
      .filter(member => normalizeHunterName(member.hunter_name) === hunterKey)
      .map(member => member.id),
  )

  return {
    hunterName,
    records: records.filter(record =>
      memberIds.has(record.user_id) || normalizeHunterName(record.sales_hunter) === hunterKey
    ),
  }
}

export function buildSalesHunterPdfScope(
  hunterName: string | null,
  hunters: Array<{ name: string; monthly_target: number }>,
  periodValue: number,
  currentMonth: number,
  isYtd: boolean,
) {
  const name = hunterName?.trim() || ""
  const hunter = hunters.find(candidate => normalizeHunterName(candidate.name) === normalizeHunterName(name))
  const target = (hunter?.monthly_target || 0) * (isYtd ? currentMonth : 1)
  return {
    mtdTarget: target,
    topHunter: { name, omset: periodValue, pct: target > 0 ? Math.round((periodValue / target) * 100) : 0 },
    allHunters: [{ name, omset: periodValue, target }],
  }
}
