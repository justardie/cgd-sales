export type AccessRoleKey = "admin" | "hunter" | "sales_person" | "telemarketing" | "task_force"
export type DeviceKey = "desktop" | "tablet" | "mobile"
export type DataScope = "all" | "team_only" | "self_only"

export const MENU_ITEMS = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "pipeline", label: "Pipeline", href: "/pipeline" },
  { key: "closing", label: "Closing", href: "/closing" },
  { key: "team", label: "Team Status", href: "/team" },
  { key: "unit_special", label: "Unit Special", href: "/unit-special" },
  { key: "report", label: "REPORT", href: "/report" },
  { key: "monthly_report", label: "MONTHLY REPORT", href: "/monthly-report" },
  { key: "funnel", label: "Leads Funnel", href: "/funnel" },
  { key: "funnel_summary", label: "Funnel Summary", href: "/funnel-summary" },
  { key: "admin", label: "Admin", href: "/admin" },
  { key: "lapor_mas", label: "Lapor Mas", href: "/lapor-mas" },
] as const

export type MenuKey = typeof MENU_ITEMS[number]["key"]

export const TELEMARKETING_NAV_ITEMS = [
  { key: "overview", label: "Overview", href: "/" },
  { key: "pipeline", label: "Pipeline", href: "/pipeline" },
  { key: "closing", label: "Closing", href: "/closing" },
  { key: "funnel", label: "Leads Funnel", href: "/funnel" },
  { key: "funnel_summary", label: "Funnel Summary", href: "/funnel-summary" },
] as const satisfies readonly (typeof MENU_ITEMS)[number][]

export const TELEMARKETING_MENU_KEYS: MenuKey[] = TELEMARKETING_NAV_ITEMS.map(item => item.key)

export function isSalesTelemarketing(role: string, hasTmAccess?: boolean): boolean {
  return role === "sales_person" && hasTmAccess === true
}

export const ACCESS_ROLES: { key: AccessRoleKey; label: string }[] = [
  { key: "admin", label: "Admin" },
  { key: "hunter", label: "Sales Leader / Sales Manager" },
  { key: "sales_person", label: "Sales Person" },
  { key: "telemarketing", label: "Telemarketing" },
  { key: "task_force", label: "Non Sales" },
]

export const DEFAULT_ROLE_ACCESS: Record<AccessRoleKey, {
  data_scope: DataScope
  desktop_menus: MenuKey[]
  tablet_menus: MenuKey[]
  mobile_menus: MenuKey[]
}> = {
  admin: {
    data_scope: "all",
    desktop_menus: ["overview", "pipeline", "closing", "unit_special", "report", "monthly_report", "funnel", "funnel_summary", "team", "admin", "lapor_mas"],
    tablet_menus: ["overview", "pipeline", "closing", "team", "admin"],
    mobile_menus: ["overview", "pipeline", "closing", "team"],
  },
  hunter: {
    data_scope: "team_only",
    desktop_menus: ["overview", "pipeline", "closing", "unit_special", "report", "monthly_report", "funnel", "funnel_summary"],
    tablet_menus: ["overview", "pipeline", "closing", "team"],
    mobile_menus: ["overview", "pipeline", "closing", "team"],
  },
  sales_person: {
    data_scope: "team_only",
    desktop_menus: ["overview", "pipeline", "closing", "unit_special"],
    tablet_menus: ["overview", "pipeline", "closing", "team"],
    mobile_menus: ["overview", "pipeline", "closing", "team"],
  },
  telemarketing: {
    data_scope: "self_only",
    desktop_menus: [...TELEMARKETING_MENU_KEYS],
    tablet_menus: [...TELEMARKETING_MENU_KEYS],
    mobile_menus: [...TELEMARKETING_MENU_KEYS],
  },
  task_force: {
    data_scope: "all",
    desktop_menus: ["overview", "pipeline", "closing", "unit_special"],
    tablet_menus: ["overview", "pipeline", "closing", "unit_special"],
    mobile_menus: ["overview", "pipeline", "closing", "unit_special"],
  },
}

export function accessRoleForUser(role: string, hasTmAccess?: boolean): AccessRoleKey {
  if (role === "sales_person" && hasTmAccess) return "telemarketing"
  if (role === "admin" || role === "hunter" || role === "sales_person" || role === "task_force") return role
  return "sales_person"
}
