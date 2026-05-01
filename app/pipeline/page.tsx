"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah } from "@/lib/utils"
import { TrendingUp, Plus, X, Search } from "lucide-react"
import type { Pipeline, User } from "@/types"

const STATUSES = [
  { value: "cold", label: "Cold", color: "bg-slate-500/20 text-slate-400" },
  { value: "warm", label: "Warm", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "hot", label: "Hot", color: "bg-orange-500/20 text-orange-400" },
  { value: "negotiation", label: "Negosiasi", color: "bg-purple-500/20 text-purple-400" },
  { value: "closed_won", label: "Closing!", color: "bg-green-500/20 text-green-400" },
  { value: "closed_lost", label: "Batal", color: "bg-red-500/20 text-red-400" },
]

const statusBadge = (s: string) => STATUSES.find(x => x.value === s) || { label: s, color: "bg-slate-500/20 text-slate-400" }

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

export default function PipelinePage() {
  const { user, isAdmin } = useAuth()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Pipeline | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    user_id: user?.id || "",
    konsumen_name: "",
    project: "",
    unit: "",
    estimated_value: "",
    status: "cold",
    notes: "",
  })

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    setLoading(true)
    const [pipeRes, usersRes] = await Promise.all([
      supabase.from("pipeline").select("*").order("created_at", { ascending: false }),
      isAdmin ? supabase.from("users").select("id,name").eq("status", "active") : Promise.resolve({ data: [] }),
    ])
    const all = pipeRes.data || []
    setPipelines(isAdmin ? all : all.filter(p => p.user_id === user!.id))
    if (isAdmin) setUsers(usersRes.data as User[] || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ user_id: user!.id, konsumen_name: "", project: "", unit: "", estimated_value: "", status: "cold", notes: "" })
    setShowModal(true)
  }

  function openEdit(p: Pipeline) {
    setEditing(p)
    setForm({
      user_id: p.user_id,
      konsumen_name: p.konsumen_name,
      project: p.project || "",
      unit: p.unit || "",
      estimated_value: p.estimated_value?.toString() || "",
      status: p.status,
      notes: p.notes || "",
    })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      user_id: form.user_id || user!.id,
      konsumen_name: form.konsumen_name,
      project: form.project || null,
      unit: form.unit || null,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      status: form.status,
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }
    if (editing) {
      await supabase.from("pipeline").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("pipeline").insert({ ...payload, created_at: new Date().toISOString() })
    }
    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  const filtered = pipelines.filter(p => {
    const matchSearch = !search || p.konsumen_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.project || "").toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total: pipelines.filter(p => !["closed_won","closed_lost"].includes(p.status)).length,
    hot: pipelines.filter(p => p.status === "hot").length,
    totalValue: pipelines.filter(p => !["closed_lost"].includes(p.status))
      .reduce((s, p) => s + (p.estimated_value || 0), 0),
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Pipeline</h1>
            <p className="text-sm text-slate-500 mt-0.5">{stats.total} prospek aktif · {formatRupiah(stats.totalValue)}</p>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
            <Plus size={14} /> Tambah Pipeline
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Aktif", val: stats.total, color: "text-blue-400" },
            { label: "Hot", val: stats.hot, color: "text-orange-400" },
            { label: "Est. Nilai", val: formatRupiah(stats.totalValue), color: "text-green-400" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs text-slate-500 mb-1">{s.label}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari konsumen / proyek..."
              className="pl-8 pr-3 py-2 text-sm rounded-lg text-white outline-none w-64"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
          </div>
          <div className="flex gap-1">
            {[{ value: "all", label: "Semua" }, ...STATUSES].map(s => (
              <button key={s.value} onClick={() => setFilterStatus(s.value)}
                className={`text-xs px-3 py-1.5 rounded-lg transition ${filterStatus === s.value ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                style={filterStatus !== s.value ? { background: "var(--surface)", border: "1px solid var(--border)" } : {}}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                {isAdmin && <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Hunter</th>}
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Konsumen</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Proyek / Unit</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Est. Nilai</th>
                <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Status</th>
                <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs">Tidak ada data</td></tr>
              ) : filtered.slice(0, 100).map(p => {
                const s = statusBadge(p.status)
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                    {isAdmin && <td className="px-4 py-3 text-xs text-slate-400">{p.user_id?.slice(0, 8)}…</td>}
                    <td className="px-4 py-3 font-medium text-white">{p.konsumen_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{p.project}{p.unit ? ` · ${p.unit}` : ""}</td>
                    <td className="px-4 py-3 text-right text-slate-300 text-xs">
                      {p.estimated_value ? formatRupiah(p.estimated_value) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(p)} className="text-xs text-blue-400 hover:text-blue-300 transition">Edit</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{editing ? "Edit Pipeline" : "Tambah Pipeline"}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              {isAdmin && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Hunter</label>
                  <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value={user!.id}>Saya</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              {[
                { key: "konsumen_name", label: "Nama Konsumen", required: true },
                { key: "project", label: "Proyek" },
                { key: "unit", label: "Unit / Tipe" },
                { key: "estimated_value", label: "Estimasi Nilai (Rp)", type: "number" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                  <input type={f.type || "text"} value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    required={f.required}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Catatan</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none resize-none"
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
