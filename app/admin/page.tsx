"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah } from "@/lib/utils"
import { Shield, Plus, X, Edit2, UserX, UserCheck } from "lucide-react"
import type { User } from "@/types"

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-xl relative" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={16} /></button>
        {children}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { user, isAdmin } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<"users" | "targets">("users")

  const [form, setForm] = useState({
    name: "",
    role: "hunter",
    win_or_die_target: "",
    visit_target: "40",
  })

  useEffect(() => {
    if (!isAdmin && !loading) { router.replace("/"); return }
    if (user) fetchData()
  }, [user, isAdmin])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from("users").select("*").order("name")
    setUsers(data as User[] || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ name: "", role: "hunter", win_or_die_target: "", visit_target: "40" })
    setShowModal(true)
  }

  function openEdit(u: User) {
    setEditing(u)
    setForm({
      name: u.name,
      role: u.role,
      win_or_die_target: u.win_or_die_target.toString(),
      visit_target: u.visit_target.toString(),
    })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      role: form.role as "admin" | "hunter",
      monthly_target: editing ? editing.monthly_target : 0,
      win_or_die_target: Number(form.win_or_die_target) || 0,
      visit_target: Number(form.visit_target) || 40,
    }
    if (editing) {
      await supabase.from("users").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("users").insert({ ...payload, pin_hash: "noop", status: "active" })
    }
    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  async function toggleStatus(u: User) {
    const newStatus = u.status === "active" ? "resigned" : "active"
    await supabase.from("users").update({ status: newStatus }).eq("id", u.id)
    fetchData()
  }

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
          {tab === "users" && (
            <button onClick={openNew}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
              <Plus size={14} /> Tambah Hunter
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { key: "users", label: "User Management" },
            { key: "targets", label: "Target Bulanan" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as "users" | "targets")}
              className={`text-xs px-4 py-2 rounded-lg transition ${tab === t.key ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
              style={tab !== t.key ? { background: "var(--surface)", border: "1px solid var(--border)" } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Users Table */}
        {tab === "users" && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Nama</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Role</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Target</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">WoD</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Status</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat...</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">{formatRupiah(u.monthly_target)}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-400">{formatRupiah(u.win_or_die_target)}</td>
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
        )}

        {/* Targets Tab */}
        {tab === "targets" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Target individu diedit langsung di data user. Klik Edit di tab User Management.</p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                    <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Hunter</th>
                    <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Target Omset/bln</th>
                    <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Win-or-Die</th>
                    <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Target Visit/bln</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.status === "active").map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{formatRupiah(u.monthly_target)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{formatRupiah(u.win_or_die_target)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{u.visit_target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{editing ? `Edit: ${editing.name}` : "Tambah Hunter Baru"}</h3>
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
                  <option value="hunter">Sales Hunter</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Win-or-Die (Rp)</label>
                <input type="number" value={form.win_or_die_target} onChange={e => setForm(f => ({ ...f, win_or_die_target: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Target Visit/bln</label>
                <input type="number" value={form.visit_target} onChange={e => setForm(f => ({ ...f, visit_target: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
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
    </DashboardShell>
  )
}
