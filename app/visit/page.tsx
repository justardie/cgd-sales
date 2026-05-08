"use client"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { getMonthName, getWeekNumber } from "@/lib/utils"
import { Upload, ChevronLeft, ChevronRight } from "lucide-react"
import type { Visit } from "@/types"
import * as XLSX from "xlsx"
import { HUNTER_GROUPS } from "@/lib/hunters"

function barColor(pct: number) {
  if (pct >= 100) return "#22c55e"
  if (pct >= 70) return "#E84500"
  return "#ef4444"
}

interface PersonCardProps {
  name: string
  total: number
  target: number
  isHunter?: boolean
}

function PersonCard({ name, total, target, isHunter }: PersonCardProps) {
  const pct = target > 0 ? Math.min(Math.round((total / target) * 100), 100) : 0
  return (
    <div className="rounded-xl p-4"
      style={{ background: "var(--surface)", border: `1px solid ${isHunter ? "rgba(234,92,0,0.35)" : "var(--border)"}` }}>
      {isHunter ? (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-orange-500/10 text-orange-400">SH</span>
          <span className="text-xs font-semibold text-white truncate" title={name}>{name}</span>
        </div>
      ) : (
        <div className="text-xs font-semibold text-white mb-2 truncate" title={name}>{name}</div>
      )}
      <div className="flex items-end gap-1 mb-1">
        <span className="text-xl font-bold text-white">{total}</span>
        <span className="text-xs text-slate-500 mb-0.5">/ {target} visit</span>
      </div>
      <div className="h-1.5 rounded-full mb-2" style={{ background: "var(--surface2)" }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: barColor(pct) }} />
      </div>
      <div className={`text-xs font-semibold ${pct >= 100 ? "text-green-400" : pct >= 70 ? "text-orange-400" : "text-red-400"}`}>
        {pct}% bulanan
      </div>
    </div>
  )
}

interface HunterSectionProps {
  hunter: { name: string; dbName: string; spNames: string[] }
  visits: Visit[]
  userIdMap: Record<string, string>
  userTargetMap: Record<string, number>
}

function HunterSection({ hunter, visits, userIdMap, userTargetMap }: HunterSectionProps) {
  const hunterId = userIdMap[hunter.dbName]
  const hunterVisits = hunterId
    ? visits.filter(v => v.user_id === hunterId).reduce((s, v) => s + (v.count || 0), 0)
    : 0
  const hunterTarget = hunterId ? (userTargetMap[hunterId] || 60) : 60

  return (
    <div className="space-y-3">
      {/* Hunter card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <PersonCard name={hunter.name} total={hunterVisits} target={hunterTarget} isHunter />
      </div>

      {/* SP cards indented under hunter */}
      {hunter.spNames.length > 0 && (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
          style={{ paddingLeft: "1rem", borderLeft: "2px solid var(--border)" }}>
          {hunter.spNames.map(spName => {
            const spId = userIdMap[spName]
            const total = spId
              ? visits.filter(v => v.user_id === spId).reduce((s, v) => s + (v.count || 0), 0)
              : 0
            const target = spId ? (userTargetMap[spId] || 40) : 40
            return <PersonCard key={spName} name={spName} total={total} target={target} />
          })}
        </div>
      )}
    </div>
  )
}

const now = new Date()

export default function VisitPage() {
  const { user, isAdmin } = useAuth()
  const [visits, setVisits] = useState<Visit[]>([])
  const [userIdMap, setUserIdMap] = useState<Record<string, string>>({})
  const [userTargetMap, setUserTargetMap] = useState<Record<string, number>>({})
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
      supabase.from("users").select("id,name,visit_target").eq("status", "active"),
    ])
    const allVisits = (visitRes.data || []) as Visit[]
    setVisits(isAdmin ? allVisits : allVisits.filter(v => v.user_id === user!.id))

    const idMap: Record<string, string> = {}
    const targetMap: Record<string, number> = {}
    for (const u of (userRes.data || [])) {
      idMap[u.name] = u.id
      targetMap[u.id] = u.visit_target || 40
    }
    setUserIdMap(idMap)
    setUserTargetMap(targetMap)
    setLoading(false)
  }

  async function handleExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMsg(null)
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]])

    // Replace all existing records for this user + selected month/year
    await supabase.from("visit_logs")
      .delete()
      .eq("user_id", user!.id)
      .eq("month", month)
      .eq("year", year)

    const inserts = rows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: Record<string, any>) => {
        const d = new Date(r.tanggal ?? r.Tanggal ?? Date.now())
        // VISIT = Visit Konsumen + Visit Lokasi
        const vk = Number(r["visit_konsumen"] ?? r["Visit Konsumen"] ?? r["VISIT KONSUMEN"] ?? 0)
        const vl = Number(r["visit_lokasi"]   ?? r["Visit Lokasi"]   ?? r["VISIT LOKASI"]   ?? 0)
        const count = vk + vl > 0
          ? vk + vl
          : Number(r.jumlah ?? r.VISIT ?? r.visit ?? r.total ?? 1)
        return {
          user_id: user!.id,
          visit_date: d.toISOString().slice(0, 10),
          visit_type: "konsumen" as const,
          count,
          notes: (r.catatan ?? r.notes ?? null) as string | null,
          week_number: getWeekNumber(d),
          month: d.getMonth() + 1,
          year: d.getFullYear(),
        }
      })
      .filter((r: { count: number }) => r.count > 0)

    if (inserts.length === 0) {
      setMsg({ type: "err", text: "Tidak ada data valid di file Excel" })
    } else {
      const { error } = await supabase.from("visit_logs").insert(inserts)
      if (error) setMsg({ type: "err", text: error.message })
      else { setMsg({ type: "ok", text: `${inserts.length} baris diimport — data lama diganti` }); fetchData() }
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  const totalMonth = visits.reduce((s, v) => s + (v.count || 0), 0)
  const myTarget = user ? (userTargetMap[user.id] || 40) : 40
  const pctMonth = myTarget > 0 ? Math.round((totalMonth / myTarget) * 100) : 0

  const kpiCards = [
    { label: "Visit Bulan Ini", value: totalMonth, unit: "visit", sub: `Target ${myTarget}`, pct: pctMonth },
    { label: "% Bulanan", value: `${pctMonth}%`, unit: "", sub: `${totalMonth} dari ${myTarget} visit`, pct: pctMonth },
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

        {/* 2 KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
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

        {/* Per-Hunter + SP cards */}
        {loading ? (
          <div className="text-center py-8 text-slate-600 text-sm">Memuat...</div>
        ) : (
          <div className="space-y-8">
            {hunterGroups.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-sm">Tidak ada data tim ditemukan</div>
            ) : hunterGroups.map(hunter => (
              <HunterSection
                key={hunter.dbName}
                hunter={hunter}
                visits={visits}
                userIdMap={userIdMap}
                userTargetMap={userTargetMap}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
