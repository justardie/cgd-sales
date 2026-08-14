"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import { useRouter } from "next/navigation"
import DashboardShell from "@/components/DashboardShell"
import Modal from "@/components/Modal"
import { formatRupiah, isFormDirty } from "@/lib/utils"
import { Shield, Plus, Edit2, UserX, UserCheck, ArrowRightLeft, Search, ArrowUpDown } from "lucide-react"
import type { User, Role } from "@/types"
import { HUNTER_GROUPS, getHunterTitle } from "@/lib/hunters"
import { ACCESS_ROLES, accessRoleForUser } from "@/lib/access-settings"
import { ADMIN_SORT_OPTIONS, filterAndSortAdminUsers, isAdminListFiltered, type AdminSortKey } from "@/lib/admin-user-list"

/** Badge text for a user's role. Hunters show their own title (Sales Leader / Sales Manager). */
function roleLabel(u: User): string {
  return u.role === "hunter"        ? getHunterTitle(u.name) :
         u.role === "sales_person" && u.has_tm_access ? "Telemarketing" :
         u.role === "sales_person"  ? "Sales Person"   :
         u.role === "task_force"    ? "Non Sales"      : u.role
}

const controlClass = "text-xs px-3 py-2 rounded-lg text-slate-300 outline-none"
const controlStyle = { background: "var(--surface)", border: "1px solid var(--border)" }

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [transferTarget, setTransferTarget] = useState<User | null>(null)
  const [transferHunter, setTransferHunter] = useState("")
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [sortKey, setSortKey] = useState<AdminSortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const [form, setForm] = useState({
    name: "",
    role: "hunter",
    hunter_name: "",
    monthly_target: "",
    win_or_die_target: "",
    pin: "",
    has_tm_access: false,
  })
  const [initialForm, setInitialForm] = useState<typeof form | null>(null)
  const [initialTransferHunter, setInitialTransferHunter] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin && !authLoading) { router.replace("/"); return }
    if (user) fetchData()
  }, [user, isAdmin, authLoading, router])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from("users").select("*").order("name")
    setUsers(data as User[] || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    const next = { name: "", role: "hunter", hunter_name: "", monthly_target: "", win_or_die_target: "", pin: "", has_tm_access: false }
    setForm(next)
    setInitialForm(next)
    setShowModal(true)
  }

  function openEdit(u: User) {
    setEditing(u)
    const next = {
      name: u.name,
      role: u.role === "sales_person" && u.has_tm_access ? "telemarketing" : u.role,
      hunter_name: u.hunter_name || "",
      monthly_target: u.monthly_target.toString(),
      win_or_die_target: u.win_or_die_target.toString(),
      pin: "",
      has_tm_access: Boolean(u.has_tm_access),
    }
    setForm(next)
    setInitialForm(next)
    setShowModal(true)
  }

  function openTransfer(u: User) {
    setTransferTarget(u)
    const next = u.hunter_name || ""
    setTransferHunter(next)
    setInitialTransferHunter(next)
    setShowTransferModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      showToast("Nama Lengkap wajib diisi", "error")
      return
    }
    const normalizedRole = form.role === "telemarketing" ? "sales_person" : form.role
    if ((normalizedRole === "sales_person") && !form.hunter_name) {
      showToast("Tim Hunter wajib dipilih", "error")
      return
    }
    setSaving(true)
    const isHunterRole = normalizedRole === "hunter"
    const payload: Record<string, unknown> = {
      name: form.name,
      role: normalizedRole as Role,
      monthly_target: isHunterRole ? (Number(form.monthly_target) || 0) : (editing ? editing.monthly_target : 0),
      win_or_die_target: isHunterRole ? (Number(form.win_or_die_target) || 0) : 0,
      // Telemarketing is stored as Sales Person with telemarketing access enabled.
      has_tm_access: form.role === "telemarketing",
    }
    if (normalizedRole === "sales_person") {
      payload.hunter_name = form.hunter_name
    }
    if (form.pin.trim()) {
      payload.pin_hash = form.pin.trim()
    }
    const { error } = editing
      ? await supabase.from("users").update(payload).eq("id", editing.id)
      : await supabase.from("users").insert({ ...payload, pin_hash: form.pin.trim() || "1234", status: "active" })
    setSaving(false)
    if (error) {
      showToast(`Gagal menyimpan user: ${error.message}`, "error")
      return
    }
    setShowModal(false)
    fetchData()
    showToast(editing ? "User berhasil diperbarui" : "User berhasil ditambahkan", "success")
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault()
    if (!transferTarget) return
    if (!transferHunter) {
      showToast("Tim Hunter Tujuan wajib dipilih", "error")
      return
    }
    setSaving(true)
    const { error } = await supabase.from("users").update({ hunter_name: transferHunter }).eq("id", transferTarget.id)
    setSaving(false)
    if (error) {
      showToast(`Gagal memindahkan tim: ${error.message}`, "error")
      return
    }
    setShowTransferModal(false)
    setTransferTarget(null)
    fetchData()
    showToast("Tim berhasil dipindahkan", "success")
  }

  async function toggleStatus(u: User) {
    const newStatus = u.status === "active" ? "resigned" : "active"
    const { error } = await supabase.from("users").update({ status: newStatus }).eq("id", u.id)
    if (error) {
      showToast(`Gagal mengubah status: ${error.message}`, "error")
      return
    }
    fetchData()
    showToast(newStatus === "active" ? `${u.name} diaktifkan` : `${u.name} dinonaktifkan`, "success")
  }

  const listOptions = {
    search, role: filterRole, status: filterStatus, sortKey, sortDir,
    labelOf: roleLabel,
    roleKeyOf: (u: User) => accessRoleForUser(u.role, u.has_tm_access),
  }
  const visibleUsers = filterAndSortAdminUsers(users, listOptions)
  const isFiltered = isAdminListFiltered(listOptions)

  if (!isAdmin) return (
    <DashboardShell>
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">Akses ditolak</div>
    </DashboardShell>
  )

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield size={18} className="text-purple-400" /> Admin Panel
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Manajemen user & target</p>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
            <Plus size={14} /> Tambah User
          </button>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {/* Table title with its filter + sort controls alongside */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3"
            style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
            <div className="mr-auto">
              <h2 className="text-sm font-semibold text-white">Daftar User</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {loading
                  ? "Memuat..."
                  : isFiltered
                    ? `${visibleUsers.length} dari ${users.length} user`
                    : `${users.length} user`}
              </p>
            </div>

            <label className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama atau tim..."
                aria-label="Cari user"
                className={`${controlClass} pl-7 w-44`} style={controlStyle} />
            </label>

            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              aria-label="Filter role" className={controlClass} style={controlStyle}>
              <option value="">Semua Role</option>
              {ACCESS_ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>

            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              aria-label="Filter status" className={controlClass} style={controlStyle}>
              <option value="">Semua Status</option>
              <option value="active">Active</option>
              <option value="resigned">Resigned</option>
            </select>

            <select value={sortKey} onChange={e => setSortKey(e.target.value as AdminSortKey)}
              aria-label="Urutkan berdasarkan" className={controlClass} style={controlStyle}>
              {ADMIN_SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>Urutkan: {o.label}</option>)}
            </select>

            <button type="button"
              onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
              title={sortDir === "asc" ? "Urutan naik — klik untuk membalik" : "Urutan turun — klik untuk membalik"}
              className={`${controlClass} flex items-center gap-1.5 hover:text-white transition`}
              style={controlStyle}>
              <ArrowUpDown size={13} /> {sortDir === "asc" ? "Naik" : "Turun"}
            </button>

            {isFiltered && (
              <button type="button"
                onClick={() => { setSearch(""); setFilterRole(""); setFilterStatus("") }}
                className="text-xs px-2 py-2 text-slate-500 hover:text-white transition">
                Reset
              </button>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Nama</th>
                <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Role</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Target Omset</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">WoD</th>
                <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Status</th>
                <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat...</td></tr>
              ) : visibleUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs">
                  {isFiltered ? "Tidak ada user yang cocok dengan filter." : "Belum ada user."}
                </td></tr>
              ) : visibleUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{u.name}</div>
                    {u.role === "sales_person" && u.hunter_name && (
                      <div className="text-xs text-slate-500 mt-0.5">Tim: {u.hunter_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.role === "admin"          ? "bg-purple-500/20 text-purple-400" :
                      u.role === "hunter"         ? "bg-blue-500/20 text-blue-400" :
                      u.role === "sales_person"   ? "bg-green-500/20 text-green-400" :
                                                    "bg-slate-500/20 text-slate-400"
                    }`}>
                      {roleLabel(u)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400">
                    {u.role === "hunter" ? formatRupiah(u.monthly_target) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400">
                    {u.role === "hunter" ? formatRupiah(u.win_or_die_target) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === "active" ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(u)} className="text-blue-400 hover:text-blue-300 transition" title="Edit">
                        <Edit2 size={13} />
                      </button>
                      {u.role === "sales_person" && (
                        <button onClick={() => openTransfer(u)} className="text-orange-400 hover:text-orange-300 transition" title="Pindah Tim">
                          <ArrowRightLeft size={13} />
                        </button>
                      )}
                      <button onClick={() => toggleStatus(u)}
                        className={`transition ${u.status === "active" ? "text-slate-500 hover:text-red-400" : "text-slate-500 hover:text-green-400"}`}
                        title={u.status === "active" ? "Nonaktifkan" : "Aktifkan"}>
                        {u.status === "active" ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} maxWidth="max-w-md" isDirty={isFormDirty(initialForm, form)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{editing ? `Edit: ${editing.name}` : "Tambah User Baru"}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Nama Lengkap</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <option value="hunter">Sales Leader / Sales Manager</option>
                  <option value="sales_person">Sales Person</option>
                  <option value="telemarketing">Telemarketing</option>
                  <option value="task_force">Non Sales</option>
                  <option value="admin">Admin</option>
                </select>
                {form.role === "telemarketing" && (
                  <p className="text-xs text-amber-400/80 mt-1">
                    Akses: Overview, Pipeline, Closing, Leads Funnel, Funnel Summary
                  </p>
                )}
                {form.role === "task_force" && (
                  <p className="text-xs text-blue-400/80 mt-1">
                    Dapat akses Overview, Pipeline, Closing, dan Unit Special
                  </p>
                )}
              </div>
              {(form.role === "sales_person" || form.role === "telemarketing") && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Tim Hunter</label>
                  <select value={form.hunter_name} onChange={e => setForm(f => ({ ...f, hunter_name: e.target.value }))} required
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Pilih Hunter —</option>
                    {HUNTER_GROUPS.map(h => (
                      <option key={h.dbName} value={h.dbName}>{h.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {form.role === "hunter" && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Target Omset/bulan (Rp)</label>
                  <input type="number" value={form.monthly_target} onChange={e => setForm(f => ({ ...f, monthly_target: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              )}
              {form.role === "hunter" && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Win-or-Die (Rp)</label>
                  <input type="number" value={form.win_or_die_target} onChange={e => setForm(f => ({ ...f, win_or_die_target: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              )}
              {(form.role === "hunter" || form.role === "admin" || form.role === "telemarketing") && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">PIN {editing ? "(kosongkan jika tidak diubah)" : ""}</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.pin}
                    onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))}
                    placeholder={editing ? "••••" : "4 digit PIN"}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none tracking-widest"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Transfer SP Modal */}
      {showTransferModal && transferTarget && (
        <Modal onClose={() => { setShowTransferModal(false); setTransferTarget(null) }} maxWidth="max-w-md" isDirty={isFormDirty(initialTransferHunter, transferHunter)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Pindah Tim</h3>
            <p className="text-xs text-slate-500 mb-4">
              Pindahkan <span className="text-white font-medium">{transferTarget.name}</span> ke tim hunter lain
            </p>
            <form onSubmit={handleTransfer} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Tim Hunter Tujuan</label>
                <select value={transferHunter} onChange={e => setTransferHunter(e.target.value)} required
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <option value="">— Pilih Hunter —</option>
                  {HUNTER_GROUPS.map(h => (
                    <option key={h.dbName} value={h.dbName}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowTransferModal(false); setTransferTarget(null) }}
                  className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition"
                  style={{ background: "#E84500" }}>
                  {saving ? "Memindahkan..." : "Pindahkan"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </DashboardShell>
  )
}
