"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, getMonthName, pct } from "@/lib/utils"
import { Printer, ChevronLeft, ChevronRight } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import type { User } from "@/types"

interface HunterStat {
  id: string
  name: string
  monthly_target: number
  win_or_die_target: number
  visit_target: number
  omset_mtd: number
  omset_ytd: number
  visit_mtd: number
  closing_count: number
}

const now = new Date()

export default function ReportHODPage() {
  const { isAdmin } = useAuth()
  const [hunters, setHunters] = useState<HunterStat[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  useEffect(() => { if (isAdmin) fetchData() }, [month, year])

  async function fetchData() {
    setLoading(true)
    const [usersRes, closingsMtdRes, closingsYtdRes, visitsRes] = await Promise.all([
      supabase.from("users").select("id,name,monthly_target,win_or_die_target,visit_target,role,status")
        .eq("role", "hunter").eq("status", "active"),
      supabase.from("Closing").select("user_id,closing_value")
        .eq("month", month).eq("year", year),
      supabase.from("Closing").select("user_id,closing_value")
        .eq("year", year).lte("month", month),
      supabase.from("visit_logs").select("user_id,count")
        .eq("month", month).eq("year", year),
    ])

    const userList = (usersRes.data || []) as User[]
    const closingsMtd = closingsMtdRes.data || []
    const closingsYtd = closingsYtdRes.data || []
    const visits = visitsRes.data || []

    const stats: HunterStat[] = userList.map(u => {
      const mtdRows = closingsMtd.filter(c => c.user_id === u.id)
      const ytdRows = closingsYtd.filter(c => c.user_id === u.id)
      const visitRows = visits.filter(v => v.user_id === u.id)
      return {
        id: u.id,
        name: u.name,
        monthly_target: u.monthly_target || 0,
        win_or_die_target: u.win_or_die_target || 0,
        visit_target: u.visit_target || 50,
        omset_mtd: mtdRows.reduce((s, c) => s + (Number(c.closing_value) || 0), 0),
        omset_ytd: ytdRows.reduce((s, c) => s + (Number(c.closing_value) || 0), 0),
        visit_mtd: visitRows.reduce((s, v) => s + (Number(v.count) || 0), 0),
        closing_count: mtdRows.length,
      }
    }).sort((a, b) => b.omset_mtd - a.omset_mtd)

    setHunters(stats)
    setLoading(false)
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

  const totalMtd = hunters.reduce((s, h) => s + h.omset_mtd, 0)
  const totalYtd = hunters.reduce((s, h) => s + h.omset_ytd, 0)
  const totalTarget = hunters.reduce((s, h) => s + h.monthly_target, 0)
  const totalVisit = hunters.reduce((s, h) => s + h.visit_mtd, 0)
  const totalVisitTarget = hunters.reduce((s, h) => s + h.visit_target, 0)
  const totalClosings = hunters.reduce((s, h) => s + h.closing_count, 0)

  const menjual = hunters.filter(h => h.omset_mtd > 0).length
  const belumMenjual = hunters.length - menjual
  const pieData = [
    { name: "Menjual", value: menjual },
    { name: "Belum Menjual", value: belumMenjual },
  ]

  const omsetBarData = hunters.map(h => ({
    name: h.name.split(" ")[0],
    Target: h.monthly_target / 1_000_000,
    WinDie: h.win_or_die_target / 1_000_000,
    Realisasi: h.omset_mtd / 1_000_000,
  }))

  const visitBarData = hunters.map(h => ({
    name: h.name.split(" ")[0],
    Target: h.visit_target,
    Realisasi: h.visit_mtd,
  }))

  const konversiData = hunters
    .filter(h => h.visit_mtd > 0)
    .map(h => ({
      name: h.name.split(" ")[0],
      rate: Number(((h.closing_count / h.visit_mtd) * 100).toFixed(1)),
    }))
    .sort((a, b) => b.rate - a.rate)

  const teamAch = pct(totalMtd, totalTarget)

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header — hidden in print */}
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
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
            <button onClick={() => window.print()}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white transition"
              style={{ background: "#E84500" }}>
              <Printer size={14} /> Share / PDF
            </button>
          </div>
        </div>

        {/* Print title — visible only in print */}
        <div className="hidden print:block text-center mb-4">
          <div className="text-lg font-bold">PT Central Group Development — MASCOL Division</div>
          <div className="text-sm text-gray-600">Report HOD · {getMonthName(month)} {year}</div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-600 text-sm">Memuat data...</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: `Omset MTD`,
                  val: formatRupiah(totalMtd),
                  sub: `Target ${formatRupiah(totalTarget)} · ${teamAch}%`,
                  highlight: true,
                },
                {
                  label: "Omset YTD",
                  val: formatRupiah(totalYtd),
                  sub: `Jan–${getMonthName(month)} ${year}`,
                  highlight: false,
                },
                {
                  label: "Visit MTD",
                  val: `${totalVisit}`,
                  sub: `Target ${totalVisitTarget} · ${pct(totalVisit, totalVisitTarget)}%`,
                  highlight: false,
                },
                {
                  label: "Closing MTD",
                  val: `${totalClosings}`,
                  sub: `Konversi ${totalVisit > 0 ? ((totalClosings / totalVisit) * 100).toFixed(1) : 0}%`,
                  highlight: false,
                },
              ].map((c, i) => (
                <div key={i} className="rounded-xl p-4"
                  style={{ background: "var(--surface)", border: `1px solid ${c.highlight ? "#E84500" : "var(--border)"}` }}>
                  <div className="text-xs text-slate-500 mb-1">{c.label}</div>
                  <div className="text-xl font-bold text-white">{c.val}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Row 1: Omset bar + Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                      contentStyle={{ background: "#111827", border: "1px solid #1e2d45", fontSize: 11 }}
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
                <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">
                  Menjual vs Belum Menjual
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="45%" outerRadius={70} dataKey="value">
                      <Cell fill="#E84500" />
                      <Cell fill="#1e2d45" />
                    </Pie>
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e2d45", fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center text-xs text-slate-500">
                  {menjual} dari {hunters.length} hunter aktif menjual
                </div>
              </div>
            </div>

            {/* Row 2: Visit + Konversi */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">
                  Visit per Hunter
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={visitBarData} barCategoryGap="35%">
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1e2d45", fontSize: 11 }} />
                    <Bar dataKey="Target" fill="#1e40af" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Realisasi" fill="#E84500" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">
                  Konversi Visit → Closing (%)
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={konversiData} barCategoryGap="35%">
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} contentStyle={{ background: "#111827", border: "1px solid #1e2d45", fontSize: 11 }} />
                    <Bar dataKey="rate" radius={[3, 3, 0, 0]}>
                      {konversiData.map((entry, i) => (
                        <Cell key={i} fill={entry.rate >= 5 ? "#22c55e" : entry.rate >= 2 ? "#E84500" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detail table */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="px-5 py-4" style={{ background: "var(--surface)" }}>
                <h2 className="text-sm font-semibold text-white">
                  YTD &amp; MTD per Hunter — {getMonthName(month)} {year}
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
                      <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Realisasi YTD</th>
                      <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Visit</th>
                      <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Closing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hunters.map((h, i) => {
                      const achievement = pct(h.omset_mtd, h.monthly_target)
                      const pctColor = achievement >= 100 ? "text-green-400" : achievement >= 70 ? "text-orange-400" : "text-red-400"
                      return (
                        <tr key={h.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-xs text-slate-500">{i + 1}</td>
                          <td className="px-4 py-3 text-xs font-medium text-white">{h.name}</td>
                          <td className="px-4 py-3 text-right text-xs text-slate-400">{formatRupiah(h.monthly_target)}</td>
                          <td className="px-4 py-3 text-right text-xs font-semibold text-white">{formatRupiah(h.omset_mtd)}</td>
                          <td className={`px-4 py-3 text-right text-xs font-bold ${pctColor}`}>{achievement}%</td>
                          <td className="px-4 py-3 text-right text-xs text-slate-300">{formatRupiah(h.omset_ytd)}</td>
                          <td className="px-4 py-3 text-center text-xs text-slate-400">
                            {h.visit_mtd}<span className="text-slate-600">/{h.visit_target}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-semibold text-white">{h.closing_count}</td>
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
                      <td className="px-4 py-3 text-right text-xs font-bold text-slate-300">{formatRupiah(totalYtd)}</td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-slate-300">
                        {totalVisit}<span className="text-slate-500">/{totalVisitTarget}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-bold text-white">{totalClosings}</td>
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
