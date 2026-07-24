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
  { key: "funnel", label: "Leads Funnel", href: "/funnel" },
  { key: "funnel_summary", label: "Funnel Summary", href: "/funnel-summary" },
  { key: "admin", label: "Admin", href: "/admin" },
  { key: "role_access", label: "Role & Akses Data", href: "/role-access" },
  { key: "lapor_mas", label: "Lapor Mas", href: "/lapor-mas" },
] as const

export type MenuKey = typeof MENU_ITEMS[number]["key"]

export const ACCESS_ROLES: { key: AccessRoleKey; label: string }[] = [
  { key: "admin", label: "Admin" },
  { key: "hunter", label: "Sales Hunter" },
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
    desktop_menus: ["overview", "pipeline", "closing", "unit_special", "report", "funnel", "funnel_summary", "team", "admin", "role_access", "lapor_mas"],
    tablet_menus: ["overview", "pipeline", "closing", "team", "admin", "role_access"],
    mobile_menus: ["overview", "pipeline", "closing", "team"],
  },
  hunter: {
    data_scope: "team_only",
    desktop_menus: ["overview", "pipeline", "closing", "unit_special", "report", "funnel", "funnel_summary"],
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
    desktop_menus: ["funnel", "funnel_summary"],
    tablet_menus: ["funnel", "funnel_summary"],
    mobile_menus: ["funnel", "funnel_summary"],
  },
  task_force: {
    data_scope: "all",
    desktop_menus: ["overview", "pipeline", "closing", "team"],
    tablet_menus: ["overview", "pipeline", "closing", "team"],
    mobile_menus: ["overview", "pipeline", "closing", "team"],
  },
}

export function accessRoleForUser(role: string, hasTmAccess?: boolean): AccessRoleKey {
  if (role === "sales_person" && hasTmAccess) return "telemarketing"
  if (role === "admin" || role === "hunter" || role === "sales_person" || role === "task_force") return role
  return "sales_person"
}
