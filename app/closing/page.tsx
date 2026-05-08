"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, getMonthName } from "@/lib/utils"
import { getSpOptions, HUNTER_GROUPS } from "@/lib/hunters"
import { Plus, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
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
}

interface ExistingPipeline {
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
  "Central Hills":  "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Central Tiban":  "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  "MRD CRBA+CBA":   "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "MRD CLH":        "bg-pink-500/10 text-pink-400 border-pink-500/30",
  "MRD CRTU":       "bg-orange-500/10 text-orange-400 border-orange-500/30",
  "SCC":            "bg-green-500/10 text-green-400 border-green-500/30",
}
const DEFAULT_COLOR = "bg-slate-500/10 text-slate-400 border-slate-500/30"

function projColor(p: string | null) {
  if (!p) return DEFAULT_COLOR
  for (const [key, val] of Object.entries(PROJECT_COLORS)) {
    if (p.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(p.toLowerCase())) return val
  }
  return DEFAULT_COLOR
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
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

interface HunterCardProps {
  hunter: User
  closings: ClosingRow[]
  spNames: string[]
  expanded: boolean
  onToggle: () => void
}

function HunterCard({ hunter, closings, spNames, expanded, onToggle }: HunterCardProps) {
  const total = closings.reduce((s, c) => s + (c.closing_value || 0), 0)
  const count = closings.length

  // Group by salesname (SP)
  const spMap: Record<string, { count: number; value: number; rows: ClosingRow[] }> = {}

  for (const c of closings) {
    const key = c.salesname?.trim() || "(Hunter Langsung)"
    if (!spMap[key]) spMap[key] = { count: 0, value: 0, rows: [] }
    spMap[key].count++
    spMap[key].value += c.closing_value || 0
    spMap[key].rows.push(c)
  }

  // Order: SPs from hunters.ts first, then hunter direct, then others
  const orderedKeys = [
    ...spNames.filter(sp => spMap[sp]),
    ...Object.keys(spMap).filter(k => k !== "(Hunter Langsung)" && !spNames.includes(k)),
    ...(spMap["(Hunter Langsung)"] ? ["(Hunter Langsung)"] : []),
  ]

  const pct = hunter.monthly_target > 0
    ? Math.round((total / hunter.monthly_target) * 100)
    : 0

  const barColor = pct >= 100 ? "#22c55e" : pct >= 70 ? "#E84500" : "#ef4444"

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      {/* Hunter header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-white/[0.02] transition"
        style={{ background: "var(--surface)" }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-white">{hunter.name}</span>
            {count > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">
                {count} closing
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <span className="text-lg font-black text-white">{formatRupiah(total)}</span>
            {hunter.monthly_target > 0 && (
              <span className={`text-sm font-bold ${pct >= 100 ? "text-green-400" : pct >= 70 ? "text-orange-400" : "text-red-400"}`}>
                {pct}%
              </span>
            )}
          </div>
          {hunter.monthly_target > 0 && (
            <div className="mt-2 h-1 rounded-full w-48" style={{ background: "var(--surface2)" }}>
              <div className="h-1 rounded-full transition-all"
                style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
            </div>
          )}
        </div>
        <div className="text-slate-500 flex-shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* SP breakdown */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          {orderedKeys.length === 0 ? (
            <div className="px-5 py-4 text-xs text-slate-600">Belum ada closing bulan ini</div>
          ) : orderedKeys.map(sp => {
            const data = spMap[sp]
            const isDirect = sp === "(Hunter Langsung)"
            return (
              <div key={sp} style={{ borderBottom: "1px solid var(--border)" }}
                className="px-5 py-3 hover:bg-white/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${isDirect ? "text-slate-400 italic" : "text-slate-200"}`}>
                    {sp}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{data.count} transaksi</span>
                    <span className="text-xs font-bold text-green-400">{formatRupiah(data.value)}</span>
                  </div>
                </div>
                {/* Individual closings */}
                <div className="space-y-1">
                  {data.rows.map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="text-slate-400 font-medium truncate max-w-[180px]">{c.konsumen_name}</span>
                      {c.project && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${projColor(c.project)}`}>
                          {c.project}
                        </span>
                      )}
                      <span className="ml-auto text-slate-400">{formatRupiah(c.closing_value)}</span>
                      <span className="text-slate-600">{c.closing_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* SPs with zero closing this month */}
          {spNames.filter(sp => !spMap[sp]).map(sp => (
            <div key={sp} className="px-5 py-2.5 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="text-xs text-slate-600">{sp}</span>
              <span className="text-xs text-slate-700">0 closing</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ClosingPage() {
  const { user, isAdmin } = useAuth()
  const [closings, setClosings] = useState<ClosingRow[]>([])
  const [pipelines, setPipelines] = useState<ExistingPipeline[]>([])
  const [hunters, setHunters] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const [form, setForm] = useState({
    user_id: user?.id || "",
    pipeline_id: "",
    konsumen_name: "",
    project: "",
    unit: "",
    closing_value: "",
    visit_date: "",
    closing_date: new Date().toISOString().slice(0, 10),
    salesname: "",
  })

  useEffect(() => { if (user) fetchData() }, [user, month, year])

  async function fetchData() {
    setLoading(true)
    const [closingsRes, pipeRes, usersRes] = await Promise.all([
      supabase.from("closings")
        .select("id,user_id,konsumen_name,project,unit,closing_value,closing_date,visit_date,month,year,notes,salesname,pipeline_id")
        .eq("month", month).eq("year", year)
        .order("closing_date", { ascending: false }),
      supabase.from("potensi_closing")
        .select("id,name,sales,unit,value,slhunter,status,user_id")
        .not("status", "eq", "closed_won")
        .not("status", "eq", "closed_lost"),
      supabase.from("users")
        .select("id,name,monthly_target,role,status")
        .eq("status", "active")
        .eq("role", "hunter"),
    ])

    const allHunters = (usersRes.data || []) as User[]
    setHunters(allHunters)
    setClosings((closingsRes.data || []) as ClosingRow[])

    const allPipes = (pipeRes.data || []) as ExistingPipeline[]
    const myId = user!.id
    const myName = (user?.name || "").toLowerCase()
    setPipelines(allPipes.filter(p =>
      isAdmin ||
      p.user_id === myId ||
      (p.slhunter || "").toLowerCase() === myName
    ))

    // Auto-expand all cards by default
    setExpanded(new Set(allHunters.map(h => h.id)))
    setLoading(false)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function onPipelineSelect(id: string) {
    const p = pipelines.find(x => x.id === id)
    if (p) {
      setForm(f => ({
        ...f,
        pipeline_id: id,
        konsumen_name: p.name || "",
        project: p.sales || "",
        unit: p.unit || "",
        closing_value: p.value?.toString() || "",
        user_id: p.user_id || f.user_id,
      }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.closing_value || Number(form.closing_value) <= 0) return
    setSaving(true)
    const d = new Date(form.closing_date)
    await supabase.from("closings").insert({
      user_id: form.user_id || user!.id,
      pipeline_id: form.pipeline_id || null,
      konsumen_name: form.konsumen_name,
      project: form.project || null,
      unit: form.unit || null,
      closing_value: Number(form.closing_value),
      visit_date: form.visit_date || null,
      closing_date: form.closing_date,
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      salesname: form.salesname || null,
    })
    if (form.pipeline_id) {
      await supabase.from("potensi_closing").update({ status: "closed_won" }).eq("id", form.pipeline_id)
    }
    setSaving(false)
    setShowModal(false)
    setForm(f => ({
      ...f, pipeline_id: "", konsumen_name: "", project: "", unit: "",
      closing_value: "", visit_date: "", salesname: "",
    }))
    fetchData()
  }

  // Build hunter list to display
  // Admin: all hunters from HUNTER_GROUPS order; Hunter: only self
  const displayHunters = isAdmin
    ? HUNTER_GROUPS
        .map(g => hunters.find(h => h.name === g.dbName || h.name === g.name))
        .filter((h): h is User => !!h)
    : hunters.filter(h => h.id === user?.id)

  const totalOmset = closings.reduce((s, c) => s + (c.closing_value || 0), 0)

  const adminSelectedHunterName = hunters.find(u => u.id === form.user_id)?.name || ""
  const spOptions = isAdmin
    ? getSpOptions(adminSelectedHunterName)
    : getSpOptions(user?.name || "")

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Closing</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {getMonthName(month)} {year} · {closings.length} transaksi · {formatRupiah(totalOmset)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <ChevronLeft size={14} />
            </button>
            <div className="text-sm font-semibold text-white min-w-[130px] text-center">
              {getMonthName(month)} {year}
            </div>
            <button onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <ChevronRight size={14} />
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
              <Plus size={14} /> Input Closing
            </button>
          </div>
        </div>

        {/* Hunter Cards */}
        {loading ? (
          <div className="text-center py-12 text-slate-600 text-sm">Memuat data closing...</div>
        ) : displayHunters.length === 0 ? (
          <div className="text-center py-12 text-slate-600 text-sm">Tidak ada data</div>
        ) : (
          <div className="space-y-3">
            {displayHunters.map(hunter => {
              const hunterGroup = HUNTER_GROUPS.find(g => g.dbName === hunter.name || g.name === hunter.name)
              const spNames = hunterGroup?.spNames || []
              const hunterClosings = closings.filter(c => c.user_id === hunter.id)
              return (
                <HunterCard
                  key={hunter.id}
                  hunter={hunter}
                  closings={hunterClosings}
                  spNames={spNames}
                  expanded={expanded.has(hunter.id)}
                  onToggle={() => toggleExpand(hunter.id)}
                />
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Input Closing</h3>
            <form onSubmit={handleSave} className="space-y-3">

              {/* Hunter */}
              {isAdmin ? (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Hunter</label>
                  <select
                    value={form.user_id}
                    onChange={e => setForm(f => ({ ...f, user_id: e.target.value, salesname: "" }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Pilih Hunter —</option>
                    {HUNTER_GROUPS.map(g => {
                      const h = hunters.find(u => u.name === g.dbName || u.name === g.name)
                      return h ? <option key={h.id} value={h.id}>{g.name}</option> : null
                    })}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Hunter</label>
                  <div className="w-full text-sm px-3 py-2 rounded-lg text-slate-400"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    {user?.name || "—"}
                  </div>
                </div>
              )}

              {/* Sales Person */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Sales Person</label>
                {spOptions.length > 0 ? (
                  <select value={form.salesname}
                    onChange={e => setForm(f => ({ ...f, salesname: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Tanpa SP / Hunter Langsung —</option>
                    {spOptions.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                  </select>
                ) : (
                  <input type="text" value={form.salesname}
                    onChange={e => setForm(f => ({ ...f, salesname: e.target.value }))}
                    placeholder="Nama sales person (opsional)"
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                )}
              </div>

              {/* Pipeline link */}
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

              {/* Konsumen */}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Nama Konsumen <span className="text-red-400">*</span></label>
                <input type="text" value={form.konsumen_name} required
                  onChange={e => setForm(f => ({ ...f, konsumen_name: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Proyek</label>
                  <input type="text" value={form.project}
                    onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Cluster / Unit</label>
                  <input type="text" value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Nilai HJR (Rp) <span className="text-red-400">*</span></label>
                <input type="number" value={form.closing_value} required
                  onChange={e => setForm(f => ({ ...f, closing_value: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
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
                  <label className="text-xs text-slate-500 block mb-1">Tanggal Closing</label>
                  <input type="date" value={form.closing_date} required
                    onChange={e => setForm(f => ({ ...f, closing_date: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition">
                  {saving ? "Menyimpan..." : "Konfirmasi Closing"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </DashboardShell>
  )
}
