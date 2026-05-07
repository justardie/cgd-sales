"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah } from "@/lib/utils"
import { getSpOptions, HUNTER_GROUPS } from "@/lib/hunters"
import { Plus, X, Search } from "lucide-react"

// Legacy pipeline table columns:
// id (text), name (konsumen), slhunter (hunter name), sales (project),
// unit, payment, value (numeric), bf, source, status,
// visitdate, dateadded, note, ts (bigint), user_id (UUID)
// + salesname (TEXT, added via migration 005)

interface PipelineRow {
  id: string
  name: string        // konsumen
  slhunter: string    // hunter name
  salesname: string   // sales person name
  sales: string       // project
  unit: string
  payment: string
  value: number
  bf: string
  source: string
  status: string
  visitdate: string
  dateadded: string
  note: string
  ts: number
  user_id?: string
}

const PROJECTS = [
  "Central Hills",
  "Central Tiban",
  "MRD CRBA+CBA",
  "MRD CLH",
  "MRD CRTU",
  "SCC",
]

const STATUSES = [
  { value: "cold",        label: "Cold",     color: "bg-slate-500/20 text-slate-400" },
  { value: "warm",        label: "Warm",     color: "bg-yellow-500/20 text-yellow-400" },
  { value: "hot",         label: "Hot",      color: "bg-orange-500/20 text-orange-400" },
  { value: "closing",     label: "Closing!", color: "bg-green-500/20 text-green-400" },
  { value: "closed_lost", label: "Batal",    color: "bg-red-500/20 text-red-400" },
]

const statusBadge = (s: string) =>
  STATUSES.find(x => x.value === s) ||
  { label: s || "—", color: "bg-slate-500/20 text-slate-400" }

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg rounded-xl relative max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  )
}

const emptyForm = {
  slhunter: "",
  name: "",
  salesname: "",
  sales: "",
  unit: "",
  value: "",
  source: "",
  payment: "",
  visitdate: "",
  status: "cold",
  note: "",
}

interface ClosingForm {
  pipeline_id: string
  hunter_user_id: string
  konsumen_name: string
  project: string
  unit: string
  closing_value: string
  visit_date: string
  closing_date: string
  salesname: string
}

export default function PipelinePage() {
  const { user, isAdmin } = useAuth()
  const [pipelines, setPipelines] = useState<PipelineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showClosingModal, setShowClosingModal] = useState(false)
  const [editing, setEditing] = useState<PipelineRow | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [saving, setSaving] = useState(false)
  const [savingClosing, setSavingClosing] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [closingForm, setClosingForm] = useState<ClosingForm>({
    pipeline_id: "", hunter_user_id: "", konsumen_name: "",
    project: "", unit: "", closing_value: "", visit_date: "",
    closing_date: new Date().toISOString().slice(0, 10), salesname: "",
  })

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from("pipeline").select("*").order("ts", { ascending: false })
    const all = (data || []) as PipelineRow[]
    if (isAdmin) {
      setPipelines(all)
    } else {
      setPipelines(all.filter(p =>
        p.user_id === user!.id ||
        p.slhunter?.toLowerCase() === user!.name?.toLowerCase()
      ))
    }
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  function openEdit(p: PipelineRow) {
    setEditing(p)
    setForm({
      slhunter: p.slhunter || "",
      name: p.name || "",
      salesname: p.salesname || "",
      sales: p.sales || "",
      unit: p.unit || "",
      value: p.value?.toString() || "",
      source: p.source || "",
      payment: p.payment || "",
      visitdate: p.visitdate || "",
      status: p.status || "cold",
      note: p.note || "",
    })
    setShowModal(true)
  }

  async function handleClosingConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!closingForm.closing_value || Number(closingForm.closing_value) <= 0) return
    setSavingClosing(true)
    const d = new Date(closingForm.closing_date)
    await supabase.from("closings").insert({
      user_id: closingForm.hunter_user_id || user!.id,
      pipeline_id: closingForm.pipeline_id,
      konsumen_name: closingForm.konsumen_name,
      project: closingForm.project || null,
      unit: closingForm.unit || null,
      closing_value: Number(closingForm.closing_value),
      visit_date: closingForm.visit_date || null,
      closing_date: closingForm.closing_date,
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      salesname: closingForm.salesname || null,
    })
    await supabase.from("pipeline").update({ status: "closed_won" }).eq("id", closingForm.pipeline_id)
    setSavingClosing(false)
    setShowClosingModal(false)
    fetchData()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    // Intercept: closing status triggers migration modal
    if (form.status === "closing" && editing) {
      setClosingForm({
        pipeline_id: editing.id,
        hunter_user_id: editing.user_id || "",
        konsumen_name: editing.name || "",
        project: editing.sales || "",
        unit: editing.unit || "",
        closing_value: editing.value?.toString() || "",
        visit_date: editing.visitdate || "",
        closing_date: new Date().toISOString().slice(0, 10),
        salesname: form.salesname || "",
      })
      setShowModal(false)
      setShowClosingModal(true)
      return
    }

    setSaving(true)
    const payload = {
      name: form.name,
      slhunter: isAdmin ? form.slhunter : user!.name,
      salesname: form.salesname || null,
      sales: form.sales || null,
      unit: form.unit || null,
      value: form.value ? Number(form.value) : null,
      source: form.source || null,
      payment: form.payment || null,
      visitdate: form.visitdate || null,
      status: form.status,
      note: form.note || null,
      user_id: user!.id,
      ts: Date.now(),
      dateadded: new Date().toISOString().slice(0, 10),
    }
    if (editing) {
      await supabase.from("pipeline").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("pipeline").insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  const filtered = pipelines.filter(p => {
    const matchSearch = !search ||
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.sales || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.slhunter || "").toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || p.status === filterStatus
    return matchSearch && matchStatus
  })

  const activePipes = pipelines.filter(p => !["closing", "closed_lost"].includes(p.status))
  const stats = {
    total: activePipes.length,
    hot: pipelines.filter(p => p.status === "hot").length,
    totalValue: activePipes.reduce((s, p) => s + (Number(p.value) || 0), 0),
  }

  // SP options: for admin, cascade from selected hunter in form; for hunter, use their own SPs
  const spOptions = isAdmin
    ? getSpOptions(form.slhunter)
    : getSpOptions(user?.name || "")

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Pipeline</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {stats.total} prospek aktif · {formatRupiah(stats.totalValue)}
            </p>
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
            <div key={i} className="rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
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
              placeholder="Cari konsumen / proyek / hunter..."
              className="pl-8 pr-3 py-2 text-sm rounded-lg text-white outline-none w-64"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {[{ value: "all", label: "Semua" }, ...STATUSES].map(s => (
              <button key={s.value} onClick={() => setFilterStatus(s.value)}
                className={`text-xs px-3 py-1.5 rounded-lg transition ${
                  filterStatus === s.value ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
                style={filterStatus !== s.value
                  ? { background: "var(--surface)", border: "1px solid var(--border)" } : {}}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  {isAdmin && <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Hunter</th>}
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Sales Person</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Konsumen</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Proyek / Unit</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium whitespace-nowrap">Est. Nilai</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium whitespace-nowrap">Visit</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-600 text-xs">Tidak ada data</td></tr>
                ) : filtered.slice(0, 100).map(p => {
                  const s = statusBadge(p.status)
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}
                      className="hover:bg-white/[0.02]">
                      {isAdmin && (
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{p.slhunter || "—"}</td>
                      )}
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{p.salesname || "—"}</td>
                      <td className="px-4 py-3 font-medium text-white text-xs">{p.name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {p.sales}{p.unit ? ` · ${p.unit}` : ""}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300 text-xs whitespace-nowrap">
                        {p.value ? formatRupiah(Number(p.value)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 text-xs whitespace-nowrap">
                        {p.visitdate || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${s.color}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openEdit(p)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition">
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showClosingModal && (
        <Modal onClose={() => setShowClosingModal(false)}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-semibold">Closing!</span>
              <h3 className="text-sm font-semibold text-white">Konfirmasi Data Closing</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Pipeline ini akan dipindahkan ke halaman Closing dan ditandai selesai.</p>
            <form onSubmit={handleClosingConfirm} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Nama Konsumen</label>
                <input type="text" value={closingForm.konsumen_name} required
                  onChange={e => setClosingForm(f => ({ ...f, konsumen_name: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Proyek</label>
                  <input type="text" value={closingForm.project}
                    onChange={e => setClosingForm(f => ({ ...f, project: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Cluster / Unit</label>
                  <input type="text" value={closingForm.unit}
                    onChange={e => setClosingForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Nilai HJR (Rp) <span className="text-red-400">*</span></label>
                <input type="number" value={closingForm.closing_value} required
                  onChange={e => setClosingForm(f => ({ ...f, closing_value: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Sales Person</label>
                <input type="text" value={closingForm.salesname}
                  onChange={e => setClosingForm(f => ({ ...f, salesname: e.target.value }))}
                  placeholder="Nama SP (opsional)"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Tanggal Visit</label>
                  <input type="date" value={closingForm.visit_date}
                    onChange={e => setClosingForm(f => ({ ...f, visit_date: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Tanggal Closing <span className="text-red-400">*</span></label>
                  <input type="date" value={closingForm.closing_date} required
                    onChange={e => setClosingForm(f => ({ ...f, closing_date: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowClosingModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  Batal
                </button>
                <button type="submit" disabled={savingClosing}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition"
                  style={{ background: "#E84500" }}>
                  {savingClosing ? "Menyimpan..." : "Konfirmasi Closing"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              {editing ? "Edit Pipeline" : "Tambah Pipeline"}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">

              {/* Hunter — dropdown for admin, read-only for hunter */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Hunter</label>
                {isAdmin ? (
                  <select
                    value={form.slhunter}
                    onChange={e => setForm(f => ({ ...f, slhunter: e.target.value, salesname: "" }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Pilih Hunter —</option>
                    {HUNTER_GROUPS.map(g => (
                      <option key={g.dbName} value={g.dbName}>{g.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full text-sm px-3 py-2 rounded-lg text-slate-400"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    {user?.name || "—"}
                  </div>
                )}
              </div>

              {/* Sales Person dropdown */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Sales Person</label>
                {spOptions.length > 0 ? (
                  <select
                    value={form.salesname}
                    onChange={e => setForm(f => ({ ...f, salesname: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Tidak ada / Langsung Hunter —</option>
                    {spOptions.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.salesname}
                    onChange={e => setForm(f => ({ ...f, salesname: e.target.value }))}
                    placeholder="Nama sales person (opsional)"
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                )}
              </div>

              {/* Consumer Name */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  Nama Konsumen <span className="text-red-400">*</span>
                </label>
                <input type="text" value={form.name} required
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>

              {/* Project dropdown */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Proyek</label>
                <select value={form.sales}
                  onChange={e => setForm(f => ({ ...f, sales: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <option value="">— Pilih Proyek —</option>
                  {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Cluster/Unit */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Klaster / Unit</label>
                <input type="text" value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="Contoh: Kavling 8A, Type 45"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>

              {/* Potential Value */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Potensi Closing (Rp)</label>
                <input type="number" value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>

              {/* Lead Source */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Sumber Lead</label>
                <input type="text" value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="Contoh: Referral, Digital, Walk-in"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Cara Bayar</label>
                <input type="text" value={form.payment}
                  onChange={e => setForm(f => ({ ...f, payment: e.target.value }))}
                  placeholder="Contoh: KPR, Cash, Cicilan Developer"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>

              {/* Visit Date */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Tanggal Visit</label>
                <input type="date" value={form.visitdate}
                  onChange={e => setForm(f => ({ ...f, visitdate: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Status</label>
                <select value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Catatan</label>
                <textarea value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  rows={2}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none resize-none"
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
