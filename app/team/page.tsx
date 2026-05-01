"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, getCurrentMonth, getCurrentYear, getMonthName, pct, spBadgeColor } from "@/lib/utils"
import { Users, TrendingUp, TrendingDown, Shield, ChevronDown, ChevronUp } from "lucide-react"

interface HunterStatus {
  id: string
  name: string
  monthly_target: number
  win_or_die_target: number
  omset: number
  sp_level: number
  sp_history_id: string | null
  hasClosing: boolean
}

export default function TeamPage() {
  const { user, isAdmin } = useAuth()
  const [hunters, setHunters] = useState<HunterStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const month = getCurrentMonth()
  const year = getCurrentYear()

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    setLoading(true)
    const [usersRes, closingsRes, spRes] = await Promise.all([
      supabase.from("users").select("id,name,monthly_target,win_or_die_target").eq("status", "active"),
      supabase.from("closings").select("user_id,closing_value").eq("month", month).eq("year", year),
      supabase.from("team_status_history").select("id,user_id,sp_level").eq("month", month).eq("year", year),
    ])

    const omsetMap: Record<string, number> = {}
    ;(closingsRes.data || []).forEach(c => {
      omsetMap[c.user_id] = (omsetMap[c.user_id] || 0) + (c.closing_value || 0)
    })

    const spMap: Record<string, { id: string; sp_level: number }> = {}
    ;(spRes.data || []).forEach(s => { spMap[s.user_id] = { id: s.id, sp_level: s.sp_level } })

    const list = (usersRes.data || []).map(u => ({
      id: u.id,
      name: u.name,
      monthly_target: u.monthly_target,
      win_or_die_target: u.win_or_die_target,
      omset: omsetMap[u.id] || 0,
      sp_level: spMap[u.id]?.sp_level ?? 0,
      sp_history_id: spMap[u.id]?.id || null,
      hasClosing: (omsetMap[u.id] || 0) > 0,
    }))

    setHunters(list)
    setLoading(false)
  }

  async function adjustSP(hunterId: string, delta: number, current: number, historyId: string | null) {
    if (!isAdmin) return
    const newLevel = Math.max(0, Math.min(5, current + delta))
    setSaving(hunterId)
    if (historyId) {
      await supabase.from("team_status_history").update({ sp_level: newLevel }).eq("id", historyId)
    } else {
      await supabase.from("team_status_history").insert({
        user_id: hunterId,
        month,
        year,
        sp_level: newLevel,
        reason: delta > 0 ? "Manual increase" : "Manual decrease",
      })
    }
    setSaving(null)
    fetchData()
  }

  async function runAutoCalc() {
    if (!isAdmin) return
    setSaving("auto")
    for (const h of hunters) {
      const currentSP = h.sp_level
      const newSP = h.hasClosing ? Math.max(0, currentSP - 1) : Math.min(5, currentSP + 1)
      if (h.sp_history_id) {
        await supabase.from("team_status_history").update({
          sp_level: newSP,
          reason: h.hasClosing ? "Auto: ada closing bulan ini" : "Auto: tidak ada closing bulan ini",
        }).eq("id", h.sp_history_id)
      } else {
        await supabase.from("team_status_history").insert({
          user_id: h.id, month, year,
          sp_level: newSP,
          reason: h.hasClosing ? "Auto: ada closing" : "Auto: tidak ada closing",
        })
      }
    }
    setSaving(null)
    fetchData()
  }

  const spDistribution = [0, 1, 2, 3, 4, 5].map(level => ({
    level, count: hunters.filter(h => h.sp_level === level).length
  }))

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Team Status</h1>
            <p className="text-sm text-slate-500 mt-0.5">SP Level · {getMonthName(month)} {year}</p>
          </div>
          {isAdmin && (
            <button onClick={runAutoCalc} disabled={saving === "auto"}
              className="text-xs px-4 py-2 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition">
              {saving === "auto" ? "Menghitung..." : "Auto-Kalkulasi SP"}
            </button>
          )}
        </div>

        {/* SP Distribution */}
        <div className="grid grid-cols-6 gap-2">
          {spDistribution.map(({ level, count }) => (
            <div key={level} className="rounded-xl p-3 text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className={`text-xs font-bold px-2 py-0.5 rounded-full mb-2 inline-block ${spBadgeColor(level)}`}>SP{level}</div>
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-slate-600">hunter</div>
            </div>
          ))}
        </div>

        {/* SP Info */}
        <div className="rounded-xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-300">Aturan SP Level</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2"><TrendingDown size={12} className="text-green-400" /> Ada closing bulan ini → SP turun 1</div>
            <div className="flex items-center gap-2"><TrendingUp size={12} className="text-red-400" /> Tidak ada closing → SP naik 1</div>
          </div>
        </div>

        {/* Hunter Cards */}
        {loading ? (
          <div className="text-center py-8 text-slate-600 text-sm">Memuat...</div>
        ) : (
          <div className="space-y-2">
            {hunters.map(h => {
              const achievement = pct(h.omset, h.monthly_target)
              const wod = h.win_or_die_target > 0 && h.omset < h.win_or_die_target
              const isExpanded = expanded === h.id
              return (
                <div key={h.id} className={`rounded-xl overflow-hidden ${wod ? "border-red-900/50" : ""}`}
                  style={{ border: `1px solid ${wod ? "#7f1d1d" : "var(--border)"}` }}>
                  <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.02] transition"
                    style={{ background: "var(--surface)" }}
                    onClick={() => setExpanded(isExpanded ? null : h.id)}>
                    {/* SP Badge */}
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${spBadgeColor(h.sp_level)}`}
                      style={{ background: "var(--surface2)" }}>
                      <span className="text-xs font-bold">SP{h.sp_level}</span>
                    </div>
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{h.name}</span>
                        {wod && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Win-or-Die!</span>}
                        {h.hasClosing && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Ada Closing</span>}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-slate-500">{formatRupiah(h.omset)} / {formatRupiah(h.monthly_target)}</span>
                        <span className={`text-xs font-bold ${achievement >= 100 ? "text-green-400" : achievement >= 70 ? "text-blue-400" : "text-red-400"}`}>
                          {achievement}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-slate-800 w-48">
                        <div className="h-1 rounded-full transition-all"
                          style={{ width: `${Math.min(achievement, 100)}%`, background: achievement >= 100 ? "#22c55e" : "#3b82f6" }} />
                      </div>
                    </div>
                    {/* SP Controls (admin only) */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => adjustSP(h.id, -1, h.sp_level, h.sp_history_id)}
                          disabled={h.sp_level <= 0 || saving === h.id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/10 disabled:opacity-30 transition"
                          title="Turunkan SP">
                          <TrendingDown size={14} />
                        </button>
                        <button onClick={() => adjustSP(h.id, 1, h.sp_level, h.sp_history_id)}
                          disabled={h.sp_level >= 5 || saving === h.id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition"
                          title="Naikkan SP">
                          <TrendingUp size={14} />
                        </button>
                      </div>
                    )}
                    <div className="text-slate-600">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-3"
                      style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
                      <div className="rounded-lg p-3" style={{ background: "var(--surface2)" }}>
                        <div className="text-xs text-slate-500 mb-0.5">Win-or-Die Target</div>
                        <div className="text-sm font-semibold text-white">{formatRupiah(h.win_or_die_target)}</div>
                        <div className={`text-xs mt-0.5 ${h.omset >= h.win_or_die_target ? "text-green-400" : "text-red-400"}`}>
                          {h.omset >= h.win_or_die_target ? "Aman" : `Kurang ${formatRupiah(h.win_or_die_target - h.omset)}`}
                        </div>
                      </div>
                      <div className="rounded-lg p-3" style={{ background: "var(--surface2)" }}>
                        <div className="text-xs text-slate-500 mb-0.5">Proyeksi SP Bulan Ini</div>
                        <div className="text-sm font-semibold">
                          {h.hasClosing
                            ? <span className="text-green-400">SP{Math.max(0, h.sp_level - 1)} (turun)</span>
                            : <span className="text-red-400">SP{Math.min(5, h.sp_level + 1)} (naik)</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
