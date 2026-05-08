"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, pct, getMonthName } from "@/lib/utils"
import {
  TrendingUp, MapPin, DollarSign, AlertTriangle, Trophy,
  ChevronLeft, ChevronRight, Users, Activity,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, Legend, PieChart, Pie,
} from "recharts"
import { HUNTER_GROUPS } from "@/lib/hunters"

interface HunterStat {
  id: string
  name: string
  monthly_target: number
  win_or_die_target: number
  visit_target: number
  omset_mtd: number
  omset_ytd: number
  omset_last: number
  visits: number
  rank?: number
}

const PROJECT_LABELS: { key: string; match: RegExp }[] = [
  { key: "CH",       match: /^CH$/i },
  { key: "CT",       match: /^CT$/i },
  { key: "CBA/CRBA", match: /^(CBA|CRBA)$/i },
  { key: "CRTU",     match: /^CRTU$/i },
  { key: "CLH",      match: /^CLH$/i },
  { key: "SCC-HS",   match: /SCC.?HS/i },
  { key: "SCC-VS",   match: /SCC.?VS/i },
]

function StatCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean
}) {
  return (
    <div className="rounded-xl p-5 flex gap-4 items-start"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: accent ? "rgba(232,69,0,0.15)" : "rgba(59,130,246,0.15)" }}>
        <Icon size={18} style={{ color: accent ? "#E84500" : "#60a5fa" }} />
      </div>
      <div>
        <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</div>
        <div className="text-xl font-bold text-white mt-0.5">{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

const ChartTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; fill?: string }[]; label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg p-3 text-xs" style={{ background: "#111827", border: "1px solid #1e2d45" }}>
      <div className="font-semibold text-white mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: p.fill || "#888" }} />
          {p.name}: {p.name === "Visit" || p.name === "Target Visit"
            ? p.value
            : formatRupiah(p.value * 1_000_000)}
        </div>
      ))}
    </div>
  )
}

const now = new Date()

export default function OverviewPage() {
  const { user } = useAuth()
  const [hunters, setHunters] = useState<HunterStat[]>([])
  const [totals, setTotals] = useState({
    omsetMtd: 0, omsetYtd: 0, omsetLast: 0,
    visits: 0, pipeline: 0, pipelineVal: 0,
  })
  const [projectTotals, setProjectTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const lastMonth = month === 1 ? 12 : month - 1
  const lastYear  = month === 1 ? year - 1 : year

  useEffect(() => { if (user) fetchDashboard() }, [user, month, year])

  async function fetchDashboard() {
    setLoading(true)
    try {
      const [usersRes, closingsMtd, closingsYtd, closingsLast, visitsRes, pipelineRes] = await Promise.all([
        supabase.from("users").select("id,name,monthly_target,win_or_die_target,visit_target,status").eq("status", "active"),
        supabase.from("closings").select("user_id,closing_value,project").eq("month", month).eq("year", year),
        supabase.from("closings").select("user_id,closing_value").eq("year", year).lte("month", month),
        supabase.from("closings").select("user_id,closing_value").eq("month", lastMonth).eq("year", lastYear),
        supabase.from("visit_logs").select("user_id,count").eq("month", month).eq("year", year),
        supabase.from("potensi_closing").select("user_id,value,status")
          .not("status", "eq", "closed_lost")
          .not("status", "eq", "closed_won"),
      ])

      const nameToUser: Record<string, { id: string; monthly_target: number; win_or_die_target: number; visit_target: number }> = {}
      ;(usersRes.data || []).forEach(u => { nameToUser[u.name] = u })

      // All roles see ALL hunters on Overview
      const list: HunterStat[] = HUNTER_GROUPS
        .map(group => {
          const hu = nameToUser[group.dbName]
          if (!hu) return null

          const omset_mtd  = (closingsMtd.data  || []).filter(c => c.user_id === hu.id).reduce((s, c) => s + (c.closing_value || 0), 0)
          const omset_ytd  = (closingsYtd.data  || []).filter(c => c.user_id === hu.id).reduce((s, c) => s + (c.closing_value || 0), 0)
          const omset_last = (closingsLast.data || []).filter(c => c.user_id === hu.id).reduce((s, c) => s + (c.closing_value || 0), 0)

          const memberIds = new Set(
            [group.dbName, ...group.spNames].map(n => nameToUser[n]?.id).filter((id): id is string => !!id)
          )
          const visits = (visitsRes.data || []).filter(v => memberIds.has(v.user_id)).reduce((s, v) => s + (v.count || 0), 0)

          return {
            id: hu.id, name: group.name,
            monthly_target: hu.monthly_target,
            win_or_die_target: hu.win_or_die_target,
            visit_target: hu.visit_target,
            omset_mtd, omset_ytd, omset_last, visits,
          }
        })
        .filter((h): h is HunterStat => h !== null)
        .sort((a, b) => pct(b.omset_mtd, b.monthly_target) - pct(a.omset_mtd, a.monthly_target))
        .map((h, i) => ({ ...h, rank: i + 1 }))

      // Project totals (MTD)
      const hunterIds = new Set(HUNTER_GROUPS.map(g => nameToUser[g.dbName]?.id).filter((id): id is string => !!id))
      const projMap: Record<string, number> = {}
      for (const c of (closingsMtd.data || [])) {
        if (!hunterIds.has(c.user_id)) continue
        for (const { key, match } of PROJECT_LABELS) {
          if (match.test(c.project || "")) { projMap[key] = (projMap[key] || 0) + (c.closing_value || 0); break }
        }
      }

      const pipes = pipelineRes.data || []
      setHunters(list)
      setProjectTotals(projMap)
      setTotals({
        omsetMtd:    list.reduce((s, h) => s + h.omset_mtd, 0),
        omsetYtd:    list.reduce((s, h) => s + h.omset_ytd, 0),
        omsetLast:   list.reduce((s, h) => s + h.omset_last, 0),
        visits:      list.reduce((s, h) => s + h.visits, 0),
        pipeline:    pipes.length,
        pipelineVal: pipes.reduce((s, p) => s + (p.value || 0), 0),
      })
    } finally { setLoading(false) }
  }

  const totalTarget = hunters.reduce((s, h) => s + h.monthly_target, 0)
  const mtdGrowth   = totals.omsetLast > 0
    ? Math.round(((totals.omsetMtd - totals.omsetLast) / totals.omsetLast) * 100)
    : null
  const menjual     = hunters.filter(h => h.omset_mtd > 0).length
  const warnHunters = hunters.filter(h => h.win_or_die_target > 0 && h.omset_mtd < h.win_or_die_target)

  const omsetChart = hunters.map(h => ({
    name: h.name.split(" ")[0],
    "Target":    Math.round(h.monthly_target / 1_000_000),
    "Win/Die":   Math.round(h.win_or_die_target / 1_000_000),
    "Realisasi": Math.round(h.omset_mtd / 1_000_000),
  }))

  const visitChart = hunters.map(h => ({
    name: h.name.split(" ")[0],
    "Target Visit": h.visit_target,
    "Visit":        h.visits,
  }))

  const pieData = [
    { name: "Menjual", value: menjual,                          fill: "#E84500" },
    { name: "Belum",   value: Math.max(0, hunters.length - menjual), fill: "#1e293b" },
  ]

  return (
    <DashboardShell>
      <div className="space-y-6">

        {/* Header + Month Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Overview</h1>
            <p className="text-sm text-slate-500 mt-0.5">MASCOL Division · Sales Performance</p>
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

        {/* Hero KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Omset YTD"
            icon={DollarSign} accent
            value={formatRupiah(totals.omsetYtd)}
            sub={`Jan–${getMonthName(month)} ${year}`}
          />
          <StatCard
            label={`Omset MTD — ${getMonthName(month)}`}
            icon={TrendingUp}
            value={formatRupiah(totals.omsetMtd)}
            sub={mtdGrowth !== null
              ? `${mtdGrowth >= 0 ? "+" : ""}${mtdGrowth}% vs ${getMonthName(lastMonth)}`
              : `${pct(totals.omsetMtd, totalTarget)}% dari target`}
          />
          <div className="rounded-xl p-5 flex gap-4 items-start"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-500/15">
              <TrendingUp size={18} className="text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pipeline Aktif</div>
              <div className="text-xl font-bold text-white mt-0.5">{totals.pipeline}</div>
              <div className="text-xs text-slate-500 mt-0.5">{formatRupiah(totals.pipelineVal)}</div>
            </div>
          </div>
          <StatCard label="Total Visit" icon={MapPin} value={totals.visits.toString()} sub={getMonthName(month)} />
          <div className="rounded-xl p-5 flex gap-4 items-start"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-green-500/15">
              <Users size={18} className="text-green-400" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Sales Menjual</div>
              <div className="text-xl font-bold text-white mt-0.5">{menjual} / {hunters.length}</div>
              <div className="text-xs text-slate-500 mt-0.5">hunter aktif bulan ini</div>
            </div>
          </div>
          {/* Mini Pie */}
          <div className="rounded-xl p-4 flex items-center gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <PieChart width={64} height={64}>
              <Pie data={pieData} cx={28} cy={28} innerRadius={18} outerRadius={30} dataKey="value" strokeWidth={0}>
                {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
            </PieChart>
            <div>
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Rasio Penjualan</div>
              <div className="text-xl font-bold text-white mt-0.5">
                {hunters.length > 0 ? Math.round((menjual / hunters.length) * 100) : 0}%
              </div>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className="text-xs flex items-center gap-1 text-slate-300">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#E84500" }} />{menjual} menjual
                </span>
                <span className="text-xs flex items-center gap-1 text-slate-500">
                  <span className="w-2 h-2 rounded-full inline-block bg-slate-700" />{hunters.length - menjual} belum
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Win-or-Die Alert */}
        {warnHunters.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: "#1a0f0f", border: "1px solid #7f1d1d" }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-sm font-semibold text-red-400">Win-or-Die Alert — {getMonthName(month)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {warnHunters.map(h => (
                <div key={h.id} className="text-xs px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-900">
                  {h.name.split(" ")[0]} — {formatRupiah(h.omset_mtd)} / WoD {formatRupiah(h.win_or_die_target)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Omset Chart */}
        {omsetChart.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Activity size={14} style={{ color: "#E84500" }} />
              Capaian Omset per Hunter — {getMonthName(month)} {year} (juta Rp)
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={omsetChart} barCategoryGap="25%" barGap={3}>
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={v => <span style={{ color: "#94a3b8" }}>{v}</span>} />
                <Bar dataKey="Target"    fill="#1e3a5f" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Win/Die"   fill="#7c2d12" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Realisasi" radius={[3, 3, 0, 0]}>
                  {omsetChart.map((e, i) => (
                    <Cell key={i} fill={
                      e["Realisasi"] >= e["Target"]  ? "#22c55e" :
                      e["Realisasi"] >= e["Win/Die"] ? "#E84500" : "#ef4444"
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Visit Chart */}
        {visitChart.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin size={14} className="text-green-400" />
              Capaian Visit per Hunter — {getMonthName(month)} {year}
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={visitChart} barCategoryGap="30%" barGap={4}>
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={v => <span style={{ color: "#94a3b8" }}>{v}</span>} />
                <Bar dataKey="Target Visit" fill="#1e3a5f" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Visit" radius={[3, 3, 0, 0]}>
                  {visitChart.map((e, i) => (
                    <Cell key={i} fill={e["Visit"] >= e["Target Visit"] ? "#22c55e" : "#E84500"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Project Omset (MTD) */}
        {Object.keys(projectTotals).length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Omset per Proyek — {getMonthName(month)} {year}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {PROJECT_LABELS.map(({ key }) => (
                <div key={key} className="rounded-xl p-4"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{key}</div>
                  <div className="text-sm font-bold text-white mt-1">{formatRupiah(projectTotals[key] || 0)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Ranking */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ background: "var(--surface)" }}>
            <Trophy size={15} className="text-yellow-400" />
            <h2 className="text-sm font-semibold text-white">Ranking Performa — {getMonthName(month)} {year}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Nama</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium whitespace-nowrap">Target</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium whitespace-nowrap">Win/Die</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Realisasi</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium whitespace-nowrap">Omset %</th>
                  <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium whitespace-nowrap">WoD %</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat data...</td></tr>
                ) : hunters.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-600 text-xs">Belum ada data</td></tr>
                ) : hunters.map(h => {
                  const revPct = pct(h.omset_mtd, h.monthly_target)
                  const wodPct = h.win_or_die_target > 0 ? pct(h.omset_mtd, h.win_or_die_target) : null
                  const wod    = h.win_or_die_target > 0 && h.omset_mtd < h.win_or_die_target
                  return (
                    <tr key={h.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        background: wod ? "rgba(220,38,38,0.04)" : "transparent",
                      }}
                      className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-slate-500 text-xs font-bold">{h.rank}</td>
                      <td className="px-4 py-3 font-medium text-white text-xs">{h.name}</td>
                      <td className="px-4 py-3 text-right text-slate-400 text-xs">{formatRupiah(h.monthly_target)}</td>
                      <td className="px-4 py-3 text-right text-slate-500 text-xs">
                        {h.win_or_die_target > 0 ? formatRupiah(h.win_or_die_target) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-xs"
                        style={{ color: h.omset_mtd >= h.monthly_target ? "#22c55e" : "#f1f5f9" }}>
                        {formatRupiah(h.omset_mtd)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          revPct >= 100 ? "bg-green-500/20 text-green-400" :
                          revPct >= 70  ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                        }`}>{revPct}%</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {wodPct !== null ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            wodPct >= 100 ? "bg-green-500/20 text-green-400" :
                            wodPct >= 70  ? "bg-orange-500/20 text-orange-400" : "bg-red-500/20 text-red-400"
                          }`}>{wodPct}%</span>
                        ) : <span className="text-slate-700 text-xs">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardShell>
  )
}
