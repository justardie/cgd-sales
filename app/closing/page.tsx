"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import ConfirmModal from "@/components/ConfirmModal"
import { formatRupiah, getMonthName, MONTHS } from "@/lib/utils"
import { HUNTER_GROUPS } from "@/lib/hunters"
import { Plus, X, Edit2, Trash2, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { User } from "@/types"

interface KonsumenRow {
  id: string
  user_id?: string
  sales_hunter: string
  sales_person: string | null
  name: string
  project: string | null
  unit: string | null
  nilai_hjr: number
  cara_bayar: string | null
  visit_date: string | null
  closing_date: string
  closing_month: number
  closing_year: number
  notes: string | null
  status: string
}

const PROJECT_COLORS: Record<string, string> = {
  "Central Hills": "bg-blue-500/10 text-blue-400",
  "Central Tiban": "bg-cyan-500/10 text-cyan-400",
  "MRD":           "bg-purple-500/10 text-purple-400",
  "SCC":           "bg-green-500/10 text-green-400",
}
function projColor(p: string | null) {
  if (!p) return "bg-slate-500/10 text-slate-400"
  for (const [k, v] of Object.entries(PROJECT_COLORS)) {
    if (p.toLowerCase().includes(k.toLowerCase())) return v
  }
  return "bg-slate-500/10 text-slate-400"
}

interface ClosingFormProps {
  isAdmin: boolean
  form: Record<string, string>
  setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>
  spOptions: string[]
  projects: string[]
  caraBayarOptions: string[]
  saving: boolean
  onCancel: () => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  title: string
  submitLabel: string
}

function ClosingFormFields({
  isAdmin, form, setForm, spOptions, projects, caraBayarOptions, saving, onCancel, onSubmit, title, submitLabel,
}: ClosingFormProps) {
  return (
    <div className="p-5">
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      <form onSubmit={onSubmit} className="space-y-3">
        {isAdmin && (
          <div>
            <label className="text-xs text-slate-500 block mb-1">Hunter</label>
            <select value={form.sales_hunter}
              onChange={e => setForm(f => ({ ...f, sales_hunter: e.target.value, sales_person: "" }))}
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <option value="">— Pilih Hunter —</option>
              {HUNTER_GROUPS.map(g => (
                <option key={g.dbName} value={g.dbName}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs text-slate-500 block mb-1">Sales Person</label>
          {spOptions.length > 0 ? (
            <select value={form.sales_person}
              onChange={e => setForm(f => ({ ...f, sales_person: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <option value="">— Tanpa SP / Hunter Langsung —</option>
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
          <label className="text-xs text-slate-500 block mb-1">Nama Konsumen <span className="text-red-400">*</span></label>
          <input type="text" value={form.name} required
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Proyek</label>
            <select value={form.project}
              onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <option value="">— Pilih —</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Klaster / Unit</label>
            <input type="text" value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Nilai HJR (Rp) <span className="text-red-400">*</span></label>
            <input type="number" value={form.nilai_hjr} required
              onChange={e => setForm(f => ({ ...f, nilai_hjr: e.target.value }))}
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
              {caraBayarOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Tanggal Visit</label>
            <input type="date" value={form.visit_date}
              onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Tanggal Closing <span className="text-red-400">*</span></label>
            <input type="date" value={form.closing_date} required
              onChange={e => setForm(f => ({ ...f, closing_date: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
          </div>
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
          <button type="button" onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            Batal
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition">
            {saving ? "Menyimpan..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-xl relative max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  )
}

const now = new Date()

export default function ClosingPage() {
  const { user, isAdmin } = useAuth()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [ytdMode, setYtdMode] = useState(false)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const [closings, setClosings] = useState<KonsumenRow[]>([])
  const [hunters, setHunters] = useState<User[]>([])
  const [dbProjects, setDbProjects] = useState<string[]>([])
  const [dbCaraBayar, setDbCaraBayar] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [filterHunter,    setFilterHunter]    = useState("")
  const [filterProject,   setFilterProject]   = useState("")
  const [filterCaraBayar, setFilterCaraBayar] = useState("")

  const [showInputModal,  setShowInputModal]  = useState(false)
  const [showEditModal,   setShowEditModal]   = useState(false)
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingClosing,  setEditingClosing]  = useState<KonsumenRow | null>(null)
  const [editingHunter,   setEditingHunter]   = useState<User | null>(null)
  const [newTarget,       setNewTarget]       = useState("")

  const [activeSps, setActiveSps] = useState<Record<string, string[]>>({})

  const [chartOpen,     setChartOpen]    = useState(true)
  const [chartProject,  setChartProject] = useState("")
  const [chartRawData,  setChartRawData] = useState<{ nilai_hjr: number; project: string | null; closing_month: number }[]>([])

  const blankForm = {
    sales_hunter: isAdmin ? "" : (user?.name || ""),
    sales_person: "",
    name: "",
    project: "",
    unit: "",
    nilai_hjr: "",
    cara_bayar: "",
    visit_date: "",
    closing_date: new Date().toISOString().slice(0, 10),
    notes: "",
  }
  const [form, setForm] = useState(blankForm)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user) fetchData() }, [user, month, year, ytdMode])

  useEffect(() => {
    if (!user) return
    const currentMonth = new Date().getMonth() + 1
    supabase
      .from("konsumen")
      .select("nilai_hjr,project,closing_month")
      .eq("status", "closing")
      .eq("closing_year", 2026)
      .lte("closing_month", currentMonth)
      .then(({ data }) => {
        setChartRawData((data || []) as { nilai_hjr: number; project: string | null; closing_month: number }[])
      })
  }, [user])

  async function fetchData() {
    setLoading(true)

    let closingQuery = supabase.from("konsumen")
      .select("id,user_id,sales_hunter,sales_person,name,project,unit,nilai_hjr,cara_bayar,visit_date,closing_date,closing_month,closing_year,notes,status")
      .eq("status", "closing")
      .order("closing_date", { ascending: false })

    if (ytdMode) {
      closingQuery = closingQuery.eq("closing_year", now.getFullYear()).lte("closing_month", now.getMonth() + 1)
    } else {
      closingQuery = closingQuery.eq("closing_month", month).eq("closing_year", year)
    }

    const [closingsRes, usersRes, spsRes, projRes, cbRes] = await Promise.all([
      closingQuery,
      supabase.from("users")
        .select("id,name,monthly_target,role,status")
        .eq("status", "active")
        .eq("role", "hunter"),
      supabase.from("users")
        .select("name,hunter_name")
        .eq("role", "sales_person")
        .neq("status", "resigned"),
      supabase.from("konsumen")
        .select("project")
        .not("project", "is", null),
      supabase.from("konsumen")
        .select("cara_bayar")
        .not("cara_bayar", "is", null),
    ])

    // Extract distinct, sorted project names from DB
    const uniqueProjects = Array.from(
      new Set((projRes.data || []).map((r: { project: string | null }) => r.project).filter(Boolean) as string[])
    ).sort()
    setDbProjects(uniqueProjects)

    // Canonical cara bayar list — always present in this order, extras from DB appended
    const CANONICAL_CARA_BAYAR = ["Cash Keras", "KPR Indent", "KPR UM", "KPR Express", "Cash Bertahap", "SOB"]
    const dbCb = (cbRes.data || []).map((r: { cara_bayar: string | null }) => r.cara_bayar).filter(Boolean) as string[]
    const extraCb = dbCb.filter(v => !CANONICAL_CARA_BAYAR.includes(v))
    setDbCaraBayar([...CANONICAL_CARA_BAYAR, ...Array.from(new Set(extraCb)).sort()])
    setHunters((usersRes.data || []) as User[])
    const allClosings = (closingsRes.data || []) as KonsumenRow[]
    if (isAdmin) {
      setClosings(allClosings)
    } else {
      const name = (user!.name || "").toLowerCase()
      setClosings(allClosings.filter(c =>
        c.user_id === user!.id || (c.sales_hunter || "").toLowerCase() === name
      ))
    }
    const spsMap: Record<string, string[]> = {}
    for (const sp of (spsRes.data || [])) {
      if (!sp.hunter_name) continue
      if (!spsMap[sp.hunter_name]) spsMap[sp.hunter_name] = []
      spsMap[sp.hunter_name].push(sp.name)
    }
    setActiveSps(spsMap)
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nilai_hjr || Number(form.nilai_hjr) <= 0) return
    setSaving(true)
    const d = new Date(form.closing_date)
    await supabase.from("konsumen").insert({
      user_id:       user!.id,
      sales_hunter:  isAdmin ? form.sales_hunter : user!.name,
      sales_person:  form.sales_person || null,
      name:          form.name,
      project:       form.project || null,
      unit:          form.unit || null,
      nilai_hjr:     Number(form.nilai_hjr),
      cara_bayar:    form.cara_bayar || null,
      visit_date:    form.visit_date || null,
      closing_date:  form.closing_date,
      closing_month: d.getMonth() + 1,
      closing_year:  d.getFullYear(),
      notes:         form.notes || null,
      status:        "closing",
    })
    setSaving(false)
    setShowInputModal(false)
    setForm(blankForm)
    fetchData()
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingClosing) return
    setSaving(true)
    const d = new Date(form.closing_date)
    const newHunterName = form.sales_hunter || editingClosing.sales_hunter
    const newHunterUser = hunters.find(h => h.name === newHunterName)
    await supabase.from("konsumen").update({
      user_id:       newHunterUser?.id ?? editingClosing.user_id,
      sales_hunter:  newHunterName,
      sales_person:  form.sales_person || null,
      name:          form.name,
      project:       form.project || null,
      unit:          form.unit || null,
      nilai_hjr:     Number(form.nilai_hjr),
      cara_bayar:    form.cara_bayar || null,
      visit_date:    form.visit_date || null,
      closing_date:  form.closing_date,
      closing_month: d.getMonth() + 1,
      closing_year:  d.getFullYear(),
      notes:         form.notes || null,
    }).eq("id", editingClosing.id)
    setSaving(false)
    setShowEditModal(false)
    setEditingClosing(null)
    fetchData()
  }

  function openEdit(c: KonsumenRow) {
    setEditingClosing(c)
    setForm({
      sales_hunter: c.sales_hunter || "",
      sales_person: c.sales_person || "",
      name:         c.name,
      project:      c.project || "",
      unit:         c.unit || "",
      nilai_hjr:    c.nilai_hjr?.toString() || "",
      cara_bayar:   c.cara_bayar || "",
      visit_date:   c.visit_date || "",
      closing_date: c.closing_date,
      notes:        c.notes || "",
    })
    setShowEditModal(true)
  }

  async function handleDelete(id: string) {
    await supabase.from("konsumen").update({
      status:        "tidak_potensial",
      nilai_hjr:     null,
      closing_date:  null,
      closing_month: null,
      closing_year:  null,
    }).eq("id", id)
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

  const isHunterLogin = !isAdmin && user?.role === "hunter"
  const currentHunterGroup = isHunterLogin
    ? HUNTER_GROUPS.find(g => g.dbName === user?.name || g.name === user?.name)
    : null

  const displayHunters = isAdmin
    ? HUNTER_GROUPS
        .map(g => hunters.find(h => h.name === g.dbName || h.name === g.name))
        .filter((h): h is User => !!h)
    : hunters.filter(h => h.id === user?.id)

  const filtered = closings.filter(c => {
    if (filterHunter    && (c.sales_hunter || "") !== filterHunter) return false
    if (filterProject   && c.project  !== filterProject)  return false
    if (filterCaraBayar && c.cara_bayar !== filterCaraBayar) return false
    return true
  })

  const totalOmset = filtered.reduce((s, c) => s + (c.nilai_hjr || 0), 0)
  const projectOptions = Array.from(new Set(closings.map(c => c.project).filter(Boolean))) as string[]

  const hunterKey = isAdmin ? form.sales_hunter : (user?.name || "")
  const spBase = activeSps[hunterKey] || []
  const hunterGroup = HUNTER_GROUPS.find(g => g.dbName === hunterKey || g.name === hunterKey)
  const spOptions = hunterGroup?.hasAgent ? [...spBase, "Agent"] : spBase

  // Chart derived from raw data — filter applied client-side so project dropdown always works
  const chartCurrentMonth = new Date().getMonth() + 1
  const CHART_MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
  const chartData = Array.from({ length: chartCurrentMonth }, (_, i) => {
    const m = i + 1
    const rows = chartRawData.filter(r => r.closing_month === m && (!chartProject || r.project === chartProject))
    return { month: CHART_MONTH_NAMES[i], total: rows.reduce((s, r) => s + (r.nilai_hjr || 0), 0) }
  })
  const chartProjectOptions = Array.from(new Set(chartRawData.map(r => r.project).filter(Boolean))) as string[]

  return (
    <DashboardShell>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Closing</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {ytdMode ? `Jan–${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}` : `${getMonthName(month)} ${year}`} · {filtered.length} transaksi · {formatRupiah(totalOmset)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} disabled={ytdMode}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <ChevronLeft size={14} />
            </button>
            <div className="text-sm font-semibold text-white min-w-[130px] text-center">
              {ytdMode ? `Jan – ${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}` : `${getMonthName(month)} ${year}`}
            </div>
            <button onClick={nextMonth} disabled={ytdMode}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <ChevronRight size={14} />
            </button>
            <button onClick={() => setYtdMode(m => !m)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                ytdMode ? "text-orange-400" : "text-slate-400 hover:text-white"
              }`}
              style={ytdMode
                ? { background: "rgba(234,92,0,0.15)", border: "1px solid rgba(234,92,0,0.4)" }
                : { background: "var(--surface2)", border: "1px solid var(--border)" }}>
              YTD {now.getFullYear()}
            </button>
            <button onClick={() => { setForm({ ...blankForm, sales_hunter: isAdmin ? "" : (user?.name || "") }); setShowInputModal(true) }}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
              <Plus size={14} /> Input Closing
            </button>
          </div>
        </div>

        {/* Monthly Omset Chart */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px" }}>
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: chartOpen ? "1px solid var(--border)" : "none" }}>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white">Omset Bulanan 2026</span>
              <select
                value={chartProject}
                onChange={e => setChartProject(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg text-slate-300 outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <option value="">Semua Proyek</option>
                {chartProjectOptions.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setChartOpen(o => !o)}
              className="text-slate-400 hover:text-white transition"
              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
              <span>{chartOpen ? "Sembunyikan" : "Tampilkan"}</span>
              <ChevronDown size={14} style={{ transform: chartOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
          </div>
          {chartOpen && (
            <div className="px-4 pt-4 pb-5">
              {chartRawData.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-xs text-slate-600">Memuat data chart...</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v: number) => `Rp ${(v / 1_000_000).toFixed(1)}jt`}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      width={72}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null
                        const val = payload[0]?.value
                        return (
                          <div style={{
                            background: "var(--surface2)",
                            border: "1px solid var(--border)",
                            borderRadius: "10px",
                            padding: "8px 12px",
                          }}>
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "2px" }}>{label}</div>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#FF6A3D" }}>
                              {typeof val === "number" ? formatRupiah(val) : "—"}
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#FF6A3D"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4, fill: "#FF6A3D", stroke: "none" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>

        {/* Hunter Summary Cards */}
        {!loading && (
          <>
            {/* Admin: all hunters grid */}
            {isAdmin && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {displayHunters.map(hunter => {
                  const hunterClosings = closings.filter(c =>
                    (c.sales_hunter || "").toLowerCase() === (hunter.name || "").toLowerCase()
                  )
                  const total = hunterClosings.reduce((s, c) => s + (c.nilai_hjr || 0), 0)
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
                      <div className="text-xs text-slate-600 mt-0.5">Target: {formatRupiah(hunter.monthly_target)}</div>
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

            {/* Hunter login: aggregate card + SP breakdown */}
            {isHunterLogin && (
              <div className="space-y-3">
                {displayHunters.map(hunter => {
                  const total = closings.reduce((s, c) => s + (c.nilai_hjr || 0), 0)
                  const pct   = hunter.monthly_target > 0 ? Math.round((total / hunter.monthly_target) * 100) : 0
                  const bar   = pct >= 100 ? "#22c55e" : pct >= 70 ? "#E84500" : "#ef4444"
                  return (
                    <div key={hunter.id} className="rounded-xl p-4"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="text-xs text-slate-500">Tim {hunter.name}</div>
                          <div className="text-lg font-black text-white">{formatRupiah(total)}</div>
                        </div>
                        <div className={`text-xl font-black ${pct >= 100 ? "text-green-400" : pct >= 70 ? "text-orange-400" : "text-red-400"}`}>
                          {pct}%
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 mb-2">Target: {formatRupiah(hunter.monthly_target)}</div>
                      <div className="h-1.5 rounded-full" style={{ background: "var(--surface2)" }}>
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: bar }} />
                      </div>
                    </div>
                  )
                })}
                {currentHunterGroup && (activeSps[currentHunterGroup.dbName] || []).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(activeSps[currentHunterGroup.dbName] || []).map(spName => {
                      const spOmset = filtered.filter(c => (c.sales_person || "").toLowerCase() === spName.toLowerCase())
                        .reduce((s, c) => s + (c.nilai_hjr || 0), 0)
                      return (
                        <div key={spName} className="rounded-xl p-3"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                          <div className="text-xs text-slate-400 font-medium truncate">{spName}</div>
                          <div className="text-base font-black text-white mt-1">{formatRupiah(spOmset)}</div>
                          <div className="text-xs text-slate-600 mt-0.5">Sales Person</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SP login: show hunter card only */}
            {!isAdmin && !isHunterLogin && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {displayHunters.map(hunter => {
                  const hunterClosings = closings.filter(c =>
                    (c.sales_hunter || "").toLowerCase() === (hunter.name || "").toLowerCase()
                  )
                  const total = hunterClosings.reduce((s, c) => s + (c.nilai_hjr || 0), 0)
                  const pct   = hunter.monthly_target > 0 ? Math.round((total / hunter.monthly_target) * 100) : 0
                  const bar   = pct >= 100 ? "#22c55e" : pct >= 70 ? "#E84500" : "#ef4444"
                  return (
                    <div key={hunter.id} className="rounded-xl p-3"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <div className="text-xs text-slate-400 font-medium truncate">{hunter.name}</div>
                      <div className="text-base font-black text-white mt-1">{formatRupiah(total)}</div>
                      <div className="text-xs text-slate-600 mt-0.5">Target: {formatRupiah(hunter.monthly_target)}</div>
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
          </>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select value={filterHunter} onChange={e => setFilterHunter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-300 outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <option value="">Semua Hunter</option>
            {displayHunters.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
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
            {dbCaraBayar.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {(filterHunter || filterProject || filterCaraBayar) && (
            <button
              onClick={() => { setFilterHunter(""); setFilterProject(""); setFilterCaraBayar("") }}
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
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Hunter</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Sales</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Konsumen</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Project</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Unit</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium whitespace-nowrap">Nilai Omset</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium whitespace-nowrap">Cara Bayar</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium whitespace-nowrap">Closing</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Catatan</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-600 text-xs">Memuat...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-600 text-xs">
                    Belum ada closing {getMonthName(month)} {year}
                  </td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}
                    className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.sales_hunter || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.sales_person || "—"}</td>
                    <td className="px-4 py-3 font-medium text-white text-xs">{c.name}</td>
                    <td className="px-4 py-3">
                      {c.project
                        ? <span className={`text-xs px-2 py-0.5 rounded-full ${projColor(c.project)}`}>{c.project}</span>
                        : <span className="text-xs text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.unit || "—"}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-green-400 whitespace-nowrap">
                      {formatRupiah(c.nilai_hjr || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.cara_bayar
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{c.cara_bayar}</span>
                        : <span className="text-xs text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-400 whitespace-nowrap">{c.closing_date}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {c.notes
                        ? <span className="notes-cell" data-tooltip={c.notes}>{c.notes}</span>
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(c)}
                          className="text-blue-400 hover:text-blue-300 transition" title="Edit">
                          <Edit2 size={13} />
                        </button>
                        {isAdmin && (
                          <button onClick={() => setConfirmDeleteId(c.id)}
                            className="text-slate-600 hover:text-red-400 transition" title="Batalkan Closing">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {!loading && filtered.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border-medium)", background: "var(--surface2)" }}>
                    <td colSpan={5} className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Total · {filtered.length} transaksi
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold whitespace-nowrap" style={{ color: "#22c55e" }}>
                      {formatRupiah(filtered.reduce((s, c) => s + (c.nilai_hjr || 0), 0))}
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {showInputModal && (
        <Modal onClose={() => setShowInputModal(false)}>
          <ClosingFormFields
            isAdmin={isAdmin} form={form} setForm={setForm as any}
            spOptions={spOptions} projects={dbProjects} caraBayarOptions={dbCaraBayar} saving={saving}
            onCancel={() => setShowInputModal(false)}
            onSubmit={handleSave} title="Input Closing" submitLabel="Simpan Closing"
          />
        </Modal>
      )}

      {showEditModal && editingClosing && (
        <Modal onClose={() => { setShowEditModal(false); setEditingClosing(null) }}>
          <ClosingFormFields
            isAdmin={isAdmin} form={form} setForm={setForm as any}
            spOptions={spOptions} projects={dbProjects} caraBayarOptions={dbCaraBayar} saving={saving}
            onCancel={() => { setShowEditModal(false); setEditingClosing(null) }}
            onSubmit={handleEditSave}
            title={`Edit: ${editingClosing.name}`}
            submitLabel="Simpan Perubahan"
          />
        </Modal>
      )}

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
                <button type="button"
                  onClick={() => { setShowTargetModal(false); setEditingHunter(null) }}
                  className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  Batal
                </button>
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
      {confirmDeleteId && (
        <ConfirmModal
          title="Batalkan Closing?"
          message="Data closing akan dihapus dan konsumen dikembalikan ke status 'tidak_potensial'."
          confirmLabel="Hapus"
          onConfirm={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </DashboardShell>
  )
}
