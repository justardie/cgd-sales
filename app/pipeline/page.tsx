"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah } from "@/lib/utils"
import { getSpOptions, HUNTER_GROUPS } from "@/lib/hunters"
import { Plus, X, Search } from "lucide-react"

interface KonsumenRow {
  id: string
  user_id?: string
  sales_hunter: string
  sales_person: string | null
  name: string
  project: string | null
  unit: string | null
  potensi_closing: number
  sumber_leads: string | null
  cara_bayar: string | null
  visit_date: string | null
  status: string
  notes: string | null
  created_at?: string
}

const PROJECTS = [
  "Central Hills",
  "Central Tiban",
  "MRD CRBA+CBA",
  "MRD CLH",
  "MRD CRTU",
  "SCC",
]

const CARA_BAYAR = ["KPR Indent", "KPR UM", "Cash Keras", "Cash Bertahap", "SOB"]

const STATUSES = [
  { value: "warm",            label: "Warm",          color: "bg-yellow-500/20 text-yellow-400" },
  { value: "hot",             label: "Hot",           color: "bg-orange-500/20 text-orange-400" },
  { value: "tidak_potensial", label: "Tdk Potensial", color: "bg-slate-500/20 text-slate-400" },
]

const statusBadge = (s: string) =>
  STATUSES.find(x => x.value === s) || { label: s || "—", color: "bg-slate-500/20 text-slate-400" }

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
  sales_hunter: "",
  sales_person: "",
  name: "",
  project: "",
  unit: "",
  potensi_closing: "",
  sumber_leads: "",
  cara_bayar: "",
  visit_date: "",
  status: "warm",
  notes: "",
}

export default function PipelinePage() {
  const { user, isAdmin } = useAuth()
  const [rows, setRows] = useState<KonsumenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showClosingModal, setShowClosingModal] = useState(false)
  const [editing, setEditing] = useState<KonsumenRow | null>(null)
  const [closingTarget, setClosingTarget] = useState<KonsumenRow | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [saving, setSaving] = useState(false)
  const [savingClosing, setSavingClosing] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [closingForm, setClosingForm] = useState({
    nilai_hjr: "",
    closing_date: new Date().toISOString().slice(0, 10),
  })

  useEffect(() => { if (user) fetchData() }, [user, isAdmin])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from("konsumen")
      .select("*")
      .in("status", ["warm", "hot", "tidak_potensial"])
      .order("created_at", { ascending: false })
    const all = (data || []) as KonsumenRow[]
    if (isAdmin) {
      setRows(all)
    } else {
      const name = (user!.name || "").toLowerCase()
      setRows(all.filter(r => r.user_id === user!.id || (r.sales_hunter || "").toLowerCase() === name))
    }
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ ...emptyForm, sales_hunter: isAdmin ? "" : (user?.name || "") })
    setShowModal(true)
  }

  function openEdit(r: KonsumenRow) {
    setEditing(r)
    setForm({
      sales_hunter:    r.sales_hunter || "",
      sales_person:    r.sales_person || "",
      name:            r.name || "",
      project:         r.project || "",
      unit:            r.unit || "",
      potensi_closing: r.potensi_closing?.toString() || "",
      sumber_leads:    r.sumber_leads || "",
      cara_bayar:      r.cara_bayar || "",
      visit_date:      r.visit_date || "",
      status:          r.status || "warm",
      notes:           r.notes || "",
    })
    setShowModal(true)
  }

  function openClosingConfirm(r: KonsumenRow) {
    setClosingTarget(r)
    setClosingForm({
      nilai_hjr: r.potensi_closing?.toString() || "",
      closing_date: new Date().toISOString().slice(0, 10),
    })
    setShowClosingModal(true)
  }

  async function handleClosingConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!closingTarget || !closingForm.nilai_hjr || Number(closingForm.nilai_hjr) <= 0) return
    setSavingClosing(true)
    const d = new Date(closingForm.closing_date)
    await supabase.from("konsumen").update({
      status:        "closing",
      nilai_hjr:     Number(closingForm.nilai_hjr),
      closing_date:  closingForm.closing_date,
      closing_month: d.getMonth() + 1,
      closing_year:  d.getFullYear(),
    }).eq("id", closingTarget.id)
    setSavingClosing(false)
    setShowClosingModal(false)
    setClosingTarget(null)
    fetchData()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name:            form.name,
      sales_hunter:    isAdmin ? form.sales_hunter : user!.name,
      sales_person:    form.sales_person || null,
      project:         form.project || null,
      unit:            form.unit || null,
      potensi_closing: form.potensi_closing ? Number(form.potensi_closing) : null,
      sumber_leads:    form.sumber_leads || null,
      cara_bayar:      form.cara_bayar || null,
      visit_date:      form.visit_date || null,
      status:          form.status,
      notes:           form.notes || null,
      user_id:         user!.id,
    }
    if (editing) {
      await supabase.from("konsumen").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("konsumen").insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  const filtered = rows.filter(r => {
    const matchSearch = !search ||
      (r.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.project || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.sales_hunter || "").toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || r.status === filterStatus
    return matchSearch && matchStatus
  })

  const stats = {
    total:      rows.length,
    hot:        rows.filter(r => r.status === "hot").length,
    totalValue: rows.filter(r => r.status !== "tidak_potensial")
                    .reduce((s, r) => s + (Number(r.potensi_closing) || 0), 0),
  }

  const spOptions = isAdmin
    ? getSpOptions(form.sales_hunter)
    : getSpOptions(user?.name || "")

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Pipeline</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {stats.total} prospek · {stats.hot} hot · {formatRupiah(stats.totalValue)}
            </p>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
            <Plus size={14} /> Tambah Pipeline
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Prospek", val: stats.total,               color: "text-blue-400" },
            { label: "Hot",           val: stats.hot,                  color: "text-orange-400" },
            { label: "Est. Nilai",    val: formatRupiah(stats.totalValue), color: "text-green-400" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs text-slate-500 mb-1">{s.label}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
            </div>
          ))}
        </div>

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

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Hunter</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Sales</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Konsumen</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Project</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Unit</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium whitespace-nowrap">Nilai Potensi</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium whitespace-nowrap">Cara Bayar</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium whitespace-nowrap">Visit</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Catatan</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-600 text-xs">Tidak ada data</td></tr>
                ) : filtered.slice(0, 100).map(r => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}
                    className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{r.sales_hunter || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{r.sales_person || "—"}</td>
                    <td className="px-4 py-3 font-medium text-white text-xs">{r.name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{r.project || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{r.unit || "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-300 text-xs whitespace-nowrap">
                      {r.potensi_closing ? formatRupiah(Number(r.potensi_closing)) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400 whitespace-nowrap">
                      {r.cara_bayar || "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 text-xs whitespace-nowrap">
                      {r.visit_date || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">
                      {r.notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openEdit(r)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition">
                          Edit
                        </button>
                        <button onClick={() => openClosingConfirm(r)}
                          className="text-xs text-green-400 hover:text-green-300 transition whitespace-nowrap">
                          Closing
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Closing Confirmation Modal */}
      {showClosingModal && closingTarget && (
        <Modal onClose={() => setShowClosingModal(false)}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-semibold">
                Closing!
              </span>
              <h3 className="text-sm font-semibold text-white">Konfirmasi Closing</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              <span className="text-white font-medium">{closingTarget.name}</span>
              {closingTarget.project ? ` · ${closingTarget.project}` : ""}
            </p>
            <form onSubmit={handleClosingConfirm} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  Nilai HJR (Rp) <span className="text-red-400">*</span>
                </label>
                <input type="number" value={closingForm.nilai_hjr} required
                  onChange={e => setClosingForm(f => ({ ...f, nilai_hjr: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  Tanggal Closing <span className="text-red-400">*</span>
                </label>
                <input type="date" value={closingForm.closing_date} required
                  onChange={e => setClosingForm(f => ({ ...f, closing_date: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
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

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              {editing ? "Edit Pipeline" : "Tambah Pipeline"}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Hunter</label>
                {isAdmin ? (
                  <select value={form.sales_hunter}
                    onChange={e => setForm(f => ({ ...f, sales_hunter: e.target.value, sales_person: "" }))}
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
              <div>
                <label className="text-xs text-slate-500 block mb-1">Sales Person</label>
                {spOptions.length > 0 ? (
                  <select value={form.sales_person}
                    onChange={e => setForm(f => ({ ...f, sales_person: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Tanpa SP —</option>
                    {spOptions.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                  </select>
                ) : (
                  <input type="text" value={form.sales_person}
                    onChange={e => setForm(f => ({ ...f, sales_person: e.target.value }))}
                    placeholder="Nama sales person (opsional)"
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  Nama Konsumen <span className="text-red-400">*</span>
                </label>
                <input type="text" value={form.name} required
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Proyek</label>
                <select value={form.project}
                  onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <option value="">— Pilih Proyek —</option>
                  {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Klaster / Unit</label>
                <input type="text" value={form.unit}
                  onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="Contoh: Kavling 8A, Type 45"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Potensi Closing (Rp)</label>
                <input type="number" value={form.potensi_closing}
                  onChange={e => setForm(f => ({ ...f, potensi_closing: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Sumber Leads</label>
                <input type="text" value={form.sumber_leads}
                  onChange={e => setForm(f => ({ ...f, sumber_leads: e.target.value }))}
                  placeholder="Contoh: Referral, Digital, Walk-in"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Cara Bayar</label>
                <select value={form.cara_bayar}
                  onChange={e => setForm(f => ({ ...f, cara_bayar: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <option value="">— Pilih —</option>
                  {CARA_BAYAR.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Tanggal Visit</label>
                <input type="date" value={form.visit_date}
                  onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Status</label>
                <select value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Catatan</label>
                <textarea value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
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
