"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Save } from "lucide-react"
import DashboardShell from "@/components/DashboardShell"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import { supabase } from "@/lib/supabase"
import { ACCESS_ROLES, DEFAULT_ROLE_ACCESS, MENU_ITEMS, type AccessRoleKey, type DataScope, type MenuKey } from "@/lib/access-settings"
import type { User } from "@/types"

type RoleSetting = {
  role_key: AccessRoleKey
  data_scope: DataScope
  desktop_menus: MenuKey[]
  tablet_menus: MenuKey[]
  mobile_menus: MenuKey[]
}

type UserOverride = {
  user_id: string
  data_scope: DataScope
  allowed_hunter_names: string[]
}

const DATA_SCOPE_OPTIONS: { value: DataScope; label: string }[] = [
  { value: "all", label: "Semua Data" },
  { value: "team_only", label: "Tim Sendiri" },
  { value: "self_only", label: "Data Sendiri" },
]

const DEVICES = [
  { key: "desktop_menus", label: "Desktop" },
  { key: "tablet_menus", label: "Tablet" },
  { key: "mobile_menus", label: "Mobile" },
] as const

export default function RoleAccessPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Record<AccessRoleKey, RoleSetting>>(() => buildDefaults())
  const [users, setUsers] = useState<User[]>([])
  const [overrides, setOverrides] = useState<Record<string, UserOverride>>({})

  const hunters = useMemo(() => users.filter(u => u.role === "hunter" && u.status === "active").map(u => u.name), [users])

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace("/")
  }, [isAdmin, authLoading, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [roleRes, userRes, overrideRes] = await Promise.all([
      supabase.from("role_access_settings").select("*"),
      supabase.from("users").select("*").order("name"),
      supabase.from("user_access_overrides").select("*"),
    ])
    if (roleRes.data) {
      const next = buildDefaults()
      for (const row of roleRes.data as RoleSetting[]) {
        if (row.role_key in next) next[row.role_key] = { ...next[row.role_key], ...row }
      }
      setSettings(next)
    }
    if (userRes.data) setUsers(userRes.data as User[])
    if (overrideRes.data) setOverrides(Object.fromEntries((overrideRes.data as UserOverride[]).map(o => [o.user_id, o])))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isAdmin) queueMicrotask(() => void fetchData())
  }, [isAdmin, fetchData])

  async function saveAll() {
    setSaving(true)
    const rolePayload = Object.values(settings).map(s => ({ ...s, updated_at: new Date().toISOString() }))
    const overridePayload = Object.values(overrides).map(o => ({ ...o, updated_at: new Date().toISOString() }))
    const roleRes = await supabase.from("role_access_settings").upsert(rolePayload, { onConflict: "role_key" })
    const overrideRes = overridePayload.length
      ? await supabase.from("user_access_overrides").upsert(overridePayload, { onConflict: "user_id" })
      : { error: null }
    setSaving(false)
    const error = roleRes.error || overrideRes.error
    if (error) {
      showToast(`Gagal menyimpan setting: ${error.message}`, "error")
      return
    }
    showToast("Setting role & akses data tersimpan", "success")
  }

  function toggleMenu(role: AccessRoleKey, device: keyof Pick<RoleSetting, "desktop_menus" | "tablet_menus" | "mobile_menus">, menu: MenuKey) {
    setSettings(prev => {
      const current = prev[role][device]
      const nextMenus = current.includes(menu) ? current.filter(x => x !== menu) : [...current, menu]
      return { ...prev, [role]: { ...prev[role], [device]: nextMenus } }
    })
  }

  function updateOverride(userId: string, patch: Partial<UserOverride>) {
    setOverrides(prev => {
      const base = prev[userId] || { user_id: userId, data_scope: "team_only", allowed_hunter_names: [] }
      return { ...prev, [userId]: { ...base, ...patch } }
    })
  }

  if (!isAdmin) return <DashboardShell><div className="flex h-64 items-center justify-center text-sm text-slate-500">Akses ditolak</div></DashboardShell>

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-white">
              <ShieldCheck size={20} className="text-purple-400" /> Setting Role &amp; Akses Data
            </h1>
            <p className="mt-1 text-sm text-slate-500">Centang menu per role dan device, lalu atur scope data per user.</p>
          </div>
          <button onClick={saveAll} disabled={saving || loading} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
            <Save size={14} /> {saving ? "Menyimpan..." : "Simpan Setting"}
          </button>
        </div>

        <section className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <h2 className="mb-3 text-sm font-semibold text-white">Menu per Role & Device</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead style={{ background: "var(--surface2)" }}>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Scope Data Default</th>
                  {DEVICES.map(d => <th key={d.key} className="min-w-[280px] px-3 py-3">{d.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {ACCESS_ROLES.map(role => (
                  <tr key={role.key} className="align-top" style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold text-white">{role.label}</td>
                    <td className="px-3 py-3">
                      <select value={settings[role.key].data_scope} onChange={e => setSettings(p => ({ ...p, [role.key]: { ...p[role.key], data_scope: e.target.value as DataScope } }))}
                        className="rounded-lg px-2 py-1 text-white outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        {DATA_SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    {DEVICES.map(device => (
                      <td key={device.key} className="px-3 py-3">
                        <div className="grid grid-cols-2 gap-2">
                          {MENU_ITEMS.map(menu => (
                            <label key={menu.key} className="flex items-center gap-2 text-slate-300">
                              <input type="checkbox" checked={settings[role.key][device.key].includes(menu.key)} onChange={() => toggleMenu(role.key, device.key, menu.key)} />
                              <span>{menu.label}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl p-4" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <h2 className="mb-1 text-sm font-semibold text-white">Override Akses Data per User</h2>
          <p className="mb-3 text-xs text-slate-500">Contoh: Lyndon bisa diset “Tim Sendiri” agar hanya melihat data timnya.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead style={{ background: "var(--surface2)" }}>
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Scope Data</th>
                  <th className="px-3 py-3">Hunter yang Boleh Dilihat</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const override = overrides[u.id] || { user_id: u.id, data_scope: "team_only" as DataScope, allowed_hunter_names: [] }
                  return (
                    <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td className="px-3 py-3 font-semibold text-white">{u.name}</td>
                      <td className="px-3 py-3 text-slate-400">{u.role === "task_force" ? "Non Sales" : u.has_tm_access ? "Telemarketing" : u.role}</td>
                      <td className="px-3 py-3">
                        <select value={override.data_scope} onChange={e => updateOverride(u.id, { data_scope: e.target.value as DataScope })}
                          className="rounded-lg px-2 py-1 text-white outline-none" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                          {DATA_SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="grid min-w-[320px] grid-cols-3 gap-2">
                          {hunters.map(h => (
                            <label key={h} className="flex items-center gap-2 text-slate-300">
                              <input
                                type="checkbox"
                                checked={override.allowed_hunter_names.includes(h)}
                                onChange={() => {
                                  const current = override.allowed_hunter_names
                                  updateOverride(u.id, { allowed_hunter_names: current.includes(h) ? current.filter(x => x !== h) : [...current, h] })
                                }}
                              />
                              <span>{h}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}

function buildDefaults(): Record<AccessRoleKey, RoleSetting> {
  return Object.fromEntries(
    ACCESS_ROLES.map(r => [r.key, { role_key: r.key, ...DEFAULT_ROLE_ACCESS[r.key] }])
  ) as Record<AccessRoleKey, RoleSetting>
}
