"use client"
import { useCallback, useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import ConfirmModal from "@/components/ConfirmModal"
import SalesFilterBar from "@/components/SalesFilterBar"
import ClosingReportTemplate, { type ClosingReportRow } from "@/components/ClosingReportTemplate"
import { formatRupiah, getMonthName, normalizeProject, CANONICAL_CARA_BAYAR, TEAM_MONTHLY_TARGET, PROJECT_NAMES } from "@/lib/utils"
import { formatSalesPerson } from "@/lib/sales-dashboard-rules"
import { canonicalProjectTotals, periodTarget } from "@/lib/dashboard-rules"
import { HUNTER_GROUPS, buildSpOptions } from "@/lib/hunters"
import { Plus, X, Edit2, Calendar, AlertTriangle, FileDown } from "lucide-react"
import type { User } from "@/types"

interface KonsumenRow {
  id: string
  user_id?: string
  sales_hunter: string
  sales_person: string | null
  agent_name: string | null
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
  "CH":               "bg-blue-500/10 text-blue-400",
  "CT":               "bg-cyan-500/10 text-cyan-400",
  "MRD CRBA+CBA":    "bg-purple-500/10 text-purple-400",
  "CRT":              "bg-indigo-500/10 text-indigo-400",
  "MRD CRTU":        "bg-violet-500/10 text-violet-400",
  "MRD CLH":         "bg-fuchsia-500/10 text-fuchsia-400",
  "SCC - Hillside":   "bg-green-500/10 text-green-400",
  "SCC - Valleyside": "bg-emerald-500/10 text-emerald-400",
}
function projColor(p: string | null) {
  if (!p) return "bg-slate-500/10 text-slate-400"
  return PROJECT_COLORS[p] ?? "bg-slate-500/10 text-slate-400"
}

interface ClosingFormState {
  sales_hunter: string
  sales_person: string
  agent_name: string
  name: string
  project: string
  unit: string
  nilai_hjr: string
  cara_bayar: string
  visit_date: string
  closing_date: string
  notes: string
}

interface ClosingFormProps {
  isAdmin: boolean
  form: ClosingFormState
  setForm: React.Dispatch<React.SetStateAction<ClosingFormState>>
  spOptions: string[]
  hunterOptions: User[]
  projects: string[]
  caraBayarOptions: string[]
  saving: boolean
  onCancel: () => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  title: string
  submitLabel: string
  formError: string
  onCancelClosing?: () => void
}

function fmtRp(raw: string): string {
  if (!raw) return ""
  const n = Number(raw.replace(/\D/g, ""))
  return isNaN(n) ? "" : n.toLocaleString("id-ID")
}
function parseRp(val: string): string { return val.replace(/\D/g, "") }

/** Rupiah input: shows raw digits while focused (no cursor jump), formatted on blur */
function RupiahInput({ value, onChange, placeholder, required, className, style }: {
  value: string; onChange: (raw: string) => void
  placeholder?: string; required?: boolean
  className?: string; style?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="text"
      inputMode="numeric"
      value={focused ? value : fmtRp(value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={e => onChange(parseRp(e.target.value))}
      placeholder={placeholder}
      required={required}
      className={className}
      style={style}
    />
  )
}

function ClosingFormFields({
  isAdmin, form, setForm, spOptions, hunterOptions, projects, caraBayarOptions, saving, onCancel, onSubmit, title, submitLabel, formError, onCancelClosing,
}: ClosingFormProps) {
  return (
    <div className="p-5">
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      <form onSubmit={onSubmit} className="space-y-3">
        {formError && (
          <div className="px-3 py-2.5 rounded-lg text-xs font-medium text-red-400" style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)" }}>
            {formError}
          </div>
        )}
        {isAdmin && (
          <div>
            <label className="text-xs text-slate-500 block mb-1">Hunter</label>
            <select value={form.sales_hunter}
              onChange={e => setForm(f => ({ ...f, sales_hunter: e.target.value, sales_person: "", agent_name: "" }))}
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <option value="">— Pilih Hunter —</option>
              {hunterOptions.map(hunter => (
                <option key={hunter.id} value={hunter.name}>{hunter.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs text-slate-500 block mb-1">Sales Person</label>
          {spOptions.length > 0 ? (
            <select value={form.sales_person}
              onChange={e => setForm(f => ({ ...f, sales_person: e.target.value, agent_name: e.target.value === "Agent" ? f.agent_name : "" }))}
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <option value="">— Tanpa SP / Hunter Langsung —</option>
              {spOptions.map(sp => <option key={sp} value={sp}>{sp}</option>)}
            </select>
          ) : (
            <input type="text" value={form.sales_person}
              onChange={e => setForm(f => ({ ...f, sales_person: e.target.value, agent_name: e.target.value === "Agent" ? f.agent_name : "" }))}
              placeholder="Nama sales person (opsional)"
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
          )}
        </div>
        {form.sales_person === "Agent" && (
          <div>
            <label className="text-xs text-slate-500 block mb-1">Nama Agent <span className="text-red-400">*</span></label>
            <input required value={form.agent_name}
              onChange={e => setForm(f => ({ ...f, agent_name: e.target.value }))}
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
          </div>
        )}
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
            <RupiahInput
              value={form.nilai_hjr}
              onChange={raw => setForm(f => ({ ...f, nilai_hjr: raw }))}
              placeholder="Contoh: 500.000.000"
              className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            />
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
          <div style={{ overflow: "hidden", minWidth: 0 }}>
            <label className="text-xs text-slate-500 block mb-1">Tanggal Visit</label>
            <input type="date" value={form.visit_date}
              onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
              className="w-full min-w-0 text-sm px-3 py-2 rounded-lg text-white outline-none appearance-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", colorScheme: "dark", boxSizing: "border-box", WebkitAppearance: "none", display: "block" }} />
          </div>
          <div style={{ overflow: "hidden", minWidth: 0 }}>
            <label className="text-xs text-slate-500 block mb-1">Tanggal Closing <span className="text-red-400">*</span></label>
            <input type="date" value={form.closing_date} required
              onChange={e => setForm(f => ({ ...f, closing_date: e.target.value }))}
              className="w-full min-w-0 text-sm px-3 py-2 rounded-lg text-white outline-none appearance-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", colorScheme: "dark", boxSizing: "border-box", WebkitAppearance: "none", display: "block" }} />
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
          {onCancelClosing && (
            <button type="button" onClick={onCancelClosing} disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-red-400 hover:text-red-300 transition"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.35)" }}>
              Batal Closing
            </button>
          )}
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

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: "asc"|"desc" }) {
  if (sortCol !== col) return <span className="ml-0.5 opacity-25" style={{ fontSize: 9 }}>↕</span>
  return <span className="ml-0.5" style={{ fontSize: 9, color: "var(--accent)" }}>{sortDir === "asc" ? "↑" : "↓"}</span>
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
  const isTf = user?.role === "task_force"
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [dateMode, setDateMode] = useState<"month" | "ytd" | "custom">("month")
  const [customFrom, setCustomFrom] = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const [customTo,   setCustomTo]   = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const ytdMode = dateMode === "ytd"

  const [closings, setClosings] = useState<KonsumenRow[]>([])
  const [currentMonthClosings, setCurrentMonthClosings] = useState<KonsumenRow[]>([])
  const [periodClosings, setPeriodClosings] = useState<KonsumenRow[]>([])
  const [hunters, setHunters] = useState<User[]>([])
  const [dbProjects, setDbProjects] = useState<string[]>([])
  const [dbCaraBayar, setDbCaraBayar] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)

  const [filterHunter,    setFilterHunter]    = useState("")
  const [filterProject,   setFilterProject]   = useState("")
  const [filterCaraBayar, setFilterCaraBayar] = useState("")
  const [search, setSearch] = useState("")

  const [showInputModal,  setShowInputModal]  = useState(false)
  const [showEditModal,   setShowEditModal]   = useState(false)
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [showCancelClosingConfirm, setShowCancelClosingConfirm] = useState(false)
  const [formError, setFormError] = useState("")
  const [editingClosing,  setEditingClosing]  = useState<KonsumenRow | null>(null)
  const [editingHunter,   setEditingHunter]   = useState<User | null>(null)
  const [newTarget,       setNewTarget]       = useState("")

  const [activeSps, setActiveSps] = useState<Record<string, string[]>>({})

  const [sortCol, setSortCol] = useState("")
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc")

  const blankForm = {
    sales_hunter: isAdmin ? "" : (user?.name || ""),
    sales_person: "",
    agent_name: "",
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

  const fetchData = useCallback(async () => {
    let closingQuery = supabase.from("konsumen")
      .select("id,user_id,sales_hunter,sales_person,agent_name,name,project,unit,nilai_hjr,cara_bayar,visit_date,closing_date,closing_month,closing_year,notes,status")
      .eq("status", "closing")
      .order("closing_date", { ascending: false })

    const fromKey = customFrom.year * 12 + customFrom.month
    const toKey = customTo.year * 12 + customTo.month
    const customMinYear = Math.min(customFrom.year, customTo.year)
    const customMaxYear = Math.max(customFrom.year, customTo.year)

    if (ytdMode) {
      closingQuery = closingQuery.eq("closing_year", now.getFullYear()).lte("closing_month", now.getMonth() + 1)
    } else if (dateMode === "custom") {
      closingQuery = closingQuery.gte("closing_year", customMinYear).lte("closing_year", customMaxYear)
    } else {
      closingQuery = closingQuery.eq("closing_month", month).eq("closing_year", year)
    }

    const [closingsRes, currentMonthRes, usersRes, spsRes, projRes, cbRes] = await Promise.all([
      closingQuery,
      supabase.from("konsumen")
        .select("id,user_id,sales_hunter,sales_person,agent_name,name,project,unit,nilai_hjr,cara_bayar,visit_date,closing_date,closing_month,closing_year,notes,status")
        .eq("status", "closing")
        .eq("closing_month", now.getMonth() + 1)
        .eq("closing_year", now.getFullYear()),
      supabase.from("users")
        .select("id,name,monthly_target,win_or_die_target,role,status")
        .eq("role", "hunter")
        .eq("status", "active"),
      supabase.from("users")
        .select("name,hunter_name")
        .in("role", ["sales_person", "telemarketing"]),
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

    // Canonical cara bayar list from utils — always present in this order, extras from DB appended
    const dbCb = (cbRes.data || []).map((r: { cara_bayar: string | null }) => r.cara_bayar).filter(Boolean) as string[]
    const extraCb = dbCb.filter(v => !(CANONICAL_CARA_BAYAR as readonly string[]).includes(v))
    setDbCaraBayar([...CANONICAL_CARA_BAYAR, ...Array.from(new Set(extraCb)).sort()])
    setHunters((usersRes.data || []) as User[])
    setCurrentMonthClosings((currentMonthRes.data || []) as KonsumenRow[])
    let allClosings = (closingsRes.data || []) as KonsumenRow[]
    if (dateMode === "custom") {
      const minKey = Math.min(fromKey, toKey)
      const maxKey = Math.max(fromKey, toKey)
      allClosings = allClosings.filter(c => {
        const key = (c.closing_year || 0) * 12 + (c.closing_month || 0)
        return key >= minKey && key <= maxKey
      })
    }
    setPeriodClosings(allClosings)
    if (isAdmin || isTf) {
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
  }, [isAdmin, isTf, month, user, year, ytdMode, dateMode, customFrom, customTo])

  useEffect(() => { if (user) queueMicrotask(() => void fetchData()) }, [fetchData, user])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (form.sales_person === "Agent" && !form.agent_name.trim()) {
      setFormError("Nama Agent wajib diisi")
      return
    }
    if (!form.nilai_hjr || Number(form.nilai_hjr) <= 0) return
    setFormError("")
    setSaving(true)
    const d = new Date(form.closing_date)
    await supabase.from("konsumen").insert({
      user_id:       user!.id,
      sales_hunter:  isAdmin ? form.sales_hunter : user!.name,
      sales_person:  form.sales_person || null,
      agent_name:    form.sales_person === "Agent" ? form.agent_name.trim() : null,
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
    if (form.sales_person === "Agent" && !form.agent_name.trim()) {
      setFormError("Nama Agent wajib diisi")
      return
    }
    setFormError("")
    setSaving(true)
    const d = new Date(form.closing_date)
    const newHunterName = form.sales_hunter || editingClosing.sales_hunter
    const newHunterUser = hunters.find(h => h.name === newHunterName)
    await supabase.from("konsumen").update({
      user_id:       newHunterUser?.id ?? editingClosing.user_id,
      sales_hunter:  newHunterName,
      sales_person:  form.sales_person || null,
      agent_name:    form.sales_person === "Agent" ? form.agent_name.trim() : null,
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
    setFormError("")
    setForm({
      sales_hunter: c.sales_hunter || "",
      sales_person: c.sales_person || "",
      agent_name:   c.agent_name || "",
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

  async function handleCancelClosing() {
    if (!editingClosing) return
    setSaving(true)
    const { error } = await supabase.from("konsumen").update({
      status:        "hot",
      nilai_hjr:     null,
      closing_date:  null,
      closing_month: null,
      closing_year:  null,
    }).eq("id", editingClosing.id)
    setSaving(false)
    if (error) {
      setShowCancelClosingConfirm(false)
      setFormError(`Gagal membatalkan closing: ${error.message}`)
      return
    }
    setShowCancelClosingConfirm(false)
    setShowEditModal(false)
    setEditingClosing(null)
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

  const displayHunters = isAdmin || isTf
    ? hunters
    : hunters.filter(h => h.id === user?.id)

  const filtered = closings.filter(c => {
    const query = search.trim().toLowerCase()
    if (query && ![
      c.name,
      c.sales_hunter,
      c.sales_person,
      c.agent_name,
      c.project,
      c.unit,
    ].some(value => (value || "").toLowerCase().includes(query))) return false
    if (filterHunter    && (c.sales_hunter || "") !== filterHunter) return false
    if (filterProject   && normalizeProject(c.project)  !== filterProject)  return false
    if (filterCaraBayar && c.cara_bayar !== filterCaraBayar) return false
    return true
  })

  function toggleSort(col: string) {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortCol(col)
      setSortDir("asc")
    }
  }

  const displayed = [...filtered].sort((a, b) => {
    if (!sortCol) return 0
    let av: string | number = "", bv: string | number = ""
    if      (sortCol === "hunter")    { av = a.sales_hunter || ""; bv = b.sales_hunter || "" }
    else if (sortCol === "konsumen")  { av = a.name || ""; bv = b.name || "" }
    else if (sortCol === "project")   { av = a.project || ""; bv = b.project || "" }
    else if (sortCol === "nilai")     { av = a.nilai_hjr || 0; bv = b.nilai_hjr || 0 }
    else if (sortCol === "cara_bayar"){ av = a.cara_bayar || ""; bv = b.cara_bayar || "" }
    else if (sortCol === "closing")   { av = a.closing_date || ""; bv = b.closing_date || "" }
    if (typeof av === "number") return sortDir === "asc" ? av - (bv as number) : (bv as number) - av
    return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
  })

  const totalOmset = filtered.reduce((s, c) => s + (c.nilai_hjr || 0), 0)
  const projectOptions = Array.from(new Set(closings.map(c => normalizeProject(c.project)).filter(Boolean))) as string[]

  async function handleReportClosing() {
    if (filtered.length === 0) {
      alert("Tidak ada data closing pada filter saat ini.")
      return
    }
    setReportBusy(true)
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ])

      // Reflects whatever period is selected on the page (Bulan / YTD / Custom),
      // across all hunters — same source the table's transactions come from,
      // just before the ad-hoc search/hunter/project filters are applied.
      const monthsElapsed = now.getMonth() + 1
      const periodTargetTeam = periodTarget(TEAM_MONTHLY_TARGET, monthsElapsed, ytdMode)
      const periodValue = periodClosings.reduce((s, c) => s + (c.nilai_hjr || 0), 0)

      const hunterOmsetPeriod: Record<string, number> = {}
      for (const c of periodClosings) {
        if (c.sales_hunter) hunterOmsetPeriod[c.sales_hunter] = (hunterOmsetPeriod[c.sales_hunter] || 0) + (c.nilai_hjr || 0)
      }
      let topHunter: { name: string; omset: number; pct: number } | null = null
      for (const hunter of hunters) {
        const omset = hunterOmsetPeriod[hunter.name] || 0
        const hunterTarget = periodTarget(hunter.monthly_target, monthsElapsed, ytdMode)
        if (omset > 0 && (!topHunter || omset > topHunter.omset)) {
          topHunter = { name: hunter.name, omset, pct: hunterTarget > 0 ? Math.round((omset / hunterTarget) * 100) : 0 }
        }
      }

      const spOmsetPeriod: Record<string, number> = {}
      for (const c of periodClosings) {
        if (c.sales_person) spOmsetPeriod[c.sales_person] = (spOmsetPeriod[c.sales_person] || 0) + (c.nilai_hjr || 0)
      }
      let topSales: { name: string; omset: number } | null = null
      for (const [name, omset] of Object.entries(spOmsetPeriod)) {
        if (!topSales || omset > topSales.omset) topSales = { name, omset }
      }

      const allHunters = hunters
        .filter(hunter => hunter.monthly_target > 0)
        .map(hunter => ({ name: hunter.name, omset: hunterOmsetPeriod[hunter.name] || 0, target: periodTarget(hunter.monthly_target, monthsElapsed, ytdMode) }))
        .sort((a, b) => a.omset / a.target - b.omset / b.target)

      const projMap: Record<string, number> = {}
      for (const c of periodClosings) {
        const proj = normalizeProject(c.project)
        if (proj) projMap[proj] = (projMap[proj] || 0) + (c.nilai_hjr || 0)
      }
      const projectData = canonicalProjectTotals(projMap, PROJECT_NAMES).filter(project => project.value > 0)

      const rows: ClosingReportRow[] = filtered.map(c => ({
        hunter: c.sales_hunter,
        salesPerson: formatSalesPerson(c.sales_person, c.agent_name),
        konsumen: c.name,
        project: c.project || "",
        unit: c.unit || "",
        nilaiOmset: c.nilai_hjr || 0,
        caraBayar: c.cara_bayar || "",
        closingDate: c.closing_date,
      }))

      const periodLabel = ytdMode
        ? `Jan–${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}`
        : dateMode === "custom"
        ? `${getMonthName(customFrom.month)} ${customFrom.year} – ${getMonthName(customTo.month)} ${customTo.year}`
        : `${getMonthName(month)} ${year}`

      const generatedAt = new Date().toLocaleString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })

      const container = document.createElement("div")
      container.style.position = "fixed"
      container.style.left = "-99999px"
      container.style.top = "0"
      document.body.appendChild(container)
      const root = createRoot(container)
      root.render(
        <ClosingReportTemplate
          periodLabel={periodLabel}
          generatedAt={generatedAt}
          isYtd={ytdMode}
          mtdValue={periodValue}
          mtdTarget={periodTargetTeam}
          topHunter={topHunter}
          topSales={topSales}
          allHunters={allHunters}
          projectData={projectData}
          rows={rows}
          totalOmset={totalOmset}
          totalCount={filtered.length}
        />
      )

      await new Promise(resolve => setTimeout(resolve, 150))

      const target = container.firstElementChild as HTMLElement
      const targetRect = target.getBoundingClientRect()
      const canvas = await html2canvas(target, { scale: 2, backgroundColor: "#ffffff" })

      // Size the PDF page to exactly fit the rendered report (fixed width, height
      // follows content) so nothing gets clipped — this always stays a single page.
      // orientation must match width vs height, or jsPDF silently swaps the
      // format array's dimensions to satisfy its default "portrait" assumption,
      // which then clips whatever addImage draws using the un-swapped width.
      const pageWidthMm = 280
      const pageHeightMm = pageWidthMm * (targetRect.height / targetRect.width)
      const orientation = pageWidthMm >= pageHeightMm ? "landscape" : "portrait"
      const pdf = new jsPDF({ unit: "mm", format: [pageWidthMm, pageHeightMm], orientation })
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageWidthMm, pageHeightMm)
      pdf.save(`Report Closing - ${new Date().toISOString().slice(0, 10)}.pdf`)

      root.unmount()
      container.remove()
    } finally {
      setReportBusy(false)
    }
  }

  const hunterKey = isAdmin ? form.sales_hunter : (user?.name || "")
  const spBase = activeSps[hunterKey] || []
  const hunterGroup = HUNTER_GROUPS.find(g => g.dbName === hunterKey || g.name === hunterKey)
  const spOptions = buildSpOptions(hunterGroup, spBase)

  const winOrDieHunters = displayHunters
    .filter(hunter => hunter.win_or_die_target > 0)
    .map(hunter => ({
      ...hunter,
      omset: currentMonthClosings
        .filter(closing => closing.sales_hunter.toLowerCase() === hunter.name.toLowerCase())
        .reduce((sum, closing) => sum + (closing.nilai_hjr || 0), 0),
    }))
    .sort((a, b) => a.omset / a.win_or_die_target - b.omset / b.win_or_die_target)

  return (
    <DashboardShell>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Closing</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {ytdMode
                ? `Jan–${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}`
                : dateMode === "custom"
                ? `${getMonthName(customFrom.month)} ${customFrom.year} – ${getMonthName(customTo.month)} ${customTo.year}`
                : `${getMonthName(month)} ${year}`} · {filtered.length} transaksi · {formatRupiah(totalOmset)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode buttons */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {(["month","ytd","custom"] as const).map(mode => (
                <button key={mode} onClick={() => setDateMode(mode)}
                  className="px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    background: dateMode === mode ? "var(--accent)" : "var(--surface2)",
                    color: dateMode === mode ? "#fff" : "var(--text-muted)",
                    borderRight: mode !== "custom" ? "1px solid var(--border)" : undefined,
                  }}>
                  {mode === "month" ? "Bulan" : mode === "ytd" ? `YTD ${now.getFullYear()}` : "Custom"}
                </button>
              ))}
            </div>

            {dateMode === "month" && (
              <div className="flex items-center gap-1.5">
                <select value={month} onChange={e => setMonth(Number(e.target.value))}
                  className="text-xs px-2 py-1.5 rounded-lg font-semibold"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i+1} value={i+1}>{getMonthName(i+1)}</option>
                  ))}
                </select>
                <input type="number" value={year} min={2020} max={2030}
                  onChange={e => setYear(Number(e.target.value))}
                  className="text-xs px-2 py-1.5 rounded-lg font-semibold w-16"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
            )}

            {dateMode === "custom" && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar size={12} style={{ color: "var(--text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Dari:</span>
                  <select value={customFrom.month} onChange={e => setCustomFrom(p => ({ ...p, month: Number(e.target.value) }))}
                    className="text-xs px-1.5 py-1 rounded-lg"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{getMonthName(i+1)}</option>)}
                  </select>
                  <input type="number" value={customFrom.year} min={2020} max={2030}
                    onChange={e => setCustomFrom(p => ({ ...p, year: Number(e.target.value) }))}
                    className="text-xs px-1.5 py-1 rounded-lg w-14"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>–</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Sampai:</span>
                  <select value={customTo.month} onChange={e => setCustomTo(p => ({ ...p, month: Number(e.target.value) }))}
                    className="text-xs px-1.5 py-1 rounded-lg"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                    {Array.from({ length: 12 }, (_, i) => <option key={i+1} value={i+1}>{getMonthName(i+1)}</option>)}
                  </select>
                  <input type="number" value={customTo.year} min={2020} max={2030}
                    onChange={e => setCustomTo(p => ({ ...p, year: Number(e.target.value) }))}
                    className="text-xs px-1.5 py-1 rounded-lg w-14"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
              </div>
            )}

            {!isTf && (
              <button onClick={() => { setFormError(""); setForm({ ...blankForm, sales_hunter: isAdmin ? "" : (user?.name || "") }); setShowInputModal(true) }}
                className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
                <Plus size={14} /> Input Closing
              </button>
            )}
          </div>
        </div>

        {winOrDieHunters.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(239,68,68,0.35)" }}>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.14)" }}>
                  <AlertTriangle size={15} className="text-red-400" />
                </div>
                <div>
                  <div className="text-sm font-black tracking-wide text-red-400">WIN-OR-DIE ALERT</div>
                  <div className="text-xs text-slate-500">{getMonthName(now.getMonth() + 1)} {now.getFullYear()} · perhitungan bulan berjalan</div>
                </div>
              </div>
              <div className="text-3xl font-black text-red-400/60">{winOrDieHunters.filter(hunter => hunter.omset < hunter.win_or_die_target).length}</div>
            </div>
            <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {winOrDieHunters.map(hunter => {
                const progress = Math.min(100, Math.round((hunter.omset / hunter.win_or_die_target) * 100))
                const achieved = progress >= 100
                return (
                  <div key={hunter.id} className="rounded-xl p-3" style={{ background: "var(--surface2)", border: `1px solid ${achieved ? "rgba(34,197,94,.28)" : "rgba(239,68,68,.25)"}` }}>
                    <div className="text-xs text-slate-400">{hunter.name}</div>
                    <div className="text-base font-black text-white mt-1">{formatRupiah(hunter.omset)}</div>
                    <div className="text-xs text-slate-600 mt-0.5">Target: {formatRupiah(hunter.win_or_die_target)}</div>
                    <div className="h-1 rounded-full overflow-hidden mt-2" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: `${progress}%`, background: achieved ? "#22c55e" : "#ef4444" }} />
                    </div>
                    <div className={`text-xs font-bold mt-1 ${achieved ? "text-green-400" : "text-red-400"}`}>{progress}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Hunter Summary Cards */}
        {!loading && (
          <>
            {/* Admin: all hunters grid */}
            {isAdmin && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {displayHunters.map(hunter => {
                  const hunterClosings = filtered.filter(c =>
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
                  const total = closings
                    .filter(c => c.sales_hunter === hunter.name)
                    .reduce((s, c) => s + (c.nilai_hjr || 0), 0)
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
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex-1">
            <SalesFilterBar
              search={search}
              onSearchChange={setSearch}
              hunter={filterHunter}
              onHunterChange={setFilterHunter}
              hunterOptions={displayHunters.map(h => ({ value: h.name, label: h.name }))}
              project={filterProject}
              onProjectChange={setFilterProject}
              projectOptions={projectOptions.map(project => ({ value: project, label: project }))}
              caraBayar={filterCaraBayar}
              onCaraBayarChange={setFilterCaraBayar}
              caraBayarOptions={dbCaraBayar.map(option => ({ value: option, label: option }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{filtered.length} hasil</span>
            <button type="button" onClick={handleReportClosing} disabled={reportBusy}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-blue-300 hover:text-white transition disabled:opacity-50"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <FileDown size={14} /> {reportBusy ? "Membuat PDF..." : "Report Closing (PDF)"}
            </button>
          </div>
          {(search || filterHunter || filterProject || filterCaraBayar) && (
            <button
              onClick={() => { setSearch(""); setFilterHunter(""); setFilterProject(""); setFilterCaraBayar("") }}
              className="text-xs px-3 py-2 rounded-lg text-slate-400 hover:text-white transition"
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
                  {([
                    { key: "hunter",    label: "Hunter / Sales", align: "left", sortable: true  },
                    { key: "konsumen",  label: "Konsumen",    align: "left",   sortable: true  },
                    { key: "project",   label: "Project / Unit", align: "left", sortable: true  },
                    { key: "nilai",     label: "Nilai Omset", align: "right",  sortable: true  },
                    { key: "cara_bayar",label: "Cara Bayar",  align: "center", sortable: true  },
                    { key: "closing",   label: "Closing",     align: "center", sortable: true  },
                    { key: "catatan",   label: "Catatan",     align: "left",   sortable: false },
                    { key: "aksi",      label: "Aksi",        align: "center", sortable: false },
                  ] as { key: string; label: string; align: string; sortable: boolean }[]).map(col => (
                    <th key={col.key}
                      className={`px-4 py-3 text-xs font-medium whitespace-nowrap text-${col.align} ${col.sortable ? "cursor-pointer select-none hover:opacity-80" : ""}`}
                      style={{ color: sortCol === col.key ? "var(--text-primary)" : "var(--text-muted)" }}
                      onClick={col.sortable ? () => toggleSort(col.key) : undefined}>
                      <span className={`inline-flex items-center ${col.align === "right" ? "justify-end w-full" : col.align === "center" ? "justify-center w-full" : ""}`}>
                        {col.label}
                        {col.sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-600 text-xs">Memuat...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-600 text-xs">
                    {ytdMode ? `Belum ada closing YTD ${year}` : `Belum ada closing ${getMonthName(month)} ${year}`}
                  </td></tr>
                ) : displayed.map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}
                    className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <div className="text-slate-300">{c.sales_hunter || "—"}</div>
                      <div className="text-slate-500 mt-0.5">{formatSalesPerson(c.sales_person, c.agent_name)}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-white text-xs">{c.name}</td>
                    <td className="px-4 py-3">
                      {c.project
                        ? <span className={`text-xs px-2 py-0.5 rounded-full ${projColor(normalizeProject(c.project))}`}>{normalizeProject(c.project)}</span>
                        : <span className="text-xs text-slate-600">—</span>}
                      <div className="text-xs text-slate-500 mt-1">{c.unit || "—"}</div>
                    </td>
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
                        {!isTf && (
                          <button onClick={() => openEdit(c)}
                            className="text-blue-400 hover:text-blue-300 transition" title="Edit">
                            <Edit2 size={13} />
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
                    <td colSpan={3} className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
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
            isAdmin={isAdmin} form={form} setForm={setForm}
            spOptions={spOptions} hunterOptions={hunters} projects={dbProjects} caraBayarOptions={dbCaraBayar} saving={saving}
            onCancel={() => setShowInputModal(false)}
            onSubmit={handleSave} title="Input Closing" submitLabel="Simpan Closing"
            formError={formError}
          />
        </Modal>
      )}

      {showEditModal && editingClosing && (
        <Modal onClose={() => { setShowEditModal(false); setEditingClosing(null) }}>
          <ClosingFormFields
            isAdmin={isAdmin} form={form} setForm={setForm}
            spOptions={spOptions} hunterOptions={hunters} projects={dbProjects} caraBayarOptions={dbCaraBayar} saving={saving}
            onCancel={() => { setShowEditModal(false); setEditingClosing(null) }}
            onSubmit={handleEditSave}
            title={`Edit: ${editingClosing.name}`}
            submitLabel="Simpan Perubahan"
            formError={formError}
            onCancelClosing={() => setShowCancelClosingConfirm(true)}
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
      {showCancelClosingConfirm && editingClosing && (
        <ConfirmModal
          title="Batalkan Closing?"
          message="Data akan dipindahkan kembali ke Pipeline dengan status Hot."
          confirmLabel="Batal Closing"
          onConfirm={handleCancelClosing}
          onCancel={() => setShowCancelClosingConfirm(false)}
        />
      )}
    </DashboardShell>
  )
}
