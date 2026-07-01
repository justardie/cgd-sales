"use client"
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { HUNTER_GROUPS } from "@/lib/hunters"
import { formatRupiah, getMonthName, pct, PROJECT_NAMES } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

const HUNTER_COLORS: Record<string, string> = {
  "Lyndon Sumarli":         "bg-blue-500/10 border-blue-500/30 text-blue-400",
  "Jimmy Darmadi":          "bg-green-500/10 border-green-500/30 text-green-400",
  "Firyal Badriyyah":       "bg-orange-500/10 border-orange-500/30 text-orange-400",
  "Aida (Rosmaida)":        "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  "Aldo (Rinaldo)":         "bg-purple-500/10 border-purple-500/30 text-purple-400",
  "Frans":                  "bg-pink-500/10 border-pink-500/30 text-pink-400",
  "Andre":                  "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
  "Prediman":               "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
  "Ellen":                  "bg-rose-500/10 border-rose-500/30 text-rose-400",
  "Rika Sanusi":            "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
}

interface MemberStatus {
  name: string
  monthly_target: number
  omset: number
}

interface ClosingDetail {
  name: string
  project: string | null
  unit: string | null
  nilai_hjr: number
}

type SpOmsetMap = Record<string, number>
type SpClosingsMap = Record<string, ClosingDetail[]>

const now = new Date()
const ALL_HUNTER_DB_NAMES = new Set(HUNTER_GROUPS.map(h => h.dbName))

export default function TeamPage() {
  const { user, isAdmin } = useAuth()
  const [members, setMembers] = useState<MemberStatus[]>([])
  const [spOmsetMap, setSpOmsetMap] = useState<SpOmsetMap>({})
  const [spClosingsMap, setSpClosingsMap] = useState<SpClosingsMap>({})
  const [hunterClosingsMap, setHunterClosingsMap] = useState<SpClosingsMap>({})
  const [expandedSP, setExpandedSP] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hunterSpMap, setHunterSpMap] = useState<Record<string, string[]>>({})
  /** Agent omset keyed by hunter dbName — for hasAgent hunters */
  const [agentOmsetByHunter, setAgentOmsetByHunter] = useState<Record<string, number>>({})
  const [agentClosingsByHunter, setAgentClosingsByHunter] = useState<SpClosingsMap>({})
  /** Direct (no-SP, no-Agent) omset keyed by hunter dbName */
  const [hunterDirectOmset, setHunterDirectOmset] = useState<Record<string, number>>({})
  const [hunterDirectClosings, setHunterDirectClosings] = useState<SpClosingsMap>({})
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [coverageMap, setCoverageMap] = useState<Record<string, string[]>>({})
  const [editingCoverage, setEditingCoverage] = useState<string | null>(null)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const fetchData = useCallback(async () => {
    const [usersRes, closingsRes] = await Promise.all([
      supabase.from("users").select("name,monthly_target,hunter_name,role,project_coverage").eq("status", "active"),
      supabase.from("konsumen").select("user_id,nilai_hjr,sales_person,sales_hunter,name,project,unit").eq("status", "closing").eq("closing_month", month).eq("closing_year", year),
    ])

    // Hunter omset keyed by dbName (= sales_hunter field in konsumen)
    const hunterOmsetByDbName: Record<string, number> = {}
    // Direct = sales where sales_person is NOT 'Agent' (hunter sells himself or via SP)
    const hunterDirectOmset: Record<string, number> = {}
    const hunterDirectClosings: SpClosingsMap = {}
    const newSpOmsetMap: SpOmsetMap = {}
    const newSpClosingsMap: SpClosingsMap = {}
    const newHunterClosingsMap: SpClosingsMap = {}
    const newAgentOmset: Record<string, number> = {}
    const newAgentClosings: SpClosingsMap = {}

    ;(closingsRes.data || []).forEach(c => {
      const val = c.nilai_hjr || 0
      const detail: ClosingDetail = {
        name: c.name, project: c.project ?? null, unit: c.unit ?? null, nilai_hjr: val,
      }

      if (c.sales_hunter) {
        // Total hunter omset (all channels, for header badge)
        hunterOmsetByDbName[c.sales_hunter] = (hunterOmsetByDbName[c.sales_hunter] || 0) + val
        const hunterDef = HUNTER_GROUPS.find(h => h.dbName === c.sales_hunter)
        const displayKey = hunterDef ? hunterDef.name : c.sales_hunter
        if (!newHunterClosingsMap[displayKey]) newHunterClosingsMap[displayKey] = []
        newHunterClosingsMap[displayKey].push(detail)
      }

      const spName = c.sales_person
      if (spName === "Agent" && c.sales_hunter) {
        // Agent channel: track per-hunter
        newAgentOmset[c.sales_hunter] = (newAgentOmset[c.sales_hunter] || 0) + val
        if (!newAgentClosings[c.sales_hunter]) newAgentClosings[c.sales_hunter] = []
        newAgentClosings[c.sales_hunter].push(detail)
      } else if (spName) {
        // Named SP channel
        newSpOmsetMap[spName] = (newSpOmsetMap[spName] || 0) + val
        if (!newSpClosingsMap[spName]) newSpClosingsMap[spName] = []
        newSpClosingsMap[spName].push(detail)
        // Also count as hunter direct if no SP (i.e. hunter sold personally)
      } else if (c.sales_hunter) {
        // No SP — hunter sold directly
        hunterDirectOmset[c.sales_hunter] = (hunterDirectOmset[c.sales_hunter] || 0) + val
        const hunterDef = HUNTER_GROUPS.find(h => h.dbName === c.sales_hunter)
        const displayKey = hunterDef ? hunterDef.name : c.sales_hunter
        if (!hunterDirectClosings[displayKey]) hunterDirectClosings[displayKey] = []
        hunterDirectClosings[displayKey].push(detail)
      }
    })

    setSpOmsetMap(newSpOmsetMap)
    setSpClosingsMap(newSpClosingsMap)
    setHunterClosingsMap(newHunterClosingsMap)
    setAgentOmsetByHunter(newAgentOmset)
    setAgentClosingsByHunter(newAgentClosings)
    setHunterDirectOmset(hunterDirectOmset)
    setHunterDirectClosings(hunterDirectClosings)

    // Build DB-driven hunter → SP names map
    const newHunterSpMap: Record<string, string[]> = {}
    ;(usersRes.data || []).forEach(u => {
      if ((u as { hunter_name?: string | null }).hunter_name) {
        const hn = (u as { hunter_name: string }).hunter_name
        if (!newHunterSpMap[hn]) newHunterSpMap[hn] = []
        newHunterSpMap[hn].push(u.name)
      }
    })
    setHunterSpMap(newHunterSpMap)
    setCoverageMap(Object.fromEntries((usersRes.data || []).filter(u => u.role === "hunter").map(u => [u.name, (u as {project_coverage?: string[]}).project_coverage || []])))

    const allSpNamesDb = new Set(Object.values(newHunterSpMap).flat())
    const allDbNames = new Set([...ALL_HUNTER_DB_NAMES, ...allSpNamesDb])

    const list: MemberStatus[] = (usersRes.data || [])
      .filter(u => allDbNames.has(u.name) || u.role === "hunter" || u.role === "sales_person")
      .map(u => {
        const isHunter = ALL_HUNTER_DB_NAMES.has(u.name)
        const hunterDef = isHunter ? HUNTER_GROUPS.find(h => h.dbName === u.name) : null
        const displayName = hunterDef ? hunterDef.name : u.name
        return {
          name: displayName,
          monthly_target: u.monthly_target || 0,
          // Hunter omset: look up by dbName (u.name) in the sales_hunter-based map
          omset: isHunter ? (hunterOmsetByDbName[u.name] || 0) : 0,
        }
      })

    setMembers(list)
    setLoading(false)
  }, [month, year])

  useEffect(() => { if (user) queueMicrotask(() => void fetchData()) }, [fetchData, user])

  function getMember(displayOrSpName: string): MemberStatus | undefined {
    return members.find(m => m.name === displayOrSpName)
  }

  function borderColor(color: string) { return color.split(" ")[1] }
  function hunterColor(dbName: string) {
    return HUNTER_COLORS[dbName] || "bg-slate-500/10 border-slate-500/30 text-slate-400"
  }

  async function toggleCoverage(hunterName: string, project: string) {
    const current = coverageMap[hunterName] || []
    const next = current.includes(project) ? current.filter(x => x !== project) : [...current, project]
    setCoverageMap(map => ({ ...map, [hunterName]: next }))
    const { error } = await supabase.from("users").update({ project_coverage: next }).eq("name", hunterName).eq("role", "hunter")
    if (error) setCoverageMap(map => ({ ...map, [hunterName]: current }))
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header + Month Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Team Status</h1>
            <p className="text-sm text-slate-500 mt-0.5">Omset Hunter &amp; Sales Person · MASCOL Division</p>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600 text-sm">Memuat data...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {HUNTER_GROUPS.filter(hunter => members.some(m => m.name === hunter.name)).map((hunter, hIdx) => {
              const color = hunterColor(hunter.dbName)
              const m = getMember(hunter.name)
              return (
                <div key={hunter.name}
                  className={`rounded-xl overflow-hidden border ${borderColor(color)} hunter-card-${Math.min(hIdx + 1, 9)}`}
                  style={{ background: "var(--surface)" }}>

                  {/* Hunter Card Header */}
                  <div className={`px-4 py-3 border-b ${borderColor(color)}`}
                    style={{ background: "var(--surface2)" }}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>SH</span>
                      <span className="text-sm font-semibold text-white">{hunter.name}</span>
                      {(hunterClosingsMap[hunter.name] || []).length > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">✓ Closing</span>
                      )}
                      <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 ml-auto">
                        Sales Hunter
                      </span>
                    </div>
                    {m ? (() => {
                      const ach = pct(m.omset, m.monthly_target)
                      return (
                        <div className="mt-2">
                          <div className="text-xs text-slate-500">
                            {formatRupiah(m.omset)} / {formatRupiah(m.monthly_target)}
                            <span className={`ml-2 font-bold ${ach >= 100 ? "text-green-400" : ach >= 70 ? "text-blue-400" : "text-red-400"}`}>
                              {ach}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-1 rounded-full bg-slate-800 w-full max-w-[200px]">
                            <div className="h-1 rounded-full transition-all"
                              style={{ width: `${Math.min(ach, 100)}%`, background: ach >= 100 ? "#22c55e" : "#6366f1" }} />
                          </div>
                        </div>
                      )
                    })() : (
                      <div className="text-xs text-slate-600 mt-1.5">Data tidak ditemukan</div>
                    )}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-slate-500">Coverage:</span>
                      {(coverageMap[hunter.dbName] || []).length ? (coverageMap[hunter.dbName] || []).map(project => <span key={project} className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{project}</span>) : <span className="text-[11px] text-slate-600">Belum diatur</span>}
                      {isAdmin && <button onClick={() => setEditingCoverage(editingCoverage === hunter.dbName ? null : hunter.dbName)} className="text-[11px] text-blue-400 ml-auto">Atur Coverage</button>}
                    </div>
                    {isAdmin && editingCoverage === hunter.dbName && <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-lg p-2" style={{background:"var(--surface)"}}>
                      {PROJECT_NAMES.map(project => <label key={project} className="text-[11px] text-slate-300 flex gap-1.5 items-center"><input type="checkbox" checked={(coverageMap[hunter.dbName] || []).includes(project)} onChange={() => void toggleCoverage(hunter.dbName, project)}/>{project}</label>)}
                    </div>}
                  </div>

                  {/* Sales Persons / Solo Hunter */}
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {/* Agent row FIRST — only for hunters with hasAgent: true */}
                    {hunter.hasAgent && (() => {
                      const agentOmset = agentOmsetByHunter[hunter.dbName] || 0
                      const agentClosings = agentClosingsByHunter[hunter.dbName] || []
                      const agentKey = `agent-${hunter.dbName}`
                      const isExpanded = expandedSP === agentKey
                      return (
                        <div key="agent">
                          <div
                            className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition"
                            onClick={() => setExpandedSP(isExpanded ? null : agentKey)}>
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "rgba(168,85,247,0.12)", color: "#c084fc" }}>
                              <span className="text-xs font-bold">AGT</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold" style={{ color: "#e2d9f3" }}>Agent</span>
                                <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                  style={{ background: "rgba(168,85,247,0.1)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.25)" }}>
                                  Channel Agent
                                </span>
                                {agentOmset > 0 && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">✓ Closing</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {agentOmset > 0 ? formatRupiah(agentOmset) : "Belum ada closing"}
                              </div>
                            </div>
                            <span className="text-xs text-slate-600 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                          <div className={`expand-panel ${isExpanded ? "open" : "closed"}`} style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid var(--border)" }}>
                            <div className="px-4 py-3">
                              {agentClosings.length === 0 ? (
                                <div className="text-xs text-slate-600 italic">Belum ada closing Agent bulan ini</div>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-slate-500">
                                      <th className="text-left pb-2 font-medium">Konsumen</th>
                                      <th className="text-left pb-2 font-medium">Project</th>
                                      <th className="text-left pb-2 font-medium">Unit</th>
                                      <th className="text-right pb-2 font-medium">Omset</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {agentClosings.map((d, i) => (
                                      <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                                        <td className="py-1.5 text-white pr-3">{d.name}</td>
                                        <td className="py-1.5 text-slate-400 pr-3">{d.project || "—"}</td>
                                        <td className="py-1.5 text-slate-400 pr-3">{d.unit || "—"}</td>
                                        <td className="py-1.5 text-right text-green-400 font-semibold">{formatRupiah(d.nilai_hjr)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                    {/* Hunter Langsung row — direct sales (no SP, no Agent) */}
                    {(() => {
                      const directOmset = hunterDirectOmset[hunter.dbName] || 0
                      const directClosings = hunterDirectClosings[hunter.name] || []
                      // Only show if there are actual direct sales
                      if (directOmset === 0 && directClosings.length === 0) return null
                      const directKey = `direct-${hunter.dbName}`
                      const isExpanded = expandedSP === directKey
                      return (
                        <div key="direct">
                          <div
                            className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition"
                            onClick={() => setExpandedSP(isExpanded ? null : directKey)}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-white">{hunter.name}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                  style={{ background: "rgba(234,92,0,0.1)", color: "#fb923c", border: "1px solid rgba(234,92,0,0.25)" }}>
                                  Hunter Langsung
                                </span>
                                {directOmset > 0 && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">✓ Closing</span>
                                )}
                              </div>
                              {directOmset > 0 && (
                                <div className="text-xs text-slate-400 mt-0.5">{formatRupiah(directOmset)}</div>
                              )}
                            </div>
                            <span className="text-xs text-slate-600 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                          <div className={`expand-panel ${isExpanded ? "open" : "closed"}`} style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid var(--border)" }}>
                            <div className="px-4 py-3">
                              {directClosings.length === 0 ? (
                                <div className="text-xs text-slate-600 italic">Belum ada closing langsung bulan ini</div>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-slate-500">
                                      <th className="text-left pb-2 font-medium">Konsumen</th>
                                      <th className="text-left pb-2 font-medium">Project</th>
                                      <th className="text-left pb-2 font-medium">Unit</th>
                                      <th className="text-right pb-2 font-medium">Omset</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {directClosings.map((d, i) => (
                                      <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                                        <td className="py-1.5 text-white pr-3">{d.name}</td>
                                        <td className="py-1.5 text-slate-400 pr-3">{d.project || "—"}</td>
                                        <td className="py-1.5 text-slate-400 pr-3">{d.unit || "—"}</td>
                                        <td className="py-1.5 text-right text-green-400 font-semibold">{formatRupiah(d.nilai_hjr)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                    {(hunterSpMap[hunter.dbName] || []).map(spName => {
                      const sp = getMember(spName)
                      const spOmset = spOmsetMap[spName] || 0
                      const isExpanded = expandedSP === spName
                      const spClosings = spClosingsMap[spName] || []

                      if (!sp) {
                        return (
                          <div key={spName}>
                            <div
                              className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition"
                              onClick={() => setExpandedSP(isExpanded ? null : spName)}>
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800 flex-shrink-0">
                                <span className="text-xs font-bold text-slate-500">OK</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-white hover:text-blue-300 transition">{spName}</span>
                                  {spOmset > 0 && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">✓ Closing</span>
                                  )}
                                </div>
                                {spOmset > 0 && (
                                  <div className="text-xs text-slate-400 mt-0.5">{formatRupiah(spOmset)}</div>
                                )}
                              </div>
                              <span className="text-xs text-slate-600 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                            </div>
                            <div className={`expand-panel ${isExpanded ? "open" : "closed"}`} style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid var(--border)" }}>
                              <div className="px-4 py-3">
                                {spClosings.length === 0 ? (
                                  <div className="text-xs text-slate-600 italic">Belum ada closing bulan ini</div>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-slate-500">
                                        <th className="text-left pb-2 font-medium">Konsumen</th>
                                        <th className="text-left pb-2 font-medium">Project</th>
                                        <th className="text-left pb-2 font-medium">Unit</th>
                                        <th className="text-right pb-2 font-medium">Omset</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {spClosings.map((d, i) => (
                                        <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                                          <td className="py-1.5 text-white pr-3">{d.name}</td>
                                          <td className="py-1.5 text-slate-400 pr-3">{d.project || "—"}</td>
                                          <td className="py-1.5 text-slate-400 pr-3">{d.unit || "—"}</td>
                                          <td className="py-1.5 text-right text-green-400 font-semibold">{formatRupiah(d.nilai_hjr)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div key={spName}>
                          <div
                            className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition"
                            onClick={() => setExpandedSP(isExpanded ? null : spName)}>
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/10 border border-blue-500/30 text-blue-400">
                              <span className="text-xs font-bold">SP</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-white hover:text-blue-300 transition">{sp.name}</span>
                                {spOmset > 0 && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">✓ Closing</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">{formatRupiah(spOmset)}</div>
                            </div>
                            <span className="text-xs text-slate-600 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                          <div className={`expand-panel ${isExpanded ? "open" : "closed"}`} style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid var(--border)" }}>
                            <div className="px-4 py-3">
                              {spClosings.length === 0 ? (
                                <div className="text-xs text-slate-600 italic">Belum ada closing bulan ini</div>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-slate-500">
                                      <th className="text-left pb-2 font-medium">Konsumen</th>
                                      <th className="text-left pb-2 font-medium">Project</th>
                                      <th className="text-left pb-2 font-medium">Unit</th>
                                      <th className="text-right pb-2 font-medium">Omset</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {spClosings.map((d, i) => (
                                      <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                                        <td className="py-1.5 text-white pr-3">{d.name}</td>
                                        <td className="py-1.5 text-slate-400 pr-3">{d.project || "—"}</td>
                                        <td className="py-1.5 text-slate-400 pr-3">{d.unit || "—"}</td>
                                        <td className="py-1.5 text-right text-green-400 font-semibold">{formatRupiah(d.nilai_hjr)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
