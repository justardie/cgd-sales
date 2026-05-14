"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { HUNTER_GROUPS } from "@/lib/hunters"
import { formatRupiah, getMonthName, pct, spBadgeColor } from "@/lib/utils"
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react"

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
  id: string
  name: string
  role_type: "SH" | "SP"
  monthly_target: number
  omset: number
  sp_level: number
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

export default function TeamPage() {
  const { user, isAdmin } = useAuth()
  const [members, setMembers] = useState<MemberStatus[]>([])
  const [spOmsetMap, setSpOmsetMap] = useState<SpOmsetMap>({})
  const [spClosingsMap, setSpClosingsMap] = useState<SpClosingsMap>({})
  const [hunterClosingsMap, setHunterClosingsMap] = useState<SpClosingsMap>({})
  const [expandedSP, setExpandedSP] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  useEffect(() => { if (user) fetchData() }, [user, month, year])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const allHunterDbNames = new Set(HUNTER_GROUPS.map(h => h.dbName))
  const allSpNames = new Set(HUNTER_GROUPS.flatMap(h => h.spNames))
  const allDbNames = new Set([...allHunterDbNames, ...allSpNames])

  async function fetchData() {
    setLoading(true)
    const [usersRes, closingsRes] = await Promise.all([
      supabase.from("users").select("id,name,monthly_target,sp_level").eq("status", "active"),
      supabase.from("konsumen").select("user_id,nilai_hjr,sales_person,sales_hunter,name,project,unit").eq("status", "closing").eq("closing_month", month).eq("closing_year", year),
    ])

    // Hunter omset keyed by dbName (= sales_hunter field in konsumen)
    const hunterOmsetByDbName: Record<string, number> = {}
    const newSpOmsetMap: SpOmsetMap = {}
    const newSpClosingsMap: SpClosingsMap = {}
    const newHunterClosingsMap: SpClosingsMap = {}

    ;(closingsRes.data || []).forEach(c => {
      // Aggregate hunter omset by sales_hunter name (dbName)
      if (c.sales_hunter) {
        hunterOmsetByDbName[c.sales_hunter] = (hunterOmsetByDbName[c.sales_hunter] || 0) + (c.nilai_hjr || 0)
        // Store closings keyed by hunter display name for the expand panel
        const hunterDef = HUNTER_GROUPS.find(h => h.dbName === c.sales_hunter)
        const displayKey = hunterDef ? hunterDef.name : c.sales_hunter
        if (!newHunterClosingsMap[displayKey]) newHunterClosingsMap[displayKey] = []
        newHunterClosingsMap[displayKey].push({
          name: c.name, project: c.project ?? null, unit: c.unit ?? null, nilai_hjr: c.nilai_hjr || 0,
        })
      }
      // Aggregate SP omset by sales_person name
      const spName = c.sales_person
      if (spName) {
        newSpOmsetMap[spName] = (newSpOmsetMap[spName] || 0) + (c.nilai_hjr || 0)
        if (!newSpClosingsMap[spName]) newSpClosingsMap[spName] = []
        newSpClosingsMap[spName].push({
          name: c.name, project: c.project ?? null, unit: c.unit ?? null, nilai_hjr: c.nilai_hjr || 0,
        })
      }
    })

    setSpOmsetMap(newSpOmsetMap)
    setSpClosingsMap(newSpClosingsMap)
    setHunterClosingsMap(newHunterClosingsMap)

    const list: MemberStatus[] = (usersRes.data || [])
      .filter(u => allDbNames.has(u.name))
      .map(u => {
        const isHunter = allHunterDbNames.has(u.name)
        const hunterDef = isHunter ? HUNTER_GROUPS.find(h => h.dbName === u.name) : null
        const displayName = hunterDef ? hunterDef.name : u.name
        return {
          id: u.id,
          name: displayName,
          role_type: isHunter ? "SH" : "SP",
          monthly_target: u.monthly_target || 0,
          // Hunter omset: look up by dbName (u.name) in the sales_hunter-based map
          omset: isHunter ? (hunterOmsetByDbName[u.name] || 0) : 0,
          sp_level: u.sp_level ?? 0,
        }
      })

    setMembers(list)
    setLoading(false)
  }

  function getMember(displayOrSpName: string): MemberStatus | undefined {
    return members.find(m => m.name === displayOrSpName)
  }

  async function adjustSP(memberId: string, delta: number, current: number) {
    if (!isAdmin) return
    const newLevel = Math.max(0, Math.min(5, current + delta))
    setSaving(memberId)
    await supabase.from("users").update({ sp_level: newLevel }).eq("id", memberId)
    setSaving(null)
    fetchData()
  }

  function borderColor(color: string) { return color.split(" ")[1] }
  function hunterColor(dbName: string) {
    return HUNTER_COLORS[dbName] || "bg-slate-500/10 border-slate-500/30 text-slate-400"
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header + Month Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Team Status</h1>
            <p className="text-sm text-slate-500 mt-0.5">SP Level per Sales Person · MASCOL Division</p>
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
            {HUNTER_GROUPS.map(hunter => {
              const color = hunterColor(hunter.dbName)
              const m = getMember(hunter.name)
              return (
                <div key={hunter.name}
                  className={`rounded-xl overflow-hidden border ${borderColor(color)}`}
                  style={{ background: "var(--surface)" }}>

                  {/* Hunter Card Header */}
                  <div className={`px-4 py-3 border-b ${borderColor(color)}`}
                    style={{ background: "var(--surface2)" }}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>SH</span>
                      <span className="text-sm font-semibold text-white">{hunter.name}</span>
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
                  </div>

                  {/* Sales Persons / Solo Hunter */}
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {hunter.spNames.length === 0 && (() => {
                      const isExpanded = expandedSP === hunter.name
                      const closings = hunterClosingsMap[hunter.name] || []
                      return (
                        <div>
                          <div
                            className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition"
                            onClick={() => setExpandedSP(isExpanded ? null : hunter.name)}>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-white">{hunter.name}</span>
                              {m && m.omset > 0 && (
                                <div className="text-xs text-slate-400 mt-0.5">{formatRupiah(m.omset)}</div>
                              )}
                            </div>
                            <span className="text-xs text-slate-600 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                          {isExpanded && (
                            <div className="px-4 py-3" style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid var(--border)" }}>
                              {closings.length === 0 ? (
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
                                    {closings.map((d, i) => (
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
                          )}
                        </div>
                      )
                    })()}
                    {hunter.spNames.map(spName => {
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
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Sales Person</span>
                                </div>
                                {spOmset > 0 && (
                                  <div className="text-xs text-slate-400 mt-0.5">{formatRupiah(spOmset)}</div>
                                )}
                              </div>
                              <span className="text-xs text-slate-600 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                            </div>
                            {isExpanded && (
                              <div className="px-4 py-3" style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid var(--border)" }}>
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
                            )}
                          </div>
                        )
                      }

                      return (
                        <div key={spName}>
                          <div
                            className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition"
                            onClick={() => setExpandedSP(isExpanded ? null : spName)}>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${spBadgeColor(sp.sp_level)}`}>
                              <span className="text-xs font-bold">{sp.sp_level > 0 ? `SP${sp.sp_level}` : "OK"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-white hover:text-blue-300 transition">{sp.name}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Sales Person</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                {formatRupiah(spOmset)}
                                {sp.sp_level > 0 && (
                                  <span className="ml-2 text-red-400 font-semibold">SP{sp.sp_level}</span>
                                )}
                              </div>
                            </div>
                            {isAdmin ? (
                              <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => adjustSP(sp.id, -1, sp.sp_level)}
                                  disabled={sp.sp_level <= 0 || saving === sp.id}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/10 disabled:opacity-30 transition"
                                  title="Turunkan SP">
                                  <TrendingDown size={13} />
                                </button>
                                <button
                                  onClick={() => adjustSP(sp.id, 1, sp.sp_level)}
                                  disabled={sp.sp_level >= 5 || saving === sp.id}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition"
                                  title="Naikkan SP">
                                  <TrendingUp size={13} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600 flex-shrink-0">{isExpanded ? "▲" : "▼"}</span>
                            )}
                          </div>
                          {isExpanded && (
                            <div className="px-4 py-3" style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid var(--border)" }}>
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
                          )}
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
