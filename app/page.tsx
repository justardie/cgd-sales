"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, pct, getMonthName, spBadgeColor } from "@/lib/utils"
import { TrendingUp, MapPin, DollarSign, Users, AlertTriangle, Trophy, ChevronLeft, ChevronRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface HunterStat {
  id: string; name: string; monthly_target: number; win_or_die_target: number
  visit_target: number; omset: number; visits: number; sp_level: number; rank?: number
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="rounded-xl p-5 flex gap-4 items-start"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
        <div className="text-xl font-bold text-white mt-0.5">{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 text-xs" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <div className="font-semibold text-white mb-1">{label}</div>
      {payload.map(p => <div key={p.name} className="text-slate-300">{p.name}: {formatRupiah(p.value)}</div>)}
    </div>
  )
}

const now = new Date()

export default function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const [hunters, setHunters] = useState<HunterStat[]>([])
  const [totals, setTotals] = useState({ omset: 0, visits: 0, pipeline: 0, pipelineVal: 0 })
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  useEffect(() => { if (user) fetchDashboard() }, [user, month, year])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  async function fetchDashboard() {
    setLoading(true)
    try {
      const [usersRes, closingsRes, visitsRes, pipelineRes, teamRes] = await Promise.all([
        supabase.from("users").select("id,name,role,monthly_target,win_or_die_target,visit_target,status").eq("status", "active"),
        supabase.from("closings").select("user_id,closing_value").eq("month", month).eq("year", year),
        supabase.from("visit_logs").select("user_id,count").eq("month", month).eq("year", year),
        supabase.from("pipeline").select("user_id,value,status").not("status", "eq", "closed_lost"),
        supabase.from("team_status_history").select("user_id,sp_level").eq("month", month).eq("year", year),
      ])

      // Exclude admin from rankings — show ALL sales users (SL + SM), regardless of target amount
      const salesUsers = (usersRes.data || []).filter(u => u.role !== "admin")
      const visibleUsers = isAdmin ? salesUsers : salesUsers.filter(u => u.id === user!.id)

      const omsetMap: Record<string, number> = {}
      ;(closingsRes.data || []).forEach(c => { omsetMap[c.user_id] = (omsetMap[c.user_id] || 0) + (c.closing_value || 0) })

      const visitMap: Record<string, number> = {}
      ;(visitsRes.data || []).forEach(v => { visitMap[v.user_id] = (visitMap[v.user_id] || 0) + (v.count || 0) })

      const spMap: Record<string, number> = {}
      ;(teamRes.data || []).forEach(t => { spMap[t.user_id] = t.sp_level })

      const list: HunterStat[] = visibleUsers.map(u => ({
        id: u.id, name: u.name, monthly_target: u.monthly_target,
        win_or_die_target: u.win_or_die_target, visit_target: u.visit_target,
        omset: omsetMap[u.id] || 0, visits: visitMap[u.id] || 0, sp_level: spMap[u.id] ?? 0,
      })).sort((a, b) => pct(b.omset, b.monthly_target) - pct(a.omset, a.monthly_target))
        .map((h, i) => ({ ...h, rank: i + 1 }))

      const pipelineRows = (pipelineRes.data || []).filter(p => isAdmin || p.user_id === user!.id)

      setHunters(list)
      setTotals({
        omset: list.reduce((s, h) => s + h.omset, 0),
        visits: list.reduce((s, h) => s + h.visits, 0),
        pipeline: pipelineRows.length,
        pipelineVal: pipelineRows.reduce((s, p) => s + (p.value || 0), 0),
      })
    } finally { setLoading(false) }
  }

  const totalTarget = hunters.reduce((s, h) => s + h.monthly_target, 0)
  const warnHunters = hunters.filter(h => h.win_or_die_target > 0 && h.omset < h.win_or_die_target)
  const chartData = hunters.map(h => ({
    name: h.name.split(" ")[0],
    Target: Math.round(h.monthly_target / 1_000_000),
    Aktual: Math.round(h.omset / 1_000_000),
  }))

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header + Month Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">MASCOL Division</p>
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

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Omset" icon={DollarSign} color="bg-blue-500/20 text-blue-400"
            value={formatRupiah(totals.omset)} sub={`${pct(totals.omset, totalTarget)}% dari target`} />
          <StatCard label="Total Visit" icon={MapPin} color="bg-green-500/20 text-green-400"
            value={totals.visits.toString()} sub={getMonthName(month)} />
          <StatCard label="Pipeline Aktif" icon={TrendingUp} color="bg-purple-500/20 text-purple-400"
            value={totals.pipeline.toString()} sub={formatRupiah(totals.pipelineVal)} />
          <StatCard label="Hunter Aktif" icon={Users} color="bg-orange-500/20 text-orange-400"
            value={hunters.length.toString()}
            sub={`${hunters.filter(h => h.omset >= h.monthly_target).length} capai target`} />
        </div>

        {/* Win-or-Die Alert */}
        {warnHunters.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: "#1a0f0f", border: "1px solid #7f1d1d" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-sm font-semibold text-red-400">Win-or-Die Alert</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {warnHunters.map(h => (
                <div key={h.id} className="text-xs px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-900">
                  {h.name} — {formatRupiah(h.omset)} / {formatRupiah(h.win_or_die_target)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart — admin only */}
        {isAdmin && chartData.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-semibold text-white mb-4">
              Omset vs Target — {getMonthName(month)} {year} (juta Rp)
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="Target" fill="#1e3a5f" radius={[4, 4, 0, 0]} name="Target" />
                <Bar dataKey="Aktual" radius={[4, 4, 0, 0]} name="Aktual">
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.Aktual >= entry.Target ? "#22c55e" : entry.Aktual >= entry.Target * 0.7 ? "#3b82f6" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Rankings — sales only, no admin */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ background: "var(--surface)" }}>
            <Trophy size={15} className="text-yellow-400" />
            <h2 className="text-sm font-semibold text-white">Ranking Performa — {getMonthName(month)} {year}</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium w-8">#</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Nama</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Target</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Realisasi</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">%</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Visit</th>
                <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">SP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat data...</td></tr>
              ) : !hunters.length ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-600 text-xs">Belum ada data bulan ini</td></tr>
              ) : hunters.map(h => {
                const ach = pct(h.omset, h.monthly_target)
                return (
                  <tr key={h.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-slate-500 text-xs font-bold">{h.rank}</td>
                    <td className="px-4 py-3 font-medium text-white text-xs">{h.name}</td>
                    <td className="px-4 py-3 text-right text-slate-400 text-xs">{formatRupiah(h.monthly_target)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-xs"
                      style={{ color: h.omset >= h.monthly_target ? "#22c55e" : "#f1f5f9" }}>
                      {formatRupiah(h.omset)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        ach >= 100 ? "bg-green-500/20 text-green-400" :
                        ach >= 70 ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                      }`}>{ach}%</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 text-xs">{h.visits}/{h.visit_target}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${spBadgeColor(h.sp_level)}`}>
                        {h.sp_level > 0 ? `SP${h.sp_level}` : "—"}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  )
}
