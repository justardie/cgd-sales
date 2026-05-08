"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, getMonthName } from "@/lib/utils"
import { getSpOptions, HUNTER_GROUPS } from "@/lib/hunters"
import { Plus, X, ChevronLeft, ChevronRight, Edit2, Trash2 } from "lucide-react"
import type { User } from "@/types"

interface ClosingRow {
  id: string
  user_id: string
  konsumen_name: string
  project: string | null
  unit: string | null
  closing_value: number
  closing_date: string
  visit_date: string | null
  month: number
  year: number
  notes: string | null
  salesname: string | null
  pipeline_id: string | null
  cara_bayar: string | null
}

interface PipelineRow {
  id: string
  name: string
  sales: string
  unit: string
  value: number
  slhunter: string
  status: string
  user_id?: string
}

const PROJECT_COLORS: Record<string, string> = {
  "Central Hills":  "bg-blue-500/10 text-blue-400",
  "Central Tiban":  "bg-cyan-500/10 text-cyan-400",
  "MRD":            "bg-purple-500/10 text-purple-400",
  "SCC":            "bg-green-500/10 text-green-400",
}
function projColor(p: string | null) {
  if (!p) return "bg-slate-500/10 text-slate-400"
  for (const [k, v] of Object.entries(PROJECT_COLORS)) {
    if (p.toLowerCase().includes(k.toLowerCase())) return v
  }
  return "bg-slate-500/10 text-slate-400"
}

const CARA_BAYAR_OPTIONS = ["KPR", "Cash", "Cash Bertahap", "Lainnya"]

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-xl relative max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={16} /></button>
        {children}
      </div>
    </div>
  )
}

export default function ClosingPage() {
  const { user, isAdmin } = useAuth()
  const [closings, setClosings] = useState<ClosingRow[]>([])
  const [pipelines, setPipelines] = useState<PipelineRow[]>([])
  const [hunters, setHunters] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear]   = useState(new Date().getFullYear())

  // Filters
  const [filterHunter,   setFilterHunter]   = useState("")
  const [filterProject,  setFilterProject]  = useState("")
  const [filterCaraBayar, setFilterCaraBayar] = useState("")

  // Modals
  const [showInputModal,  setShowInputModal]  = useState(false)
  const [showEditModal,   setShowEditModal]   = useState(false)
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [editingClosing,  setEditingClosing]  = useState<ClosingRow | null>(null)
  const [editingHunter,   setEditingHunter]   = useState<User | null>(null)
  const [newTarget,       setNewTarget]       = useState("")

  const blankForm = {
    user_id: user?.id || "",
    pipeline_id: "",
    konsumen_name: "",
    project: "",
    unit: "",
    closing_value: "",
    cara_bayar: "",
    visit_date: "",
    closing_date: new Date().toISOString().slice(0, 10),
    salesname: "",
    notes: "",
  }
  const [form, setForm] = useState(blankForm)

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  useEffect(() => { if (user) fetchData() }, [user, month, year])

  async function fetchData() {
    setLoading(true)
    const [closingsRes, pipeRes, usersRes] = await Promise.all([
      supabase.from("Closing")
        .select("id,user_id,konsumen_name,project,unit,closing_value,closing_date,visit_date,month,year,notes,salesname,pipeline_id,cara_bayar")
        .eq("month", month).eq("year", year)
        .order("closing_date", { ascending: false }),
      supabase.from("pipeline")
        .select("id,name,sales,unit,value,slhunter,status,user_id")
        .not("status", "eq", "closed_won")
        .not("status", "eq", "closed_lost"),
      supabase.from("users")
        .select("id,name,monthly_target,role,status")
        .eq("status", "active")
        .eq("role", "hunter"),
    ])
    setHunters((usersRes.data || []) as User[])
    setClosings((closingsRes.data || []) as ClosingRow[])
    const allPipes = (pipeRes.data || []) as PipelineRow[]
    setPipelines(isAdmin ? allPipes : allPipes.filter(p =>
      p.user_id === user!.id || (p.slhunter || "").toLowerCase() === (user?.name || "").toLowerCase()
    ))
    setLoading(false)
  }

  function onPipelineSelect(id: string) {
    const p = pipelines.find(x => x.id === id)
    if (p) setForm(f => ({ ...f, pipeline_id: id, konsumen_name: p.name || "", project: p.sales || "", unit: p.unit || "", closing_value: p.value?.toString() || "", user_id: p.user_id || f.user_id }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.closing_value || Number(form.closing_value) <= 0) return
    setSaving(true)
    const d = new Date(form.closing_date)
    await supabase.from("Closing").insert({
      user_id: form.user_id || user!.id,
      pipeline_id: form.pipeline_id || null,
      konsumen_name: form.konsumen_name,
      project: form.project || null,
      unit: form.unit || null,
      closing_value: Number(form.closing_value),
      cara_bayar: form.cara_bayar || null,
      visit_date: form.visit_date || null,
      closing_date: form.closing_date,
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      salesname: form.salesname || null,
      notes: form.notes || null,
    })
    if (form.pipeline_id) {
      await supabase.from("pipeline").update({ status: "closed_won" }).eq("id", form.pipeline_id)
    }
    setSaving(false)
    setShowInputModal(false)
    setForm(blankForm)
    fetchData()
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingClosing) return
    setSaving(true)
    await supabase.from("Closing").update({
      konsumen_name: form.konsumen_name,
      project: form.project || null,
      unit: form.unit || null,
      closing_value: Number(form.closing_value),
      cara_bayar: form.cara_bayar || null,
      salesname: form.salesname || null,
      closing_date: form.closing_date,
      visit_date: form.visit_date || null,
      notes: form.notes || null,
    }).eq("id", editingClosing.id)
    setSaving(false)
    setShowEditModal(false)
    setEditingClosing(null)
    fetchData()
  }

  function openEdit(c: ClosingRow) {
    setEditingClosing(c)
    setForm({
      user_id: c.user_id,
      pipeline_id: c.pipeline_id || "",
      konsumen_name: c.konsumen_name,
      project: c.project || "",
      unit: c.unit || "",
      closing_value: c.closing_value.toString(),
      cara_bayar: c.cara_bayar || "",
      visit_date: c.visit_date || "",
      closing_date: c.closing_date,
      salesname: c.salesname || "",
      notes: c.notes || "",
    })
    setShowEditModal(true)
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus data closing ini?")) return
    await supabase.from("Closing").delete().eq("id", id)
    fetchData()
  }

  function openTargetEdit(h: User) {
    setEditingHunter(h)
    setNewTarget(h.monthly_target.toString())
    setShowTargetModal(true)
  }

  async function handleTargetSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingHunter) return
    setSaving(true)
    await supabase.from("users").update({ monthly_target: Number(newTarget) }).eq("id", editingHunter.id)
    setSaving(false)
    setShowTargetModal(false)
    setEditingHunter(null)
    fetchData()
  }

  // Display hunters in HUNTER_GROUPS order, admin = all, hunter = self
  const displayHunters = isAdmin
    ? HUNTER_GROUPS.map(g => hunters.find(h => h.name === g.dbName || h.name === g.name)).filter((h): h is User => !!h)
    : hunters.filter(h => h.id === user?.id)

  // Filter closings
  const filtered = closings.filter(c => {
    if (filterHunter   && c.user_id  !== filterHunter)   return false
    if (filterProject  && c.project  !== filterProject)   return false
    if (filterCaraBayar && c.cara_bayar !== filterCaraBayar) return false
    return true
  })

  const totalOmset = filtered.reduce((s, c) => s + (c.closing_value || 0), 0)

  // Unique projects from data
  const projectOptions = Array.from(new Set(closings.map(c => c.project).filter(Boolean))) as string[]

  const adminSelectedHunterName = hunters.find(u => u.id === form.user_id)?.name || ""
  const spOptions = isAdmin ? getSpOptions(adminSelectedHunterName) : getSpOptions(user?.name || "")

  function ClosingForm({ onSubmit, title, submitLabel }: { onSubmit: (e: React.FormEvent) => Promise<void>; title: string; submitLabel: string }) {
    return (
      <div className="p-5">
        <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
        <form onSubmit={onSubmit} className="space-y-3">
          {isAdmin && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Hunter</label>
              <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value, salesname: "" }))}
                className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <option value="">— Pilih Hunter —</option>
                {HUNTER_GROUPS.map(g => {
                  const h = hunters.find(u => u.name === g.dbName || u.name === g.name)
                  return h ? <option key={h.id} value={h.id}>{g.name}</option> : null
                })}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Sales Person</label>
            {spOptions.length > 0 ? (
              <select value={form.salesname} onChange={e => setForm(f => ({ ...f, salesname: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <option value="">— Tanpa SP / Hunter Langsung —</option>
                {spOptions.map(sp => <option key={sp} value={sp}>{sp}</option>)}
              </select>
            ) : (
              <input type="text" value={form.salesname} onChange={e => setForm(f => ({ ...f, salesname: e.target.value }))}
                placeholder="Nama sales person (opsional)"
                className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Dari Pipeline (opsional)</label>
            <select value={form.pipeline_id}
              onChange={e => { if (e.target.value) onPipelineSelect(e.target.value); else setForm(f => ({ ...f, pipeline_id: "" })) }}
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <option value="">— Manual (tanpa pipeline) —</option>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name} · {p.sales}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Nama Konsumen *</label>
            <input type="text" value={form.konsumen_name} required onChange={e => setForm(f => ({ ...f, konsumen_name: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Proyek</label>
              <input type="text" value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Cluster / Unit</label>
              <input type="text" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Nilai HJR (Rp) *</label>
              <input type="number" value={form.closing_value} required onChange={e => setForm(f => ({ ...f, closing_value: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Cara Bayar</label>
              <select value={form.cara_bayar} onChange={e => setForm(f => ({ ...f, cara_bayar: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <option value="">— Pilih —</option>
                {CARA_BAYAR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Tanggal Visit</label>
              <input type="date" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Tanggal Closing *</label>
              <input type="date" value={form.closing_date} required onChange={e => setForm(f => ({ ...f, closing_date: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setShowInputModal(false); setShowEditModal(false) }}
              className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>Batal</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition">
              {saving ? "Menyimpan..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <DashboardShell>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Closing</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {getMonthName(month)} {year} · {filtered.length} transaksi · {formatRupiah(totalOmset)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}><ChevronLeft size={14} /></button>
            <div className="text-sm font-semibold text-white min-w-[130px] text-center">{getMonthName(month)} {year}</div>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}><ChevronRight size={14} /></button>
            <button onClick={() => { setForm(blankForm); setShowInputModal(true) }}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
              <Plus size={14} /> Input Closing
            </button>
          </div>
        </div>

        {/* Hunter Summary Cards */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {displayHunters.map(hunter => {
              const total = closings.filter(c => c.user_id === hunter.id).reduce((s, c) => s + c.closing_value, 0)
              const pct   = hunter.monthly_target > 0 ? Math.round((total / hunter.monthly_target) * 100) : 0
              const bar   = pct >= 100 ? "#22c55e" : pct >= 70 ? "#E84500" : "#ef4444"
              return (
                <div key={hunter.id} className="rounded-xl p-3 relative group"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <button onClick={() => openTargetEdit(hunter)}
                    className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-white">
                    <Edit2 size={11} />
                  </button>
                  <div className="text-xs text-slate-400 font-medium truncate pr-4">{hunter.name}</div>
                  <div className="text-base font-black text-white mt-1">{formatRupiah(total)}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Target: {formatRupiah(hunter.monthly_target)}
                  </div>
                  <div className="mt-2 h-1 rounded-full" style={{ background: "var(--surface2)" }}>
                    <div className="h-1 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: bar }} />
                  </div>
                  <div className={`text-xs font-bold mt-1 ${pct >= 100 ? "text-green-400" : pct >= 70 ? "text-orange-400" : "text-red-400"}`}>
                    {pct}%
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select value={filterHunter} onChange={e => setFilterHunter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-300 outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <option value="">Semua Hunter</option>
            {displayHunters.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-300 outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <option value="">Semua Project</option>
            {projectOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterCaraBayar} onChange={e => setFilterCaraBayar(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-300 outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <option value="">Semua Cara Bayar</option>
            {CARA_BAYAR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {(filterHunter || filterProject || filterCaraBayar) && (
            <button onClick={() => { setFilterHunter(""); setFilterProject(""); setFilterCaraBayar("") }}
              className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              Reset Filter
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Konsumen</th>
                  {isAdmin && <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Hunter</th>}
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Sales Person</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Project</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Unit</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Nilai</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Cara Bayar</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Tgl Closing</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-600 text-xs">Memuat...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-600 text-xs">Belum ada closing {getMonthName(month)} {year}</td></tr>
                ) : filtered.map(c => {
                  const hunterName = hunters.find(h => h.id === c.user_id)?.name || "—"
                  return (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-white text-xs">{c.konsumen_name}</td>
                      {isAdmin && <td className="px-4 py-3 text-xs text-slate-400">{hunterName}</td>}
                      <td className="px-4 py-3 text-xs text-slate-400">{c.salesname || "—"}</td>
                      <td className="px-4 py-3">
                        {c.project
                          ? <span className={`text-xs px-2 py-0.5 rounded-full ${projColor(c.project)}`}>{c.project}</span>
                          : <span className="text-xs text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{c.unit || "—"}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-green-400">{formatRupiah(c.closing_value)}</td>
                      <td className="px-4 py-3 text-center">
                        {c.cara_bayar
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{c.cara_bayar}</span>
                          : <span className="text-xs text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-400">{c.closing_date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(c)} className="text-blue-400 hover:text-blue-300 transition" title="Edit">
                            <Edit2 size={13} />
                          </button>
                          {isAdmin && (
                            <button onClick={() => handleDelete(c.id)} className="text-slate-600 hover:text-red-400 transition" title="Hapus">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Input Closing Modal */}
      {showInputModal && (
        <Modal onClose={() => setShowInputModal(false)}>
          <ClosingForm onSubmit={handleSave} title="Input Closing" submitLabel="Konfirmasi Closing" />
        </Modal>
      )}

      {/* Edit Closing Modal */}
      {showEditModal && editingClosing && (
        <Modal onClose={() => { setShowEditModal(false); setEditingClosing(null) }}>
          <ClosingForm onSubmit={handleEditSave} title={`Edit: ${editingClosing.konsumen_name}`} submitLabel="Simpan Perubahan" />
        </Modal>
      )}

      {/* Edit Target Modal */}
      {showTargetModal && editingHunter && (
        <Modal onClose={() => { setShowTargetModal(false); setEditingHunter(null) }}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Edit Target</h3>
            <p className="text-xs text-slate-500 mb-4">{editingHunter.name}</p>
            <form onSubmit={handleTargetSave} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Target Omset/bulan (Rp)</label>
                <input type="number" value={newTarget} onChange={e => setNewTarget(e.target.value)} required
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowTargetModal(false); setEditingHunter(null) }}
                  className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>Batal</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition"
                  style={{ background: "#E84500" }}>
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
