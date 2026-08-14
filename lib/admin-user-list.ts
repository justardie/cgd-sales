import type { User } from "../types/index.ts"

export type AdminSortKey = "name" | "role" | "target" | "wod" | "status"

export const ADMIN_SORT_OPTIONS: { value: AdminSortKey; label: string }[] = [
  { value: "name",   label: "Nama" },
  { value: "role",   label: "Role" },
  { value: "target", label: "Target Omset" },
  { value: "wod",    label: "WoD" },
  { value: "status", label: "Status" },
]

export interface AdminListOptions {
  search: string
  /** AccessRoleKey, or "" for every role. */
  role: string
  /** UserStatus, or "" for every status. */
  status: string
  sortKey: AdminSortKey
  sortDir: "asc" | "desc"
  /** Badge text for a user — searched against, and used when sorting by role. */
  labelOf: (user: User) => string
  /** Maps a user onto the role key used by the role filter. */
  roleKeyOf: (user: User) => string
}

/** True when any control is narrowing the list, so the UI can offer a reset. */
export function isAdminListFiltered(options: Pick<AdminListOptions, "search" | "role" | "status">): boolean {
  return Boolean(options.search.trim() || options.role || options.status)
}

/**
 * Applies the Admin table's search, role, and status filters, then sorts.
 * Returns a new array — the input is never mutated.
 */
export function filterAndSortAdminUsers(users: readonly User[], options: AdminListOptions): User[] {
  const query = options.search.trim().toLowerCase()

  return users
    .filter(user => {
      const matchesSearch = !query
        || user.name.toLowerCase().includes(query)
        || (user.hunter_name || "").toLowerCase().includes(query)
        || options.labelOf(user).toLowerCase().includes(query)
      return matchesSearch
        && (!options.role || options.roleKeyOf(user) === options.role)
        && (!options.status || user.status === options.status)
    })
    .sort((a, b) => {
      const dir = options.sortDir === "asc" ? 1 : -1
      // Ties fall back to name so the order stays stable across re-renders.
      const byName = a.name.localeCompare(b.name)
      if (options.sortKey === "target") return (a.monthly_target - b.monthly_target) * dir || byName
      if (options.sortKey === "wod")    return (a.win_or_die_target - b.win_or_die_target) * dir || byName
      if (options.sortKey === "role")   return options.labelOf(a).localeCompare(options.labelOf(b)) * dir || byName
      if (options.sortKey === "status") return a.status.localeCompare(b.status) * dir || byName
      return byName * dir
    })
}
