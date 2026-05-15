"use client"
import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { HUNTER_GROUPS } from "@/lib/hunters"
import { formatRupiah, getMonthName, pct, normalizeProject, PROJECT_NAMES } from "@/lib/utils"
import { Printer, ChevronLeft, ChevronRight, ChevronDown, FileText, Code2, Trophy, Target } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"


const PIE_COLORS = ["#E84500", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"]

interface UserRow {
  id: string
  name: string
  monthly_target: number
  win_or_die_target: number
  visit_target: number
  role: string
}

interface HunterStat {
  id: string
  name: string
  dbName: string
  monthly_target: number
  win_or_die_target: number
  visit_target: number
  omset_mtd: number
  visit_realization: number
  closing_count: number
}

interface SpVisitStat {
  name: string
  hunterName: string
  visit_target: number
  visit_realization: number
}

interface PipelineStat {
  project: string
  count: number
  total_potensi: number
}

interface TopEntry {
  name: string
  type: "Hunter" | "SP"
  omset: number
  units: number
}

function achievementBadge(ach: number) {
  if (ach >= 100) return { label: "Good", color: "bg-green-500/20 text-green-400 border-green-500/30" }
  if (ach >= 70)  return { label: "Need Extra Effort", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" }
  return { label: "Below Target", color: "bg-red-500/20 text-red-400 border-red-500/30" }
}

const now = new Date()

export default function ReportHODPage() {
  const { isAdmin, user } = useAuth()
  const [hunters, setHunters]           = useState<HunterStat[]>([])
  const [spVisits, setSpVisits]         = useState<SpVisitStat[]>([])
  const [projectOmset, setProjectOmset] = useState<Record<string, number>>({})
  const [pipelineStats, setPipelineStats] = useState<PipelineStat[]>([])
  const [caraBayarData, setCaraBayarData] = useState<{ name: string; value: number }[]>([])
  const [top3Omset, setTop3Omset]       = useState<TopEntry[]>([])
  const [top3Units, setTop3Units]       = useState<TopEntry[]>([])
  const [totalMtd, setTotalMtd]         = useState(0)
  const [totalYtd, setTotalYtd]         = useState(0)
  const [loading, setLoading]           = useState(true)
  const [shareOpen, setShareOpen]       = useState(false)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const shareRef = useRef<HTMLDivElement>(null)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (isAdmin) fetchData() }, [month, year, isAdmin, user])

  // Close share dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  async function fetchData() {
    setLoading(true)
    const [allUsersRes, closingsMtdRes, closingsYtdRes, visitsMtdRes, pipelineRes] = await Promise.all([
      supabase.from("users").select("id,name,monthly_target,win_or_die_target,visit_target,role,status")
        .eq("status", "active").in("role", ["hunter", "sales_person"]),
      supabase.from("konsumen").select("nilai_hjr,project,cara_bayar,sales_hunter,sales_person")
        .eq("status", "closing").eq("closing_month", month).eq("closing_year", year),
      supabase.from("konsumen").select("nilai_hjr")
        .eq("status", "closing").eq("closing_year", year).lte("closing_month", month),
      supabase.from("visit_logs").select("user_id,count,accompanied_count")
        .eq("month", month).eq("year", year),
      supabase.from("konsumen").select("project,potensi_closing")
        .in("status", ["warm", "hot"]),
    ])

    const allUsers   = (allUsersRes.data || []) as UserRow[]
    const closingsMtd = closingsMtdRes.data || []
    const closingsYtd = closingsYtdRes.data || []
    const visitsMtd   = visitsMtdRes.data || []
    const pipelineRows = pipelineRes.data || []

    // --- Omset aggregation ---
    const hunterOmsetMtd:    Record<string, number> = {}
    const hunterClosingCount: Record<string, number> = {}
    const spOmsetMtd:        Record<string, number> = {}
    const spUnitMtd:         Record<string, number> = {}
    const projOmset:         Record<string, number> = {}
    const cbCount:           Record<string, number> = {}
    let newTotalMtd = 0

    closingsMtd.forEach((c: {
      nilai_hjr: number | null; project: string | null; cara_bayar: string | null
      sales_hunter: string | null; sales_person: string | null
    }) => {
      const val = c.nilai_hjr || 0
      newTotalMtd += val
      if (c.sales_hunter) {
        hunterOmsetMtd[c.sales_hunter]    = (hunterOmsetMtd[c.sales_hunter] || 0) + val
        hunterClosingCount[c.sales_hunter] = (hunterClosingCount[c.sales_hunter] || 0) + 1
      }
      if (c.sales_person) {
        spOmsetMtd[c.sales_person] = (spOmsetMtd[c.sales_person] || 0) + val
        spUnitMtd[c.sales_person]  = (spUnitMtd[c.sales_person] || 0) + 1
      }
      const proj = normalizeProject(c.project)
      if (proj) projOmset[proj] = (projOmset[proj] || 0) + val
      if (c.cara_bayar) cbCount[c.cara_bayar]  = (cbCount[c.cara_bayar] || 0) + 1
    })

    const newTotalYtd = closingsYtd.reduce(
      (s: number, c: { nilai_hjr: number | null }) => s + (c.nilai_hjr || 0), 0
    )

    // --- Visit aggregation ---
    const nameToId: Record<string, string> = {}
    const idToUser: Record<string, UserRow> = {}
    allUsers.forEach(u => { nameToId[u.name] = u.id; idToUser[u.id] = u })

    const visitCountById:    Record<string, number> = {}
    const accompaniedById:   Record<string, number> = {}
    visitsMtd.forEach((v: { user_id: string; count: number | null; accompanied_count: number | null }) => {
      visitCountById[v.user_id]   = (visitCountById[v.user_id] || 0) + (v.count || 0)
      accompaniedById[v.user_id]  = (accompaniedById[v.user_id] || 0) + (v.accompanied_count || 0)
    })

    // Hunter stats
    const newHunters: HunterStat[] = []
    HUNTER_GROUPS.forEach(hg => {
      const userRow = allUsers.find(u => u.name === hg.dbName)
      if (!userRow) return
      const spIds = hg.spNames.map(n => nameToId[n]).filter(Boolean)
      const visitReal = spIds.reduce((s, id) => s + (accompaniedById[id] || 0), 0)
      newHunters.push({
        id: userRow.id, name: hg.name, dbName: hg.dbName,
        monthly_target:    userRow.monthly_target    || 0,
        win_or_die_target: userRow.win_or_die_target || 0,
        visit_target:      userRow.visit_target      || 50,
        omset_mtd:         hunterOmsetMtd[hg.dbName]    || 0,
        visit_realization: visitReal,
        closing_count:     hunterClosingCount[hg.dbName] || 0,
      })
    })
    newHunters.sort((a, b) => b.omset_mtd - a.omset_mtd)

    // Top 3 combined (hunter + SP)
    const combined: TopEntry[] = [
      ...newHunters.map(h => ({ name: h.name, type: "Hunter" as const, omset: h.omset_mtd, units: h.closing_count })),
      ...Object.entries(spOmsetMtd).map(([name, omset]) => ({
        name, type: "SP" as const, omset, units: spUnitMtd[name] || 0,
      })),
    ]
    const newTop3Omset = [...combined].sort((a, b) => b.omset - a.omset).slice(0, 3)
    const newTop3Units = [...combined].sort((a, b) => b.units - a.units).slice(0, 3)

    // SP visit stats
    const newSpVisits: SpVisitStat[] = []
    HUNTER_GROUPS.forEach(hg => {
      hg.spNames.forEach(spName => {
        const userId  = nameToId[spName]
        const userRow = userId ? idToUser[userId] : undefined
        newSpVisits.push({
          name: spName, hunterName: hg.name,
          visit_target:      userRow?.visit_target || 40,
          visit_realization: userId ? (visitCountById[userId] || 0) : 0,
        })
      })
    })

    // Pipeline per project
    const pipelineByProject: Record<string, { count: number; total: number }> = {}
    pipelineRows.forEach((r: { project: string | null; potensi_closing: number | null }) => {
      const p = normalizeProject(r.project) || "Lainnya"
      if (!pipelineByProject[p]) pipelineByProject[p] = { count: 0, total: 0 }
      pipelineByProject[p].count += 1
      pipelineByProject[p].total += (r.potensi_closing || 0)
    })
    const newPipeline = Object.entries(pipelineByProject)
      .map(([project, d]) => ({ project, count: d.count, total_potensi: d.total }))
      .sort((a, b) => b.total_potensi - a.total_potensi)

    const newCbData = Object.entries(cbCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    setHunters(newHunters)
    setSpVisits(newSpVisits)
    setProjectOmset(projOmset)
    setPipelineStats(newPipeline)
    setCaraBayarData(newCbData)
    setTop3Omset(newTop3Omset)
    setTop3Units(newTop3Units)
    setTotalMtd(newTotalMtd)
    setTotalYtd(newTotalYtd)
    setLoading(false)
  }

  function exportHtml() {
    const rows = hunters.map(h => {
      const ach = pct(h.omset_mtd, h.monthly_target)
      const badge = achievementBadge(ach)
      return `<tr>
        <td>${h.name}</td>
        <td>${formatRupiah(h.monthly_target)}</td>
        <td>${formatRupiah(h.omset_mtd)}</td>
        <td>${ach}%</td>
        <td>${formatRupiah(h.win_or_die_target)}</td>
        <td>${h.visit_target}</td>
        <td>${h.visit_realization}</td>
        <td>${h.closing_count}</td>
        <td>${badge.label}</td>
      </tr>`
    }).join("")

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Report HOD – ${getMonthName(month)} ${year}</title>
<style>
  body{font-family:Arial,sans-serif;padding:24px;color:#111;max-width:1200px;margin:0 auto}
  h1{font-size:20px;margin-bottom:4px}
  h2{font-size:14px;color:#555;margin-top:24px;margin-bottom:8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .kpi-row{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px}
  .kpi-box{flex:1;min-width:160px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:8px;padding:14px}
  .kpi-box .val{font-size:18px;font-weight:700;margin:6px 0 2px}
  .kpi-box .lbl{font-size:11px;color:#666}
  table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:20px}
  th,td{border:1px solid #e0e0e0;padding:7px 10px;text-align:left}
  th{background:#f2f2f2;font-weight:600}
  tr:nth-child(even){background:#fafafa}
  .good{color:#16a34a;font-weight:600}
  .need{color:#d97706;font-weight:600}
  .below{color:#dc2626;font-weight:600}
</style>
</head>
<body>
<h1>PT Central Group Development — MASCOL Division</h1>
<p style="color:#666;font-size:13px">Report HOD · ${getMonthName(month)} ${year} · Diekspor ${new Date().toLocaleDateString("id-ID")}</p>

<h2>Total Omset</h2>
<div class="kpi-row">
  <div class="kpi-box"><div class="lbl">Total Omset MTD</div><div class="val">${formatRupiah(totalMtd)}</div><div class="lbl">Achievement ${pct(totalMtd, hunters.reduce((s,h)=>s+h.monthly_target,0))}%</div></div>
  <div class="kpi-box"><div class="lbl">Total Omset YTD</div><div class="val">${formatRupiah(totalYtd)}</div><div class="lbl">Jan–${getMonthName(month)} ${year}</div></div>
</div>

<h2>Per Project MTD</h2>
<div class="kpi-row">
${PROJECT_NAMES.map(p => `  <div class="kpi-box"><div class="lbl">${p}</div><div class="val">${formatRupiah(projectOmset[p]||0)}</div></div>`).join("\n")}
</div>

<h2>Pencapaian per Sales Hunter</h2>
<table>
<tr><th>Hunter</th><th>Target MTD</th><th>Realisasi MTD</th><th>Ach %</th><th>Win/Die</th><th>Visit Target</th><th>Visit Real</th><th>Closing</th><th>Status</th></tr>
${rows}
</table>

<h2>Top 3 berdasarkan Nilai Omset</h2>
<table>
<tr><th>#</th><th>Nama</th><th>Tipe</th><th>Omset</th></tr>
${top3Omset.map((e,i)=>`<tr><td>${i+1}</td><td>${e.name}</td><td>${e.type}</td><td>${formatRupiah(e.omset)}</td></tr>`).join("")}
</table>

<h2>Top 3 berdasarkan Jumlah Unit</h2>
<table>
<tr><th>#</th><th>Nama</th><th>Tipe</th><th>Unit</th></tr>
${top3Units.map((e,i)=>`<tr><td>${i+1}</td><td>${e.name}</td><td>${e.type}</td><td>${e.units}</td></tr>`).join("")}
</table>

<h2>Pipeline per Project (Warm &amp; Hot)</h2>
<table>
<tr><th>Project</th><th>Jumlah Konsumen</th><th>Total Potensi</th></tr>
${pipelineStats.map(p=>`<tr><td>${p.project}</td><td>${p.count}</td><td>${formatRupiah(p.total_potensi)}</td></tr>`).join("")}
</table>
</body></html>`

    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url
    a.download = `report-hod-${month}-${year}.html`
    a.click()
    URL.revokeObjectURL(url)
    setShareOpen(false)
  }

  if (!isAdmin) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
          Halaman ini hanya dapat diakses oleh Admin.
        </div>
      </DashboardShell>
    )
  }

  const totalTarget      = hunters.reduce((s, h) => s + h.monthly_target, 0)
  const totalVisit       = hunters.reduce((s, h) => s + h.visit_realization, 0)
  const totalVisitTarget = hunters.reduce((s, h) => s + h.visit_target, 0)
  const totalClosings    = hunters.reduce((s, h) => s + h.closing_count, 0)
  const teamAch          = pct(totalMtd, totalTarget)

  const omsetBarData = hunters.map(h => ({
    name: h.name.split(" ")[0],
    Target:    h.monthly_target    / 1_000_000,
    WinDie:    h.win_or_die_target / 1_000_000,
    Realisasi: h.omset_mtd         / 1_000_000,
  }))

  const totalSpVisit  = spVisits.reduce((s, sp) => s + sp.visit_realization, 0)
  const totalSpTarget = spVisits.reduce((s, sp) => s + sp.visit_target, 0)

  const medals = ["🥇", "🥈", "🥉"]

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 no-print card-enter" style={{ position: "relative", zIndex: 10 }}>
          <div>
            <h1 className="text-xl font-bold text-white">Report HOD</h1>
            <p className="text-sm text-slate-500 mt-0.5">Laporan kinerja tim MASCOL Division</p>
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

            {/* Share dropdown */}
            <div className="relative" ref={shareRef}>
              <button
                onClick={() => setShareOpen(o => !o)}
                className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white transition"
                style={{ background: "#E84500" }}>
                <Printer size={14} />
                Share
                <ChevronDown size={12} className={`transition-transform duration-200 ${shareOpen ? "rotate-180" : ""}`} />
              </button>
              {shareOpen && (
                <div className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden shadow-lg z-[9999] min-w-[160px]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <button
                    onClick={() => { window.print(); setShareOpen(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left hover:bg-white/[0.04] transition text-white">
                    <FileText size={13} className="text-slate-400" />
                    Export PDF
                  </button>
                  <div style={{ height: 1, background: "var(--border)" }} />
                  <button
                    onClick={exportHtml}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left hover:bg-white/[0.04] transition text-white">
                    <Code2 size={13} className="text-slate-400" />
                    Download HTML
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Print title */}
        <div className="hidden print:block text-center mb-4">
          <div className="text-lg font-bold">PT Central Group Development — MASCOL Division</div>
          <div className="text-sm text-gray-600">Report HOD · {getMonthName(month)} {year}</div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-600 text-sm">Memuat data...</div>
        ) : (
          <>
            {/* Section 1: Total Omset — 2 big KPI cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="kpi-card card-enter-1 rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid #E84500" }}>
                <div className="text-xs text-slate-500 mb-1">Total Omset MTD</div>
                <div className="text-2xl font-bold text-white">{formatRupiah(totalMtd)}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Target {formatRupiah(50_000_000_000)} ·{" "}
                  <span className={`font-bold ${pct(totalMtd, 50_000_000_000) >= 100 ? "text-green-400" : pct(totalMtd, 50_000_000_000) >= 70 ? "text-orange-400" : "text-red-400"}`}>
                    {pct(totalMtd, 50_000_000_000)}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                  <div className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(pct(totalMtd, 50_000_000_000), 100)}%`, background: "#E84500" }} />
                </div>
              </div>
              <div className="kpi-card card-enter-2 rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-xs text-slate-500 mb-1">Total Omset YTD</div>
                <div className="text-2xl font-bold text-white">{formatRupiah(totalYtd)}</div>
                <div className="text-xs text-slate-500 mt-1">Jan–{getMonthName(month)} {year}</div>
                <div className="mt-2 flex gap-4 text-xs text-slate-400">
                  <span>Closing MTD: <span className="text-white font-semibold">{totalClosings}</span></span>
                  <span>Visit: <span className="text-white font-semibold">{totalVisit}</span>/<span className="text-slate-500">{totalVisitTarget}</span></span>
                </div>
              </div>
            </div>

            {/* Section 2: Per-project Omset MTD cards */}
            <div className="card-enter-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Omset MTD per Project</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PROJECT_NAMES.map((proj, i) => (
                  <div key={proj}
                    className={`kpi-card rounded-xl p-3 card-enter-${Math.min(i + 1, 6)}`}
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="text-[10px] text-slate-500 leading-tight mb-2">{proj}</div>
                    <div className="text-sm font-bold text-white">{formatRupiah(projectOmset[proj] || 0)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Hunter Achievement Cards */}
            <div className="card-enter-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                <Target size={12} className="inline mr-1.5 mb-0.5" />
                Pencapaian per Sales Hunter
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {hunters.map((h, i) => {
                  const ach   = pct(h.omset_mtd, h.monthly_target)
                  const badge = achievementBadge(ach)
                  const vAch  = pct(h.visit_realization, h.visit_target)
                  return (
                    <div key={h.id}
                      className={`kpi-card rounded-xl p-4 card-enter-${Math.min(i + 1, 6)}`}
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      {/* Name + badge */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="text-sm font-bold text-white leading-tight">{h.name}</div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Omset progress */}
                      <div className="mb-2">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Omset MTD</span>
                          <span className={`font-bold ${ach >= 100 ? "text-green-400" : ach >= 70 ? "text-orange-400" : "text-red-400"}`}>{ach}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800">
                          <div className="h-1.5 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(ach, 100)}%`, background: ach >= 100 ? "#22c55e" : ach >= 70 ? "#E84500" : "#ef4444" }} />
                        </div>
                        <div className="text-xs font-semibold text-white mt-1">{formatRupiah(h.omset_mtd)}</div>
                        <div className="text-[10px] text-slate-500">Target {formatRupiah(h.monthly_target)}</div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                        <div className="text-center">
                          <div className="text-[10px] text-slate-500 mb-0.5">Visit</div>
                          <div className="text-xs font-bold text-white">{h.visit_realization}</div>
                          <div className="text-[10px] text-slate-600">/{h.visit_target}</div>
                          <div className={`text-[10px] font-semibold ${vAch >= 100 ? "text-green-400" : vAch >= 70 ? "text-orange-400" : "text-red-400"}`}>{vAch}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-slate-500 mb-0.5">Win/Die</div>
                          <div className="text-xs font-semibold text-amber-400 leading-tight">{formatRupiah(h.win_or_die_target)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-slate-500 mb-0.5">Closing</div>
                          <div className="text-xs font-bold text-white">{h.closing_count}</div>
                          <div className="text-[10px] text-slate-600">unit</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Section 4: Top 3 by Omset + Top 3 by Unit */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 card-enter-5">
              {/* Top 3 Omset */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={14} className="text-amber-400" />
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Top 3 — Nilai Omset MTD</div>
                </div>
                <div className="space-y-3">
                  {top3Omset.length === 0 ? (
                    <div className="text-xs text-slate-600 italic">Belum ada data closing</div>
                  ) : top3Omset.map((e, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-lg w-7 text-center flex-shrink-0">{medals[i]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{e.name}</div>
                        <div className="text-[10px] text-slate-500">{e.type}</div>
                      </div>
                      <div className="text-sm font-bold text-white flex-shrink-0">{formatRupiah(e.omset)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 3 Unit */}
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={14} className="text-blue-400" />
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Top 3 — Jumlah Unit MTD</div>
                </div>
                <div className="space-y-3">
                  {top3Units.length === 0 ? (
                    <div className="text-xs text-slate-600 italic">Belum ada data closing</div>
                  ) : top3Units.map((e, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="text-lg w-7 text-center flex-shrink-0">{medals[i]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{e.name}</div>
                        <div className="text-[10px] text-slate-500">{e.type}</div>
                      </div>
                      <div className="text-sm font-bold text-white flex-shrink-0">{e.units} unit</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 5: Omset bar chart + Cara Bayar pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 card-enter-6">
              <div className="lg:col-span-2 rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">
                  Omset MTD per Hunter (Juta Rp)
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={omsetBarData} barCategoryGap="30%">
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${v}M`} />
                    <Tooltip
                      formatter={(v) => `Rp ${Number(v).toFixed(1)}M`}
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-medium)", fontSize: 11, color: "var(--text-primary)" }}
                    />
                    <Bar dataKey="Target" fill="#1e40af" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="WinDie" fill="#7f1d1d" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Realisasi" radius={[3, 3, 0, 0]}>
                      {omsetBarData.map((entry, i) => {
                        const ratio = entry.Target > 0 ? entry.Realisasi / entry.Target : 0
                        return <Cell key={i} fill={ratio >= 1 ? "#22c55e" : ratio >= 0.7 ? "#E84500" : "#ef4444"} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Cara Bayar MTD</div>
                {caraBayarData.length === 0 ? (
                  <div className="text-xs text-slate-600 italic py-10 text-center">Belum ada data closing</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={caraBayarData} cx="50%" cy="45%" outerRadius={65} dataKey="value">
                        {caraBayarData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v, name) => [`${v} closing`, name]}
                        contentStyle={{ background: "var(--surface)", border: "1px solid var(--border-medium)", fontSize: 11, color: "var(--text-primary)" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10, color: "#94a3b8" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Section 6: Visit — Hunter & SP tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <div className="px-4 py-3" style={{ background: "var(--surface2)" }}>
                  <div className="text-xs font-semibold text-white">Visit — Sales Hunter</div>
                  <div className="text-xs text-slate-500 mt-0.5">Realisasi = Didampingi Atasan (sum SP)</div>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                      <th className="px-3 py-2 text-left text-slate-500 font-medium">Hunter</th>
                      <th className="px-3 py-2 text-center text-slate-500 font-medium">Target</th>
                      <th className="px-3 py-2 text-center text-slate-500 font-medium">Realisasi</th>
                      <th className="px-3 py-2 text-center text-slate-500 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hunters.map(h => {
                      const ach = pct(h.visit_realization, h.visit_target)
                      return (
                        <tr key={h.id}
                          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
                          className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2 font-medium text-white">{h.name}</td>
                          <td className="px-3 py-2 text-center text-slate-400">{h.visit_target}</td>
                          <td className="px-3 py-2 text-center font-semibold text-white">{h.visit_realization}</td>
                          <td className={`px-3 py-2 text-center font-bold ${ach >= 100 ? "text-green-400" : ach >= 70 ? "text-orange-400" : "text-red-400"}`}>{ach}%</td>
                        </tr>
                      )
                    })}
                    <tr style={{ background: "var(--surface2)" }}>
                      <td className="px-3 py-2 font-bold text-slate-300">Total</td>
                      <td className="px-3 py-2 text-center font-bold text-slate-300">{totalVisitTarget}</td>
                      <td className="px-3 py-2 text-center font-bold text-white">{totalVisit}</td>
                      <td className={`px-3 py-2 text-center font-bold ${pct(totalVisit, totalVisitTarget) >= 100 ? "text-green-400" : pct(totalVisit, totalVisitTarget) >= 70 ? "text-orange-400" : "text-red-400"}`}>
                        {pct(totalVisit, totalVisitTarget)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <div className="px-4 py-3" style={{ background: "var(--surface2)" }}>
                  <div className="text-xs font-semibold text-white">Visit — Sales Person</div>
                  <div className="text-xs text-slate-500 mt-0.5">Realisasi = Total Visit Mandiri</div>
                </div>
                <div className="overflow-y-auto max-h-[400px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">Sales Person</th>
                        <th className="px-3 py-2 text-left text-slate-500 font-medium">Hunter</th>
                        <th className="px-3 py-2 text-center text-slate-500 font-medium">Target</th>
                        <th className="px-3 py-2 text-center text-slate-500 font-medium">Real.</th>
                        <th className="px-3 py-2 text-center text-slate-500 font-medium">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spVisits.map((sp, i) => {
                        const ach = pct(sp.visit_realization, sp.visit_target)
                        return (
                          <tr key={i}
                            style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
                            className="hover:bg-white/[0.02]">
                            <td className="px-3 py-2 text-white">{sp.name}</td>
                            <td className="px-3 py-2 text-slate-500">{sp.hunterName.split(" ")[0]}</td>
                            <td className="px-3 py-2 text-center text-slate-400">{sp.visit_target}</td>
                            <td className="px-3 py-2 text-center font-semibold text-white">{sp.visit_realization}</td>
                            <td className={`px-3 py-2 text-center font-bold ${ach >= 100 ? "text-green-400" : ach >= 70 ? "text-orange-400" : "text-red-400"}`}>{ach}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ background: "var(--surface2)", borderTop: "1px solid var(--border)" }}
                  className="px-3 py-2 flex gap-4 text-xs">
                  <span className="font-bold text-slate-300">Total</span>
                  <span className="text-slate-400">Target: <span className="text-white font-semibold">{totalSpTarget}</span></span>
                  <span className="text-slate-400">Real: <span className="text-white font-semibold">{totalSpVisit}</span></span>
                  <span className={`font-bold ${pct(totalSpVisit, totalSpTarget) >= 100 ? "text-green-400" : pct(totalSpVisit, totalSpTarget) >= 70 ? "text-orange-400" : "text-red-400"}`}>
                    {pct(totalSpVisit, totalSpTarget)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Section 7: Pipeline per project */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="px-5 py-4" style={{ background: "var(--surface)" }}>
                <h2 className="text-sm font-semibold text-white">Pipeline (Prospek Aktif) per Project</h2>
                <p className="text-xs text-slate-500 mt-0.5">Status: Warm &amp; Hot · Nilai Potensi = Nilai HJR</p>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-px" style={{ background: "var(--border)" }}>
                {PROJECT_NAMES.map(proj => {
                  const stat = pipelineStats.find(p => p.project === proj)
                  return (
                    <div key={proj} className="p-4 kpi-card" style={{ background: "var(--surface)" }}>
                      <div className="text-[10px] text-slate-500 leading-tight mb-2">{proj}</div>
                      <div className="text-xl font-bold text-white">{stat?.count || 0}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">konsumen</div>
                      <div className="text-xs font-semibold text-orange-400 mt-1.5">{formatRupiah(stat?.total_potensi || 0)}</div>
                    </div>
                  )
                })}
              </div>
              {pipelineStats.filter(p => !(PROJECT_NAMES as readonly string[]).includes(p.project)).length > 0 && (
                <div className="px-5 py-3" style={{ background: "var(--surface2)", borderTop: "1px solid var(--border)" }}>
                  <div className="text-xs text-slate-500 mb-2">Project Lainnya</div>
                  <div className="flex flex-wrap gap-4">
                    {pipelineStats.filter(p => !(PROJECT_NAMES as readonly string[]).includes(p.project)).map((p, i) => (
                      <div key={i} className="text-xs">
                        <span className="text-slate-400">{p.project}:</span>{" "}
                        <span className="text-white font-semibold">{p.count}</span>
                        <span className="text-slate-500"> · </span>
                        <span className="text-orange-400">{formatRupiah(p.total_potensi)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 8: Detail Hunter Omset Table */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="px-5 py-4" style={{ background: "var(--surface)" }}>
                <h2 className="text-sm font-semibold text-white">
                  Detail Omset MTD per Hunter — {getMonthName(month)} {year}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                      <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">#</th>
                      <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Hunter</th>
                      <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Target MTD</th>
                      <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Realisasi MTD</th>
                      <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">% MTD</th>
                      <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Visit</th>
                      <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Closing</th>
                      <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hunters.map((h, i) => {
                      const achievement = pct(h.omset_mtd, h.monthly_target)
                      const badge = achievementBadge(achievement)
                      return (
                        <tr key={h.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-xs text-slate-500">{i + 1}</td>
                          <td className="px-4 py-3 text-xs font-medium text-white">{h.name}</td>
                          <td className="px-4 py-3 text-right text-xs text-slate-400">{formatRupiah(h.monthly_target)}</td>
                          <td className="px-4 py-3 text-right text-xs font-semibold text-white">{formatRupiah(h.omset_mtd)}</td>
                          <td className={`px-4 py-3 text-right text-xs font-bold ${achievement >= 100 ? "text-green-400" : achievement >= 70 ? "text-orange-400" : "text-red-400"}`}>
                            {achievement}%
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-slate-400">
                            {h.visit_realization}<span className="text-slate-600">/{h.visit_target}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-semibold text-white">{h.closing_count}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    <tr style={{ background: "var(--surface2)" }}>
                      <td colSpan={2} className="px-4 py-3 text-xs font-bold text-slate-300">TOTAL TIM</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-slate-300">{formatRupiah(totalTarget)}</td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-white">{formatRupiah(totalMtd)}</td>
                      <td className={`px-4 py-3 text-right text-xs font-bold ${teamAch >= 100 ? "text-green-400" : teamAch >= 70 ? "text-orange-400" : "text-red-400"}`}>
                        {teamAch}%
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-slate-300">
                        {totalVisit}<span className="text-slate-500">/{totalVisitTarget}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-white">{totalClosings}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
