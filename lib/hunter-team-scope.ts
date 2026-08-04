export interface HunterTeamMember {
  id: string
  hunter_name: string | null
}

export interface HunterScopedRecord {
  user_id: string
  sales_hunter: string | null
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
