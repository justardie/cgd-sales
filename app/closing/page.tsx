"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, getMonthName, pct } from "@/lib/utils"
import { Plus, X, ChevronLeft, ChevronRight, Filter } from "lucide-react"
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
  pipeline_id: string | null
}

interface ClosingWithHunter extends ClosingRow {
  hunter_name: string
  hunter_target: number
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
  "Central Hills":    "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Central Tiban":    "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  "MRD CRBA+CBA":     "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "MRD CLH":          "bg-pink-500/10 text-pink-400 border-pink-500/30",
  "MRD CRTU":         "bg-orange-500/10 text-orange-400 border-orange-500/30",
  "SCC":              "bg-green-500/10 text-green-400 border-green-500/30",
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
      <div className="w-full max-w-md rounded-xl relative"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  )
}

export default function ClosingPage() {
  const { user, isAdmin } = useAuth()
  const [closings, setClosings] = useState<ClosingWithHunter[]>([])
  const [pipelines, setPipelines] = useState<ExistingPipeline[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [filterProject, setFilterProject] = useState("")
  const [filterHunter, setFilterHunter] = useState("")

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
    notes: "",
  })

  useEffect(() => { if (user) fetchData() }, [user, month, year])

  async function fetchData() {
    setLoading(true)
    const [closingsRes, pipeRes, usersRes] = await Promise.all([
      supabase.from("closings").select("*")
        .eq("month", month).eq("year", year)
        .order("closing_date", { ascending: false }),
      supabase.from("pipeline")
        .select("id,name,sales,unit,value,slhunter,status,user_id")
        .not("status", "eq", "closed_won")
        .not("status", "eq", "closed_lost"),
      supabase.from("users").select("id,name,monthly_target,role,status").eq("status", "active"),
    ])

    const allUsers = (usersRes.data || []) as User[]
    setUsers(allUsers.filter(u => u.role !== "admin"))

    const userMap: Record<string, { name: string; monthly_target: number }> = {}
    allUsers.forEach(u => { userMap[u.id] = { name: u.name, monthly_target: u.monthly_target || 0 } })

    const rawClosings = (closingsRes.data || []) as ClosingRow[]
    const enriched: ClosingWithHunter[] = rawClosings
      .filter(c => isAdmin || c.user_id === user!.id)
      .map(c => ({
        ...c,
        hunter_name: userMap[c.user_id]?.name || c.user_id,
        hunter_target: userMap[c.user_id]?.monthly_target || 0,
      }))

    setClosings(enriched)

    const allPipes = (pipeRes.data || []) as ExistingPipeline[]
    setPipelines(allPipes.filter(p =>
      isAdmin ||
      p.user_id === user!.id ||
      (p.slhunter || "").toLowerCase() === ((user as User & { name?: string })?.name || "").toLowerCase()
    ))

    setLoading(false)
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
      notes: form.notes || null,
    })
    if (form.pipeline_id) {
      await supabase.from("pipeline").update({ status: "closed_won" }).eq("id", form.pipeline_id)
    }
    setSaving(false)
    setShowModal(false)
    setForm(f => ({
      ...f, pipeline_id: "", konsumen_name: "", project: "", unit: "",
      closing_value: "", visit_date: "", notes: "",
    }))
    fetchData()
  }

  // Derived stats
  const allProjects = Array.from(new Set(closings.map(c => c.project || "—"))).sort()

  const projectStats = allProjects.map(proj => {
    const rows = closings.filter(c => (c.project || "—") === proj)
    return { proj, count: rows.length, omset: rows.reduce((s, c) => s + (c.closing_value || 0), 0) }
  }).sort((a, b) => b.omset - a.omset)

  const hunterStats = users.map(u => {
    const rows = closings.filter(c => c.user_id === u.id)
    return {
      id: u.id, name: u.name,
      target: u.monthly_target || 0,
      omset: rows.reduce((s, c) => s + (c.closing_value || 0), 0),
      count: rows.length,
    }
  }).filter(h => h.target > 0 || h.omset > 0)
    .sort((a, b) => b.omset - a.omset)

  // Filtered rows for table
  const filteredClosings = closings.filter(c => {
    const matchProj = !filterProject || (c.project || "—") === filterProject
    const matchHunter = !filterHunter || c.user_id === filterHunter
    return matchProj && matchHunter
  })

  const totalOmset = filteredClosings.reduce((s, c) => s + (c.closing_value || 0), 0)

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Closing</h1>
            <p className="text-sm text-slate-500 mt-0.5">Realisasi penjualan</p>
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

        {/* Project summary cards */}
        {projectStats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {projectStats.map(s => (
              <button key={s.proj}
                onClick={() => setFilterProject(filterProject === s.proj ? "" : s.proj)}
                className={`rounded-xl p-3 text-left transition border ${projColor(s.proj)} ${filterProject === s.proj ? "ring-2 ring-white/20" : "opacity-80 hover:opacity-100"}`}>
                <div className="text-[10px] font-semibold uppercase tracking-wide truncate mb-1">{s.proj}</div>
                <div className="text-sm font-bold">{formatRupiah(s.omset)}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{s.count} transaksi</div>
              </button>
            ))}
          </div>
        )}

        {/* Hunter target vs realisasi — admin only */}
        {isAdmin && hunterStats.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ background: "var(--surface)" }}>
              <span className="text-sm font-semibold text-white">Target vs Realisasi Hunter — {getMonthName(month)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                    <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Hunter</th>
                    <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Target</th>
                    <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Realisasi</th>
                    <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">%</th>
                    <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {hunterStats.map(h => {
                    const ach = pct(h.omset, h.target)
                    const isActive = filterHunter === h.id
                    return (
                      <tr key={h.id}
                        onClick={() => setFilterHunter(isActive ? "" : h.id)}
                        style={{ borderBottom: "1px solid var(--border)" }}
                        className={`cursor-pointer transition ${isActive ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"}`}>
                        <td className="px-4 py-2.5 text-xs font-medium text-white">{h.name}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-slate-400">{formatRupiah(h.target)}</td>
                        <td className="px-4 py-2.5 text-right text-xs font-semibold"
                          style={{ color: h.omset >= h.target ? "#22c55e" : "#f1f5f9" }}>
                          {formatRupiah(h.omset)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            ach >= 100 ? "bg-green-500/20 text-green-400" :
                            ach >= 70 ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                          }`}>{ach}%</span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-slate-400">{h.count}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filter bar */}
        {(filterProject || filterHunter) && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={13} className="text-slate-500" />
            <span className="text-xs text-slate-500">Filter aktif:</span>
            {filterProject && (
              <button onClick={() => setFilterProject("")}
                className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1.5 ${projColor(filterProject)}`}>
                {filterProject} <X size={11} />
              </button>
            )}
            {filterHunter && (
              <button onClick={() => setFilterHunter("")}
                className="text-xs px-3 py-1 rounded-full border border-slate-600 text-slate-300 flex items-center gap-1.5">
                {users.find(u => u.id === filterHunter)?.name || "Hunter"} <X size={11} />
              </button>
            )}
            <span className="text-xs text-slate-500 ml-1">
              {filteredClosings.length} transaksi · {formatRupiah(totalOmset)}
            </span>
          </div>
        )}

        {/* Closing table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-5 py-4" style={{ background: "var(--surface)" }}>
            <h2 className="text-sm font-semibold text-white">
              Riwayat Closing {getMonthName(month)}
              {!filterProject && !filterHunter && (
                <span className="text-slate-500 font-normal ml-2">
                  — {closings.length} transaksi · {formatRupiah(closings.reduce((s, c) => s + (c.closing_value || 0), 0))}
                </span>
              )}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Nama Hunter</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Nama Sales</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Nama Konsumen</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Proyek</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Cluster / Unit</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium whitespace-nowrap">Nilai HJR</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Tgl Visit</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium whitespace-nowrap">Tgl Closing</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat...</td></tr>
                ) : filteredClosings.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-600 text-xs">Belum ada closing bulan ini</td></tr>
                ) : filteredClosings.map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-xs font-medium text-white whitespace-nowrap">{c.hunter_name}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.notes || "—"}</td>
                    <td className="px-4 py-3 text-xs text-white">{c.konsumen_name}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {c.project ? (
                        <span className={`px-2 py-0.5 rounded-full border text-xs ${projColor(c.project)}`}>
                          {c.project}
                        </span>
                      ) : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.unit || "—"}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-green-400 whitespace-nowrap">
                      {formatRupiah(c.closing_value)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.visit_date || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{c.closing_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Input Closing</h3>
            <form onSubmit={handleSave} className="space-y-3">
              {isAdmin && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Hunter</label>
                  <select value={form.user_id}
                    onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Pilih Hunter —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Dari Pipeline (opsional)</label>
                <select value={form.pipeline_id}
                  onChange={e => { if (e.target.value) onPipelineSelect(e.target.value); else setForm(f => ({ ...f, pipeline_id: "" })) }}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <option value="">— Manual (tanpa pipeline) —</option>
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.name} · {p.sales}</option>
                  ))}
                </select>
              </div>
              {[
                { key: "konsumen_name", label: "Nama Konsumen", required: true },
                { key: "project", label: "Proyek" },
                { key: "unit", label: "Cluster / No. Unit" },
                { key: "notes", label: "Nama Sales / SP" },
                { key: "closing_value", label: "Nilai HJR (Rp)", type: "number", required: true },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                  <input
                    type={f.type || "text"}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    required={f.required}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Tanggal Visit</label>
                <input type="date" value={form.visit_date}
                  onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Tanggal Closing</label>
                <input type="date" value={form.closing_date}
                  onChange={e => setForm(f => ({ ...f, closing_date: e.target.value }))}
                  required
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
