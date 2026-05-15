"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, pct, getMonthName, normalizeProject, PROJECT_NAMES } from "@/lib/utils"
import {
  TrendingUp, MapPin, DollarSign, AlertTriangle, Trophy,
  Users, Activity, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
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


/* ─── Circular Ring Gauge ───────────────────────── */
function CircleRing({ pct: p, color }: { pct: number; color: string }) {
  const r = 30, size = 76
  const cx = size / 2, cy = size / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.min(1, Math.max(0, p))
  const offset = circumference * (1 - clamped)
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${color}18`} strokeWidth="9" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ filter: `drop-shadow(0 0 5px ${color}55)`, transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  )
}

/* ─── Gauge Card ────────────────────────────────── */
function GaugeCard({ label, value, sub, achievement, icon: Icon, accentColor }: {
  label: string; value: string; sub?: string; achievement: number
  icon: React.ElementType; accentColor?: string
}) {
  const p = Math.min(1, Math.max(0, achievement))
  const pctNum = Math.round(p * 100)
  const col = accentColor ?? (p >= 1 ? "#22c55e" : p >= 0.7 ? "#FF6A3D" : "#ef4444")
  return (
    <div className="rounded-2xl p-5 flex gap-4 items-center" style={{
      background: `linear-gradient(145deg, var(--surface) 0%, var(--surface2) 100%)`,
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-md)",
    }}>
      {/* Ring with % centered */}
      <div style={{ position: "relative", width: 76, height: 76, flexShrink: 0 }}>
        <CircleRing pct={p} color={col} />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "16px", fontWeight: 900, color: col, lineHeight: 1 }}>{pctNum}%</span>
        </div>
      </div>
      {/* Text */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${col}18`, border: `1px solid ${col}25` }}>
            <Icon size={12} style={{ color: col }} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest truncate" style={{ color: "var(--text-muted)" }}>
            {label}
          </span>
        </div>
        <div className="font-bold text-base truncate" style={{ color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
          {value}
        </div>
        {sub && <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</div>}
      </div>
    </div>
  )
}

/* ─── Flat Stat Card ────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color?: string
}) {
  const col = color ?? "var(--accent)"
  return (
    <div className="rounded-2xl p-5 flex gap-4 items-start" style={{
      background: `linear-gradient(145deg, var(--surface) 0%, var(--surface2) 100%)`,
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-md)",
    }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${col}18`, border: `1px solid ${col}20` }}>
        <Icon size={18} style={{ color: col }} />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          {label}
        </div>
        <div className="text-xl font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{value}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</div>}
      </div>
    </div>
  )
}

const ChartTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; fill?: string }[]; label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl p-3 text-xs" style={{
      background: "var(--surface)",
      border: "1px solid var(--border-medium)",
      boxShadow: "var(--shadow-lg)",
    }}>
      <div className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
          <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: p.fill || "#888" }} />
          {p.name}: {p.name === "Visit" || p.name === "Target Visit"
            ? p.value
            : formatRupiah(p.value * 1_000_000)}
        </div>
      ))}
    </div>
  )
}

const Swatch = ({ color }: { color: string }) => (
  <span style={{
    display: "inline-block", width: 10, height: 10,
    borderRadius: 3, background: color, flexShrink: 0,
  }} />
)

const OmsetLegend = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", fontSize: 11, paddingTop: 8 }}>
    <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
      <Swatch color="rgba(59,130,246,0.50)" /> Target
    </span>
    <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
      <Swatch color="#22c55e" /> ≥ Target
    </span>
    <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
      <Swatch color="#FF6A3D" /> 70–99%
    </span>
    <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
      <Swatch color="#ef4444" /> &lt; 70%
    </span>
  </div>
)

const VisitLegend = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", fontSize: 11, paddingTop: 8 }}>
    <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
      <Swatch color="rgba(59,130,246,0.50)" /> Target Visit
    </span>
    <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
      <Swatch color="#22c55e" /> Tercapai
    </span>
    <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
      <Swatch color="#FF6A3D" /> Belum Capai
    </span>
  </div>
)

const now = new Date()

export default function OverviewPage() {
  const { user } = useAuth()
  const [hunters, setHunters] = useState<HunterStat[]>([])
  const [totals, setTotals] = useState({
    omsetMtd: 0, omsetYtd: 0, omsetLast: 0,
    visits: 0, visitTarget: 0,
    pipeline: 0, pipelineVal: 0,
    spMenjual: 0, totalActiveSps: 0,
  })
  const [projectTotals, setProjectTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [showCharts, setShowCharts] = useState(true)

  const [ytdMode,    setYtdMode]    = useState(false)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const lastMonth = month === 1 ? 12 : month - 1
  const lastYear  = month === 1 ? year - 1 : year

  useEffect(() => { if (user) fetchDashboard() }, [user, month, year])

  async function fetchDashboard() {
    setLoading(true)
    try {
      const [usersRes, closingsMtd, closingsYtd, closingsLast, visitsRes, pipelineRes, activeSpsRes] = await Promise.all([
        supabase.from("users").select("id,name,monthly_target,win_or_die_target,visit_target,status,role").eq("status", "active"),
        supabase.from("konsumen").select("user_id,nilai_hjr,project,sales_person,sales_hunter").eq("status", "closing").eq("closing_month", month).eq("closing_year", year),
        supabase.from("konsumen").select("user_id,nilai_hjr,sales_hunter").eq("status", "closing").eq("closing_year", year).lte("closing_month", month),
        supabase.from("konsumen").select("user_id,nilai_hjr,sales_hunter").eq("status", "closing").eq("closing_month", lastMonth).eq("closing_year", lastYear),
        supabase.from("visit_logs").select("user_id,count").eq("month", month).eq("year", year),
        supabase.from("konsumen").select("user_id,potensi_closing,status").in("status", ["warm", "hot", "tidak_potensial"]),
        supabase.from("users").select("name").eq("role", "sales_person").eq("status", "active"),
      ])

      const allUsers = usersRes.data || []
      const nameToUser: Record<string, { id: string; monthly_target: number; win_or_die_target: number; visit_target: number }> = {}
      allUsers.forEach(u => {
        nameToUser[u.name] = u
        nameToUser[u.name.toLowerCase()] = u
      })

      const list: HunterStat[] = HUNTER_GROUPS
        .map(group => {
          const hu = nameToUser[group.dbName]
            ?? nameToUser[group.dbName.toLowerCase()]
            ?? nameToUser[group.name]
            ?? nameToUser[group.name.toLowerCase()]
            ?? allUsers.find(u =>
                u.name.toLowerCase().includes(group.dbName.toLowerCase()) ||
                group.dbName.toLowerCase().includes(u.name.toLowerCase())
              )
          if (!hu) return null

          const omset_mtd  = (closingsMtd.data  || []).filter(c => c.sales_hunter === group.dbName).reduce((s, c) => s + (c.nilai_hjr || 0), 0)
          const omset_ytd  = (closingsYtd.data  || []).filter(c => c.sales_hunter === group.dbName).reduce((s, c) => s + (c.nilai_hjr || 0), 0)
          const omset_last = (closingsLast.data || []).filter(c => c.sales_hunter === group.dbName).reduce((s, c) => s + (c.nilai_hjr || 0), 0)

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

      // Project totals (MTD) — all closings, no hunter filter
      const projMap: Record<string, number> = {}
      for (const c of (closingsMtd.data || [])) {
        const proj = normalizeProject(c.project)
        if (proj) projMap[proj] = (projMap[proj] || 0) + (c.nilai_hjr || 0)
      }

      // SP menjual: count distinct active SPs who had a closing this month
      const activeSpNames = new Set((activeSpsRes.data || []).map(u => (u.name || "").toLowerCase().trim()))
      const totalActiveSps = (activeSpsRes.data || []).length
      const spMenjual = new Set(
        (closingsMtd.data || [])
          .map(c => (c.sales_person || "").toLowerCase().trim())
          .filter(n => n && activeSpNames.has(n))
      ).size

      // Total visit (all users) and total visit target (all active users)
      const totalVisits = (visitsRes.data || []).reduce((s, v) => s + (v.count || 0), 0)
      const totalVisitTarget = allUsers.reduce((s, u) => s + (u.visit_target || 0), 0)

      const pipes = pipelineRes.data || []
      setHunters(list)
      setProjectTotals(projMap)
      setTotals({
        omsetMtd:    (closingsMtd.data  || []).reduce((s, c) => s + (c.nilai_hjr || 0), 0),
        omsetYtd:    (closingsYtd.data  || []).reduce((s, c) => s + (c.nilai_hjr || 0), 0),
        omsetLast:   (closingsLast.data || []).reduce((s, c) => s + (c.nilai_hjr || 0), 0),
        visits:      totalVisits,
        visitTarget: totalVisitTarget,
        pipeline:    pipes.length,
        pipelineVal: pipes.reduce((s, p) => s + (p.potensi_closing || 0), 0),
        spMenjual, totalActiveSps,
      })
    } finally { setLoading(false) }
  }

  const totalTarget = hunters.reduce((s, h) => s + h.monthly_target, 0)
  const mtdGrowth   = totals.omsetLast > 0
    ? Math.round(((totals.omsetMtd - totals.omsetLast) / totals.omsetLast) * 100)
    : null
  const warnHunters = hunters.filter(h => h.win_or_die_target > 0 && h.omset_mtd < h.win_or_die_target)
  const wodHunters  = hunters.filter(h => h.win_or_die_target > 0)

  const omsetChart = hunters.map(h => ({
    name: h.name.split(" ")[0],
    "Target":    Math.round((ytdMode ? h.monthly_target * (now.getMonth() + 1) : h.monthly_target) / 1_000_000),
    "Realisasi": Math.round((ytdMode ? h.omset_ytd : h.omset_mtd) / 1_000_000),
  }))

  const visitChart = hunters.map(h => ({
    name: h.name.split(" ")[0],
    "Target Visit": h.visit_target,
    "Visit":        h.visits,
  }))

  return (
    <DashboardShell>
      <div className="space-y-6">

        {/* Greeting */}
        <div className="greeting-block">
          <h1 className="greeting-title">
            {(() => {
              const h = new Date().getHours()
              const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
              return `${g}, ${user?.name?.split(" ")[0] ?? ""}!`
            })()}
          </h1>
          <p className="greeting-sub">Welcome to CGD Sales Command Center.</p>
          <div className="greeting-live">
            <span className="live-dot" />
            Live data
          </div>
        </div>

        {/* Month / YTD Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            MASCOL Division · Sales Performance
          </p>
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
          </div>
        </div>

        {/* Hero KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card-enter-1 kpi-card">
            <StatCard label="Omset YTD" icon={TrendingUp}
              value={formatRupiah(totals.omsetYtd)}
              sub={`Jan–${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}`}
              color="#FF6A3D" />
          </div>
          <div className="card-enter-2 kpi-card">
            <GaugeCard label="Omset MTD" icon={DollarSign}
              value={formatRupiah(totals.omsetMtd)}
              sub={`Target ${formatRupiah(totalTarget)}`}
              achievement={totalTarget > 0 ? totals.omsetMtd / totalTarget : 0} />
          </div>
          <div className="card-enter-3 kpi-card">
            <StatCard label="Pipeline Aktif" icon={Activity}
              value={totals.pipeline.toString()}
              sub={formatRupiah(totals.pipelineVal)}
              color="#8b5cf6" />
          </div>
          <div className="card-enter-4 kpi-card">
            <GaugeCard label="Total Visit" icon={MapPin}
              value={`${totals.visits} visit`}
              sub={`Target ${totals.visitTarget} · ${getMonthName(month)}`}
              achievement={totals.visitTarget > 0 ? totals.visits / totals.visitTarget : 0}
              accentColor="#3b82f6" />
          </div>
          <div className="card-enter-5 kpi-card">
            <GaugeCard label="Sales Person Aktif" icon={Users}
              value={`${totals.spMenjual} / ${totals.totalActiveSps}`}
              sub="menjual bulan ini"
              achievement={totals.totalActiveSps > 0 ? totals.spMenjual / totals.totalActiveSps : 0}
              accentColor="#10b981" />
          </div>
          <div className="card-enter-6 kpi-card">
            <StatCard label={`vs ${getMonthName(lastMonth)}`} icon={TrendingUp}
              value={mtdGrowth !== null ? `${mtdGrowth >= 0 ? "+" : ""}${mtdGrowth}%` : "—"}
              sub={mtdGrowth !== null
                ? `${mtdGrowth >= 0 ? "Naik" : "Turun"} dari bulan lalu`
                : "Belum ada data bulan lalu"}
              color={mtdGrowth !== null && mtdGrowth >= 0 ? "#22c55e" : "#ef4444"} />
          </div>
        </div>

        {/* Win-or-Die Alert */}
        {wodHunters.length > 0 && (
          <div className="rounded-2xl overflow-hidden relative section-fade-1" style={{
            background: "linear-gradient(145deg, var(--surface) 0%, var(--surface2) 100%)",
            border: "1px solid rgba(239,68,68,0.35)",
            boxShadow: "0 0 32px rgba(239,68,68,0.06), var(--shadow-md)",
          }}>
            <div className="relative flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.28)" }}>
                  <AlertTriangle size={15} style={{ color: "#f87171" }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-wide" style={{ color: "#f87171", letterSpacing: "0.05em" }}>
                    WIN-OR-DIE ALERT
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {getMonthName(month)} {year} · {warnHunters.length} belum capai · {wodHunters.length - warnHunters.length} sudah capai
                  </div>
                </div>
              </div>
              <div className="text-3xl font-black" style={{ color: "rgba(239,68,68,0.55)", letterSpacing: "-2px" }}>
                {warnHunters.length}
              </div>
            </div>
            <div className="relative px-6 pb-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[...wodHunters]
                .sort((a, b) => {
                  const pa = a.win_or_die_target > 0 ? a.omset_mtd / a.win_or_die_target : 0
                  const pb = b.win_or_die_target > 0 ? b.omset_mtd / b.win_or_die_target : 0
                  return pa - pb
                })
                .map(h => {
                const progress = h.win_or_die_target > 0
                  ? Math.min(100, Math.round((h.omset_mtd / h.win_or_die_target) * 100))
                  : 0
                const achieved = progress >= 100
                const urgent   = !achieved && progress < 50
                const barColor  = achieved
                  ? "linear-gradient(90deg, #16a34a, #22c55e)"
                  : urgent
                    ? "linear-gradient(90deg, #dc2626, #ef4444)"
                    : "linear-gradient(90deg, #d97706, #f59e0b)"
                const borderColor = achieved ? "rgba(34,197,94,0.28)" : urgent ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.22)"
                const pctColor    = achieved ? "#4ade80" : urgent ? "#f87171" : "#fbbf24"
                return (
                  <div key={h.id} className="rounded-xl p-3" style={{
                    background: "var(--surface2)",
                    border: `1px solid ${borderColor}`,
                  }}>
                    <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                      {h.name.split(" ")[0]}
                    </div>
                    <div className="text-base font-black mb-0.5" style={{ color: "var(--text-primary)" }}>
                      {formatRupiah(h.omset_mtd)}
                    </div>
                    <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                      Target: {formatRupiah(h.win_or_die_target)}
                    </div>
                    <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(progress, 100)}%`,
                        background: barColor,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                    <div className="text-xs font-bold" style={{ color: pctColor }}>
                      {progress}%
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Charts Section — collapsible */}
        <div className="rounded-2xl overflow-hidden section-fade-2" style={{
          background: "linear-gradient(145deg, var(--surface) 0%, var(--surface2) 100%)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}>
          <button
            className="w-full flex items-center justify-between px-5 py-4"
            onClick={() => setShowCharts(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Activity size={14} style={{ color: "var(--accent)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Grafik Performa — {ytdMode ? `Jan–${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}` : `${getMonthName(month)} ${year}`}
              </span>
            </div>
            {showCharts
              ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} />
              : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
          </button>

          <div className={`expand-panel ${showCharts ? "open" : "closed"}`} style={{ borderTop: "1px solid var(--border)" }}>
            <div className="px-5 pb-5 space-y-6">
              {omsetChart.length > 0 && (
                <div className="pt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                    Capaian Omset per Hunter (juta Rp)
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={omsetChart} barCategoryGap="25%" barGap={3}>
                      <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                      <Legend content={<OmsetLegend />} />
                      <Bar dataKey="Target"    fill="rgba(59,130,246,0.50)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Realisasi" radius={[4, 4, 0, 0]}>
                        {omsetChart.map((e, i) => (
                          <Cell key={i} fill={
                            e["Realisasi"] >= e["Target"] ? "#22c55e" :
                            e["Realisasi"] >= e["Target"] * 0.7 ? "#FF6A3D" : "#ef4444"
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {visitChart.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                    Capaian Visit per Hunter
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={visitChart} barCategoryGap="30%" barGap={4}>
                      <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                      <Legend content={<VisitLegend />} />
                      <Bar dataKey="Target Visit" fill="rgba(59,130,246,0.50)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Visit" radius={[4, 4, 0, 0]}>
                        {visitChart.map((e, i) => (
                          <Cell key={i} fill={e["Visit"] >= e["Target Visit"] ? "#22c55e" : "#FF6A3D"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Omset */}
        {Object.keys(projectTotals).length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              Omset per Proyek — {ytdMode ? `YTD ${now.getFullYear()}` : `${getMonthName(month)} ${year}`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PROJECT_NAMES.map((key, idx) => (
                <div key={key} className={`rounded-2xl p-4 kpi-card card-enter-${Math.min(idx + 1, 6)}`} style={{
                  background: `linear-gradient(145deg, var(--surface) 0%, var(--surface2) 100%)`,
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}>
                  <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{key}</div>
                  <div className="text-sm font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                    {formatRupiah(projectTotals[key] || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ranking */}
        <div className="rounded-2xl overflow-hidden section-fade-3" style={{
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{
            background: `linear-gradient(145deg, var(--surface) 0%, var(--surface2) 100%)`,
            borderBottom: "1px solid var(--border)",
          }}>
            <Trophy size={15} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Ranking Performa — {ytdMode ? `Jan–${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}` : `${getMonthName(month)} ${year}`}
            </h2>
          </div>
          <div className="overflow-x-auto" style={{ background: "var(--surface)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest w-8" style={{ color: "var(--text-muted)" }}>#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Nama</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Target</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Win/Die</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Realisasi</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: "var(--text-muted)" }}>Omset %</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest whitespace-nowrap" style={{ color: "var(--text-muted)" }}>WoD %</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>Memuat data...</td></tr>
                ) : hunters.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>Belum ada data</td></tr>
                ) : hunters.map((h, rowIdx) => {
                  const ytdM       = now.getMonth() + 1
                  const omsetDisp  = ytdMode ? h.omset_ytd : h.omset_mtd
                  const targetDisp = ytdMode ? h.monthly_target * ytdM : h.monthly_target
                  const wodDisp    = ytdMode ? h.win_or_die_target * ytdM : h.win_or_die_target
                  const revPct = pct(omsetDisp, targetDisp)
                  const wodPct = wodDisp > 0 ? pct(omsetDisp, wodDisp) : null
                  const wod    = wodDisp > 0 && omsetDisp < wodDisp
                  return (
                    <tr key={h.id} className={`row-enter row-enter-${Math.min(rowIdx + 1, 8)}`} style={{
                      borderBottom: "1px solid var(--border)",
                      background: wod ? "rgba(220,38,38,0.04)" : "transparent",
                    }}>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: "var(--text-muted)" }}>{h.rank}</td>
                      <td className="px-4 py-3 font-semibold text-xs" style={{ color: "var(--text-primary)" }}>
                        {h.name}
                      </td>
                      <td className="px-4 py-3 text-right text-xs" style={{ color: "var(--text-muted)" }}>{formatRupiah(targetDisp)}</td>
                      <td className="px-4 py-3 text-right text-xs" style={{ color: "var(--text-muted)" }}>
                        {wodDisp > 0 ? formatRupiah(wodDisp) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                        {formatRupiah(omsetDisp)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold" style={{
                        color: revPct >= 100 ? "#22c55e" : revPct >= 70 ? "#FF6A3D" : "#ef4444"
                      }}>
                        {revPct}%
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold" style={{
                        color: wodPct === null ? "var(--text-muted)"
                          : wodPct >= 100 ? "#22c55e" : wodPct >= 70 ? "#FF6A3D" : "#ef4444"
                      }}>
                        {wodPct !== null ? `${wodPct}%` : "—"}
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
