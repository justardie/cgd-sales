"use client"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { getMonthName, getWeekNumber } from "@/lib/utils"
import { Upload, ChevronLeft, ChevronRight, Users } from "lucide-react"
import type { Visit } from "@/types"
import * as XLSX from "xlsx"
import { HUNTER_GROUPS } from "@/lib/hunters"

const TEAM_MONTHLY_TARGET = 720
const SP_MONTHLY_TARGET = 50

const now = new Date()
const currentWeek = getWeekNumber(now)
const currentYear = now.getFullYear()

function barColor(pct: number) {
  if (pct >= 100) return "#22c55e"
  if (pct >= 70) return "#E84500"
  return "#ef4444"
}

interface SpCardProps {
  name: string
  total: number
  weekTotal: number
  isCurrentMonth: boolean
}

function SpCard({ name, total, weekTotal, isCurrentMonth }: SpCardProps) {
  const pct = Math.min(Math.round((total / SP_MONTHLY_TARGET) * 100), 100)
  const weekPct = Math.min(Math.round((weekTotal / Math.round(SP_MONTHLY_TARGET / 4)) * 100), 100)
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="text-xs font-semibold text-white mb-2 truncate" title={name}>{name}</div>
      <div className="flex items-end gap-1 mb-1">
        <span className="text-xl font-bold text-white">{total}</span>
        <span className="text-xs text-slate-500 mb-0.5">/ {SP_MONTHLY_TARGET} visit</span>
      </div>
      <div className="h-1.5 rounded-full mb-2" style={{ background: "var(--surface2)" }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: barColor(pct) }} />
      </div>
      <div className="text-xs text-slate-500">{pct}% bulanan</div>
      {isCurrentMonth && (
        <div className="text-xs text-slate-600 mt-0.5">Minggu ini: {weekTotal} visit ({weekPct}%)</div>
      )}
    </div>
  )
}

interface HunterSectionProps {
  hunterName: string
  spNames: string[]
  visits: Visit[]
  userMap: Record<string, string>
  isCurrentMonth: boolean
}

function HunterSection({ hunterName, spNames, visits, userMap, isCurrentMonth }: HunterSectionProps) {
  const reverseMap: Record<string, string> = {}
  for (const [id, name] of Object.entries(userMap)) reverseMap[name] = id

  const hunterTotal = visits.reduce((s, v) => s + (v.count || 0), 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users size={14} style={{ color: "#E84500" }} />
        <h2 className="text-sm font-semibold text-white">{hunterName}</h2>
        <span className="text-xs text-slate-500 ml-1">{hunterTotal} visit tim bulan ini</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {spNames.map(spName => {
          const userId = reverseMap[spName]
          const spVisits = userId ? visits.filter(v => v.user_id === userId) : []
          const total = spVisits.reduce((s, v) => s + (v.count || 0), 0)
          const weekTotal = isCurrentMonth
            ? spVisits.filter(v => v.week_number === currentWeek && v.year === currentYear).reduce((s, v) => s + (v.count || 0), 0)
            : 0
          return (
            <SpCard key={spName} name={spName} total={total} weekTotal={weekTotal} isCurrentMonth={isCurrentMonth} />
          )
        })}
      </div>
    </div>
  )
}

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
    setVisits(isAdmin ? allVisits : allVisits.filter(v => v.user_id === user!.id))
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
  const monthTarget = isAdmin ? TEAM_MONTHLY_TARGET : SP_MONTHLY_TARGET
  const weekTarget = Math.round(monthTarget / 4)

  const totalMonth = visits.reduce((s, v) => s + (v.count || 0), 0)
  const totalWeek = visits.filter(v => {
    if (!isCurrentMonth) return false
    return v.week_number === currentWeek && v.year === currentYear
  }).reduce((s, v) => s + (v.count || 0), 0)

  const pctMonth = monthTarget > 0 ? Math.round((totalMonth / monthTarget) * 100) : 0
  const pctWeek = weekTarget > 0 ? Math.round((totalWeek / weekTarget) * 100) : 0

  const kpiCards = [
    { label: "Visit Bulan Ini", value: totalMonth, unit: "visit", sub: `Target ${monthTarget.toLocaleString("id-ID")}`, pct: pctMonth },
    { label: "% Bulan", value: `${pctMonth}%`, unit: "", sub: `${totalMonth} dari ${monthTarget} visit`, pct: pctMonth },
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

  const hunterGroups = isAdmin
    ? HUNTER_GROUPS
    : HUNTER_GROUPS.filter(g => g.dbName === user?.name || g.name === user?.name)

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
          {kpiCards.map((c, i) => (
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

        {/* Per-SP Cards grouped by Hunter */}
        {loading ? (
          <div className="text-center py-8 text-slate-600 text-sm">Memuat...</div>
        ) : (
          <div className="space-y-8">
            {hunterGroups.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-sm">Tidak ada data tim ditemukan</div>
            ) : hunterGroups.map(hunter => (
              <HunterSection
                key={hunter.dbName}
                hunterName={hunter.name}
                spNames={hunter.spNames}
                visits={visits}
                userMap={userMap}
                isCurrentMonth={isCurrentMonth}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
