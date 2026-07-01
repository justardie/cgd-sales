"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, pct, getMonthName, normalizeProject, PROJECT_NAMES, TEAM_MONTHLY_TARGET } from "@/lib/utils"
import {
  TrendingUp, DollarSign, AlertTriangle, Trophy,
  Users, Activity,
} from "lucide-react"
import { HUNTER_GROUPS } from "@/lib/hunters"

interface HunterStat {
  id: string
  name: string
  monthly_target: number
  win_or_die_target: number
  visit_target: number
  omset_mtd: number
  omset_current_month: number
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
  const [topHunter, setTopHunter] = useState<{ name: string; omset: number; pct: number } | null>(null)
  const [topSales, setTopSales]   = useState<{ name: string; omset: number } | null>(null)
  const [projectTotals, setProjectTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())

  // dateMode: "today" | "mtd" | "ytd" | "custom"
  const [dateMode, setDateMode] = useState<"today" | "mtd" | "ytd" | "custom">("mtd")
  const [customFrom, setCustomFrom] = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const [customTo,   setCustomTo]   = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const [customPopOpen, setCustomPopOpen] = useState(false)
  const [customFromTemp, setCustomFromTemp] = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const [customToTemp,   setCustomToTemp]   = useState({ month: now.getMonth() + 1, year: now.getFullYear() })
  const customPopRef = useRef<HTMLDivElement>(null)

  // Close custom popover on outside click
  useEffect(() => {
    if (!customPopOpen) return
    function handler(e: MouseEvent) {
      if (customPopRef.current && !customPopRef.current.contains(e.target as Node)) {
        setCustomPopOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [customPopOpen])

  const ytdMode = dateMode === "ytd"

  const effMonth = dateMode === "today" || dateMode === "mtd" ? now.getMonth() + 1 : month
  const effYear  = dateMode === "today" || dateMode === "mtd" ? now.getFullYear()  : year
  const lastMonth = effMonth === 1 ? 12 : effMonth - 1
  const lastYear  = effMonth === 1 ? effYear - 1 : effYear

  const fetchDashboard = useCallback(async () => {
    try {
      // Build primary closings query based on mode
      let closingsPrimaryQ = supabase.from("konsumen").select("user_id,nilai_hjr,project,sales_person,sales_hunter").eq("status", "closing")
      if (dateMode === "today" || dateMode === "mtd") {
        closingsPrimaryQ = closingsPrimaryQ.eq("closing_month", effMonth).eq("closing_year", effYear)
      } else if (dateMode === "ytd") {
        closingsPrimaryQ = closingsPrimaryQ.eq("closing_year", effYear).lte("closing_month", effMonth)
      } else {
        // custom — range of months
        if (customFrom.year === customTo.year) {
          closingsPrimaryQ = closingsPrimaryQ.eq("closing_year", customFrom.year).gte("closing_month", customFrom.month).lte("closing_month", customTo.month)
        } else {
          // multi-year: include all in between (simplified: from..to year/month)
          closingsPrimaryQ = closingsPrimaryQ.gte("closing_year", customFrom.year).lte("closing_year", customTo.year)
        }
      }

      const [usersRes, closingsMtd, closingsCurrentMonth, closingsYtd, closingsLast, pipelineRes, activeSpsRes] = await Promise.all([
        supabase.from("users").select("id,name,monthly_target,win_or_die_target,visit_target,status,role,hunter_name").eq("status", "active"),
        closingsPrimaryQ,
        supabase.from("konsumen").select("user_id,nilai_hjr,project,sales_person,sales_hunter").eq("status", "closing").eq("closing_month", now.getMonth() + 1).eq("closing_year", now.getFullYear()),
        supabase.from("konsumen").select("user_id,nilai_hjr,sales_hunter").eq("status", "closing").eq("closing_year", effYear).lte("closing_month", effMonth),
        supabase.from("konsumen").select("user_id,nilai_hjr,sales_hunter").eq("status", "closing").eq("closing_month", lastMonth).eq("closing_year", lastYear),
        supabase.from("konsumen").select("user_id,potensi_closing,status").eq("status", "hot").or("board.eq.pipeline,board.is.null"),
        supabase.from("users").select("name").eq("role", "sales_person").eq("status", "active"),
      ])

      const allUsers = usersRes.data || []
      const nameToUser: Record<string, { id: string; monthly_target: number; win_or_die_target: number; visit_target: number }> = {}
      // Build DB-driven hunter → SP names map (replaces hardcoded spNames)
      const hunterSpByDbName: Record<string, string[]> = {}
      allUsers.forEach(u => {
        nameToUser[u.name] = u
        nameToUser[u.name.toLowerCase()] = u
        if ((u as { hunter_name?: string | null }).hunter_name) {
          const hn = (u as { hunter_name: string }).hunter_name
          if (!hunterSpByDbName[hn]) hunterSpByDbName[hn] = []
          hunterSpByDbName[hn].push(u.name)
        }
      })

      // Top Performers: best hunter + best sales person by MTD omset
      const hunterUsers = allUsers.filter((u: { role: string }) => u.role === "hunter")
      const spUsers     = allUsers.filter((u: { role: string }) => u.role === "sales_person")
      const mtdData = closingsCurrentMonth.data || []

      const hunterOmset: Record<string, number> = {}
      mtdData.forEach(c => {
        if (c.sales_hunter) hunterOmset[c.sales_hunter] = (hunterOmset[c.sales_hunter] || 0) + (c.nilai_hjr || 0)
      })
      let bestHunter: { name: string; omset: number; pct: number } | null = null
      hunterUsers.forEach((u: { name: string; monthly_target: number }) => {
        const o = hunterOmset[u.name] || 0
        if (!bestHunter || o > bestHunter.omset) {
          bestHunter = { name: u.name, omset: o, pct: u.monthly_target > 0 ? Math.round((o / u.monthly_target) * 100) : 0 }
        }
      })
      setTopHunter(bestHunter)

      const spOmset: Record<string, number> = {}
      mtdData.forEach(c => {
        if (c.sales_person) spOmset[c.sales_person] = (spOmset[c.sales_person] || 0) + (c.nilai_hjr || 0)
      })
      let bestSp: { name: string; omset: number } | null = null
      spUsers.forEach((u: { name: string }) => {
        const o = spOmset[u.name] || 0
        if (!bestSp || o > bestSp.omset) {
          bestSp = { name: u.name, omset: o }
        }
      })
      setTopSales(bestSp)

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
          const omset_current_month = (closingsCurrentMonth.data || []).filter(c => c.sales_hunter === group.dbName).reduce((s, c) => s + (c.nilai_hjr || 0), 0)
          const omset_ytd  = (closingsYtd.data  || []).filter(c => c.sales_hunter === group.dbName).reduce((s, c) => s + (c.nilai_hjr || 0), 0)
          const omset_last = (closingsLast.data || []).filter(c => c.sales_hunter === group.dbName).reduce((s, c) => s + (c.nilai_hjr || 0), 0)

          return {
            id: hu.id, name: group.name,
            monthly_target: hu.monthly_target,
            win_or_die_target: hu.win_or_die_target,
            visit_target: hu.visit_target,
            omset_mtd, omset_current_month, omset_ytd, omset_last, visits: 0,
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
        (closingsCurrentMonth.data || [])
          .map(c => (c.sales_person || "").toLowerCase().trim())
          .filter(n => n && activeSpNames.has(n))
      ).size

      const pipes = pipelineRes.data || []
      setHunters(list)
      setProjectTotals(projMap)
      setTotals({
        omsetMtd:    (closingsMtd.data  || []).reduce((s, c) => s + (c.nilai_hjr || 0), 0),
        omsetYtd:    (closingsYtd.data  || []).reduce((s, c) => s + (c.nilai_hjr || 0), 0),
        omsetLast:   (closingsLast.data || []).reduce((s, c) => s + (c.nilai_hjr || 0), 0),
        visits:      0,
        visitTarget: 0,
        pipeline:    pipes.length,
        pipelineVal: pipes.reduce((s, p) => s + (p.potensi_closing || 0), 0),
        spMenjual, totalActiveSps,
      })
    } finally { setLoading(false) }
  }, [customFrom, customTo, dateMode, effMonth, effYear, lastMonth, lastYear])

  useEffect(() => { if (user) void fetchDashboard() }, [fetchDashboard, user])

  const mtdGrowth   = totals.omsetLast > 0
    ? Math.round(((totals.omsetMtd - totals.omsetLast) / totals.omsetLast) * 100)
    : null
  const warnHunters = hunters.filter(h => h.win_or_die_target > 0 && h.omset_mtd < h.win_or_die_target)
  const wodHunters  = hunters.filter(h => h.win_or_die_target > 0)
  const targetAlertHunters = hunters
    .filter(hunter => hunter.monthly_target > 0 && hunter.omset_current_month < hunter.monthly_target)
    .sort((a, b) =>
      a.omset_current_month / a.monthly_target - b.omset_current_month / b.monthly_target
    )


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

        {/* Date Filter — Hari Ini | MTD | YTD | Custom ↓ (PL-WEBSITE pattern) */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            MASCOL Division ·{" "}
            <span style={{ color: "var(--text-primary)" }}>
              {dateMode === "today"
                ? new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                : dateMode === "mtd"
                ? `${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}`
                : dateMode === "ytd"
                ? `Jan – ${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}`
                : `${getMonthName(customFrom.month)} ${customFrom.year} – ${getMonthName(customTo.month)} ${customTo.year}`}
            </span>
          </p>

          <div className="date-filter">
            {/* Hari Ini */}
            <button
              className={`date-filter__chip${dateMode === "today" ? " date-filter__chip--active" : ""}`}
              onClick={() => { setDateMode("today"); setCustomPopOpen(false) }}
            >
              Hari Ini
            </button>

            {/* MTD */}
            <button
              className={`date-filter__chip${dateMode === "mtd" ? " date-filter__chip--active" : ""}`}
              onClick={() => { setDateMode("mtd"); setCustomPopOpen(false) }}
            >
              MTD
            </button>

            {/* YTD */}
            <button
              className={`date-filter__chip${dateMode === "ytd" ? " date-filter__chip--active" : ""}`}
              onClick={() => { setDateMode("ytd"); setCustomPopOpen(false) }}
            >
              YTD
            </button>

            {/* Custom ↓ */}
            <div className="date-filter__group" ref={customPopRef}>
              <button
                className={`date-filter__chip${dateMode === "custom" ? " date-filter__chip--active" : ""}`}
                onClick={() => setCustomPopOpen(v => !v)}
              >
                <span>{dateMode === "custom"
                  ? `${getMonthName(customFrom.month)} ${customFrom.year} – ${getMonthName(customTo.month)} ${customTo.year}`
                  : "Custom"}</span>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {customPopOpen && (
                <div className="date-filter__pop">
                  {/* Bulan tertentu */}
                  <p className="date-filter__legend">Bulan tertentu</p>
                  <div className="date-filter__row">
                    <select
                      className="date-filter__input"
                      value={customFromTemp.month}
                      onChange={e => setCustomFromTemp(p => ({ ...p, month: Number(e.target.value) }))}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i+1} value={i+1}>{getMonthName(i+1)}</option>
                      ))}
                    </select>
                    <select
                      className="date-filter__input"
                      style={{ maxWidth: 90 }}
                      value={customFromTemp.year}
                      onChange={e => setCustomFromTemp(p => ({ ...p, year: Number(e.target.value) }))}
                    >
                      {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <button
                      className="date-filter__apply"
                      onClick={() => {
                        setCustomFrom(customFromTemp)
                        setCustomTo(customFromTemp)
                        setDateMode("custom")
                        setCustomPopOpen(false)
                      }}
                    >
                      Terapkan
                    </button>
                  </div>

                  <div className="date-filter__divider" />

                  {/* Range tanggal */}
                  <p className="date-filter__legend">Range bulan</p>
                  <div className="date-filter__row" style={{ flexWrap: "wrap" }}>
                    <select
                      className="date-filter__input"
                      value={customFromTemp.month}
                      onChange={e => setCustomFromTemp(p => ({ ...p, month: Number(e.target.value) }))}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i+1} value={i+1}>{getMonthName(i+1)}</option>
                      ))}
                    </select>
                    <select
                      className="date-filter__input"
                      style={{ maxWidth: 90 }}
                      value={customFromTemp.year}
                      onChange={e => setCustomFromTemp(p => ({ ...p, year: Number(e.target.value) }))}
                    >
                      {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <span className="date-filter__sep">→</span>
                    <select
                      className="date-filter__input"
                      value={customToTemp.month}
                      onChange={e => setCustomToTemp(p => ({ ...p, month: Number(e.target.value) }))}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i+1} value={i+1}>{getMonthName(i+1)}</option>
                      ))}
                    </select>
                    <select
                      className="date-filter__input"
                      style={{ maxWidth: 90 }}
                      value={customToTemp.year}
                      onChange={e => setCustomToTemp(p => ({ ...p, year: Number(e.target.value) }))}
                    >
                      {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <button
                      className="date-filter__apply"
                      onClick={() => {
                        setCustomFrom(customFromTemp)
                        setCustomTo(customToTemp)
                        setDateMode("custom")
                        setCustomPopOpen(false)
                      }}
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              sub={`Target ${formatRupiah(TEAM_MONTHLY_TARGET)}`}
              achievement={totals.omsetMtd / TEAM_MONTHLY_TARGET} />
          </div>
          <div className="card-enter-3 kpi-card">
            <StatCard label="Pipeline Hot" icon={Activity}
              value={totals.pipeline.toString()}
              sub={formatRupiah(totals.pipelineVal)}
              color="#8b5cf6" />
          </div>
          <div className="card-enter-4 kpi-card">
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

        {/* Top Performers — Sales Hunter & Sales Person */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 section-fade-1">
          {/* Top Sales Hunter (Supervisor) */}
          <div className="rounded-2xl p-5" style={{
            background: "linear-gradient(145deg, var(--surface) 0%, var(--surface2) 100%)",
            border: "1px solid var(--border)", boxShadow: "var(--shadow-md)",
          }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              🏆 Top Sales Hunter
            </p>
            {topHunter ? (
              <>
                <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{topHunter.name}</p>
                <p className="text-xl font-black mt-1" style={{ color: "var(--accent)" }}>
                  {formatRupiah(topHunter.omset)}
                </p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    <span>Capai bulan ini</span>
                    <span className="font-bold" style={{
                      color: topHunter.pct >= 100 ? "#22c55e" : topHunter.pct >= 70 ? "#FF6A3D" : "#ef4444"
                    }}>{topHunter.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min(100, topHunter.pct)}%`,
                      background: topHunter.pct >= 100 ? "#22c55e" : topHunter.pct >= 70 ? "#FF6A3D" : "#ef4444",
                    }} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Belum ada closing bulan ini</p>
            )}
          </div>

          {/* Top Sales Person */}
          <div className="rounded-2xl p-5" style={{
            background: "linear-gradient(145deg, var(--surface) 0%, var(--surface2) 100%)",
            border: "1px solid var(--border)", boxShadow: "var(--shadow-md)",
          }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
              🌟 Top Sales Person
            </p>
            {topSales ? (
              <>
                <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{topSales.name}</p>
                <p className="text-xl font-black mt-1" style={{ color: "#10b981" }}>
                  {formatRupiah(topSales.omset)}
                </p>
                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>Kontribusi bulan ini</p>
              </>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Belum ada closing bulan ini</p>
            )}
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
                    {getMonthName(effMonth)} {effYear} · {warnHunters.length} belum capai · {wodHunters.length - warnHunters.length} sudah capai
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

        {targetAlertHunters.length > 0 && (
          <div className="rounded-2xl overflow-hidden section-fade-2" style={{
            background: "linear-gradient(145deg, var(--surface) 0%, var(--surface2) 100%)",
            border: "1px solid rgba(245,158,11,0.35)",
            boxShadow: "0 0 32px rgba(245,158,11,0.06), var(--shadow-md)",
          }}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.14)", border: "1px solid rgba(245,158,11,0.28)" }}>
                  <DollarSign size={15} style={{ color: "#fbbf24" }} />
                </div>
                <div>
                  <div className="text-sm font-black tracking-wide" style={{ color: "#fbbf24", letterSpacing: "0.05em" }}>
                    TARGET OMSET ALERT
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {getMonthName(now.getMonth() + 1)} {now.getFullYear()} · {targetAlertHunters.length} Hunter belum mencapai target bulanan
                  </div>
                </div>
              </div>
              <div className="text-3xl font-black" style={{ color: "rgba(245,158,11,0.55)" }}>{targetAlertHunters.length}</div>
            </div>
            <div className="px-6 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {targetAlertHunters.map(hunter => {
                const progress = Math.round((hunter.omset_current_month / hunter.monthly_target) * 100)
                const gap = hunter.monthly_target - hunter.omset_current_month
                return (
                  <div key={hunter.id} className="rounded-xl p-3" style={{ background: "var(--surface2)", border: "1px solid rgba(245,158,11,0.22)" }}>
                    <div className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{hunter.name}</div>
                    <div className="text-base font-black mt-1" style={{ color: "var(--text-primary)" }}>{formatRupiah(hunter.omset_current_month)}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Target: {formatRupiah(hunter.monthly_target)}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#fbbf24" }}>Kurang: {formatRupiah(gap)}</div>
                    <div className="h-1 rounded-full overflow-hidden mt-2" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%`, background: "linear-gradient(90deg, #d97706, #f59e0b)" }} />
                    </div>
                    <div className="text-xs font-bold mt-1.5" style={{ color: "#fbbf24" }}>{progress}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
