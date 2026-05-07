"use client"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { getMonthName, getWeekNumber } from "@/lib/utils"
import { MapPin, Upload, ChevronLeft, ChevronRight } from "lucide-react"
import type { Visit } from "@/types"
import * as XLSX from "xlsx"

const VISIT_TYPES = [
  { value: "konsumen", label: "Konsumen" },
  { value: "lokasi", label: "Visit Lokasi" },
  { value: "assisted", label: "Assisted" },
  { value: "out_of_town", label: "Luar Kota" },
  { value: "pk", label: "PK / Seminar" },
  { value: "sg_agent", label: "SG Agent" },
]

const TEAM_MONTHLY_TARGET = 720
const INDIVIDUAL_MONTHLY_TARGET = 50

const now = new Date()
const currentWeek = getWeekNumber(now)
const currentYear = now.getFullYear()

export default function VisitPage() {
  const { user, isAdmin } = useAuth()
  const [visits, setVisits] = useState<Visit[]>([])
  const [userMap, setUserMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  useEffect(() => { if (user) fetchData() }, [user, month, year])

  async function fetchData() {
    setLoading(true)
    const [visitRes, userRes] = await Promise.all([
      supabase.from("visit_logs")
        .select("*")
        .eq("month", month).eq("year", year)
        .order("visit_date", { ascending: false }),
      supabase.from("users").select("id,name").eq("status", "active"),
    ])
    const allVisits = visitRes.data || []
    const scoped = isAdmin ? allVisits : allVisits.filter(v => v.user_id === user!.id)
    setVisits(scoped)
    const map: Record<string, string> = {}
    for (const u of (userRes.data || [])) map[u.id] = u.name
    setUserMap(map)
    setLoading(false)
  }

  async function handleExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const rows = XLSX.utils.sheet_to_json<{ tanggal?: string; tipe?: string; jumlah?: number; catatan?: string }>(
      wb.Sheets[wb.SheetNames[0]]
    )
    const inserts = rows.map(r => {
      const d = new Date(r.tanggal || Date.now())
      return {
        user_id: user!.id,
        visit_date: d.toISOString().slice(0, 10),
        visit_type: r.tipe || "konsumen",
        count: Number(r.jumlah) || 1,
        notes: r.catatan || null,
        week_number: getWeekNumber(d),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
      }
    })
    const { error } = await supabase.from("visit_logs").insert(inserts)
    if (error) setMsg({ type: "err", text: error.message })
    else { setMsg({ type: "ok", text: `${inserts.length} visit diimport!` }); fetchData() }
    if (fileRef.current) fileRef.current.value = ""
  }

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()
  const monthTarget = isAdmin ? TEAM_MONTHLY_TARGET : INDIVIDUAL_MONTHLY_TARGET
  const weekTarget = Math.round(monthTarget / 4)

  const totalMonth = visits.reduce((s, v) => s + (v.count || 0), 0)
  const totalWeek = visits.filter(v => {
    if (!isCurrentMonth) return false
    return v.week_number === currentWeek && v.year === currentYear
  }).reduce((s, v) => s + (v.count || 0), 0)

  const pctMonth = monthTarget > 0 ? Math.round((totalMonth / monthTarget) * 100) : 0
  const pctWeek = weekTarget > 0 ? Math.round((totalWeek / weekTarget) * 100) : 0

  function barColor(pct: number) {
    if (pct >= 100) return "#22c55e"
    if (pct >= 70) return "#E84500"
    return "#ef4444"
  }

  const cards = [
    {
      label: "Visit Bulan Ini",
      value: totalMonth,
      unit: "visit",
      sub: `Target ${monthTarget.toLocaleString("id-ID")}`,
      pct: pctMonth,
    },
    {
      label: "% Bulan",
      value: `${pctMonth}%`,
      unit: "",
      sub: `${totalMonth} dari ${monthTarget} visit`,
      pct: pctMonth,
    },
    {
      label: "Visit Minggu Ini",
      value: isCurrentMonth ? totalWeek : "—",
      unit: isCurrentMonth ? "visit" : "",
      sub: isCurrentMonth ? `Target ${weekTarget}/minggu` : "Pilih bulan saat ini",
      pct: isCurrentMonth ? pctWeek : 0,
    },
    {
      label: "% Minggu",
      value: isCurrentMonth ? `${pctWeek}%` : "—",
      unit: "",
      sub: isCurrentMonth ? `${totalWeek} dari ${weekTarget} visit` : "Pilih bulan saat ini",
      pct: isCurrentMonth ? pctWeek : 0,
    },
  ]

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Visit</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isAdmin ? "Rekap kunjungan semua hunter" : "Rekap kunjungan tim Anda"}
            </p>
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
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg text-slate-400 hover:text-white transition"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <Upload size={13} /> Import Excel
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcel} />
          </div>
        </div>

        {msg && (
          <div className={`text-xs p-3 rounded-lg ${msg.type === "ok" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {msg.text}
          </div>
        )}

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs text-slate-500 mb-1">{c.label}</div>
              <div className="text-2xl font-bold text-white">
                {c.value}
                {c.unit && <span className="text-sm text-slate-500 ml-1">{c.unit}</span>}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">{c.sub}</div>
              {c.pct > 0 && (
                <div className="mt-2 h-1.5 rounded-full" style={{ background: "var(--surface2)" }}>
                  <div className="h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(c.pct, 100)}%`, background: barColor(c.pct) }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Visit Log Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ background: "var(--surface)" }}>
            <MapPin size={15} className="text-green-400" />
            <h2 className="text-sm font-semibold text-white">
              Riwayat Visit {getMonthName(month)} {year}
            </h2>
            <span className="ml-auto text-xs text-slate-500">{visits.length} entri</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  {isAdmin && <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Hunter</th>}
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Minggu</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Tipe</th>
                  <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Jumlah</th>
                  <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat...</td></tr>
                ) : visits.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs">
                    Belum ada visit {getMonthName(month)} {year}
                  </td></tr>
                ) : visits.slice(0, 100).map(v => (
                  <tr key={v.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                    {isAdmin && (
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {userMap[v.user_id] || v.user_id.slice(0, 8) + "…"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs text-slate-300">{v.visit_date}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">Minggu {v.week_number}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                        {VISIT_TYPES.find(t => t.value === v.visit_type)?.label || v.visit_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-white font-semibold">{v.count}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{v.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
