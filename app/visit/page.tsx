"use client"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { getMonthName } from "@/lib/utils"
import { Upload, ChevronLeft, ChevronRight } from "lucide-react"
import type { Visit } from "@/types"
import * as XLSX from "xlsx"
import { HUNTER_GROUPS } from "@/lib/hunters"

function barColor(pct: number) {
  if (pct >= 100) return "#22c55e"
  if (pct >= 70) return "#E84500"
  return "#ef4444"
}

// ── Inline bar used inside group rows ──────────────────────────
function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-20 h-1 rounded-full flex-shrink-0" style={{ background: "var(--border)" }}>
      <div className="h-1 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  )
}

interface HunterSectionProps {
  hunter: { name: string; dbName: string; spNames: string[] }
  visits: Visit[]
  userIdMap: Record<string, string>
  userTargetMap: Record<string, number>
}

const LOKASI_MIN = 12

function HunterSection({ hunter, visits, userIdMap, userTargetMap }: HunterSectionProps) {
  const hunterId = userIdMap[hunter.dbName]
  const hunterTarget = hunterId ? (userTargetMap[hunterId] || 40) : 40

  const spIds = hunter.spNames.filter(n => !!userIdMap[n]).map(n => userIdMap[n])
  // Hunter visit = sum of accompanied_count across all their SPs
  const hunterVisits = visits
    .filter(v => spIds.includes(v.user_id))
    .reduce((s, v) => s + (v.accompanied_count || 0), 0)

  const hunterPct = hunterTarget > 0 ? Math.min(Math.round((hunterVisits / hunterTarget) * 100), 100) : 0
  const hunterColor = barColor(hunterPct)

  const spRows = hunter.spNames
    .filter(spName => !!userIdMap[spName])
    .map(spName => {
      const spId = userIdMap[spName]
      const spVisits = spId ? visits.filter(v => v.user_id === spId) : []
      // SP total = Visit Konsumen + Visit Lokasi + Accompanied
      const total  = spVisits.reduce((s, v) => s + (v.count || 0), 0)
      const lokasi = spVisits.reduce((s, v) => s + (v.visit_lokasi_count || 0), 0)
      const target = spId ? (userTargetMap[spId] || 40) : 40
      const pct = target > 0 ? Math.min(Math.round((total / target) * 100), 100) : 0
      return { name: spName, total, target, pct, lokasi, color: barColor(pct) }
    })

  return (
    <div className="rounded-xl overflow-hidden" style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
    }}>
      {/* ── Hunter header row ── */}
      <div className="flex items-center gap-3 px-4 py-3" style={{
        background: "var(--surface2)",
        borderBottom: spRows.length > 0 ? "1px solid var(--border)" : undefined,
      }}>
        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
          style={{ background: "rgba(234,92,0,0.15)", color: "#fb923c" }}>SH</span>
        <span className="text-sm font-bold flex-1 truncate" style={{ color: "var(--text-primary)" }}>
          {hunter.name}
        </span>
        <div className="flex items-center gap-3 flex-shrink-0">
          <MiniBar pct={hunterPct} color={hunterColor} />
          <span className="text-xs w-8 text-right" style={{ color: "var(--text-muted)" }}>
            {hunterVisits}<span style={{ color: "var(--text-muted)", opacity: 0.6 }}>/{hunterTarget}</span>
          </span>
          <span className="text-xs font-bold w-9 text-right" style={{ color: hunterColor }}>
            {hunterPct}%
          </span>
        </div>
      </div>

      {/* ── SP rows ── */}
      {spRows.map((sp, i) => {
        const lokasiOk = sp.lokasi >= LOKASI_MIN
        const lokasiColor = lokasiOk ? "#22c55e" : "#ef4444"
        return (
          <div key={sp.name} className="flex items-center gap-3 px-4 py-2.5" style={{
            borderBottom: i < spRows.length - 1 ? "1px solid var(--border)" : undefined,
          }}>
            <span className="text-xs flex-1 truncate pl-5" style={{ color: "var(--text-secondary)" }}>
              {sp.name}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Visit Lokasi indicator — min 12/month */}
              <span className="text-[10px] px-1 py-0.5 rounded font-medium"
                style={{ background: `${lokasiColor}18`, color: lokasiColor, minWidth: 28, textAlign: "center" }}>
                L:{sp.lokasi}
              </span>
              <MiniBar pct={sp.pct} color={sp.color} />
              <span className="text-xs w-8 text-right" style={{ color: "var(--text-muted)" }}>
                {sp.total}<span style={{ opacity: 0.6 }}>/{sp.target}</span>
              </span>
              <span className="text-xs font-semibold w-9 text-right" style={{ color: sp.color }}>
                {sp.pct}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const now = new Date()

/** Levenshtein edit distance — used for fuzzy name matching on import */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

export default function VisitPage() {
  const { user, isAdmin } = useAuth()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [visits, setVisits] = useState<Visit[]>([])
  const [userIdMap, setUserIdMap] = useState<Record<string, string>>({})
  const [userTargetMap, setUserTargetMap] = useState<Record<string, number>>({})
  const [userRoleMap, setUserRoleMap] = useState<Record<string, string>>({})
  /** dbName (hunter) → SP names who have that hunter_name in DB */
  const [hunterSpMap, setHunterSpMap] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [ytdMode, setYtdMode] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user) fetchData() }, [user, month, year, ytdMode, isAdmin])

  async function fetchData() {
    setLoading(true)
    let visitQuery = supabase.from("visit_logs").select("*")
    if (ytdMode) {
      visitQuery = visitQuery.eq("year", now.getFullYear()).lte("month", now.getMonth() + 1)
    } else {
      visitQuery = visitQuery.eq("year", year).eq("month", month)
    }

    const [visitRes, userRes] = await Promise.all([
      visitQuery.order("visit_date", { ascending: false }),
      supabase.from("users").select("id,name,visit_target,role,hunter_name").eq("status", "active"),
    ])
    let allVisits = (visitRes.data || []) as Visit[]

    // Build maps first — needed before filtering visits for non-admin
    const idMap: Record<string, string> = {}
    const targetMap: Record<string, number> = {}
    const roleMap: Record<string, string> = {}
    const spMap: Record<string, string[]> = {}
    for (const u of (userRes.data || [])) {
      idMap[u.name] = u.id
      targetMap[u.id] = u.visit_target || 40
      roleMap[u.id] = u.role
      if (u.hunter_name) {
        if (!spMap[u.hunter_name]) spMap[u.hunter_name] = []
        spMap[u.hunter_name].push(u.name)
      }
    }
    setUserIdMap(idMap)
    setUserTargetMap(targetMap)
    setUserRoleMap(roleMap)
    setHunterSpMap(spMap)

    if (ytdMode) {
      // Aggregate multiple monthly records into one per user
      const agg: Record<string, Visit> = {}
      for (const v of allVisits) {
        if (!agg[v.user_id]) agg[v.user_id] = { ...v, count: 0, accompanied_count: 0, visit_lokasi_count: 0 }
        agg[v.user_id].count              = (agg[v.user_id].count || 0)              + (v.count || 0)
        agg[v.user_id].accompanied_count  = (agg[v.user_id].accompanied_count || 0)  + (v.accompanied_count || 0)
        agg[v.user_id].visit_lokasi_count = (agg[v.user_id].visit_lokasi_count || 0) + (v.visit_lokasi_count || 0)
      }
      allVisits = Object.values(agg)
    }

    if (isAdmin) {
      setVisits(allVisits)
    } else {
      // Non-admin: include own records AND all SP records under this hunter
      // Hunters need SPs' visits because hunter visit = sum of SP accompanied_count
      const relevantIds = new Set<string>([user!.id])
      const mySpNames = spMap[user!.name] ?? []
      for (const spName of mySpNames) {
        const spId = idMap[spName]
        if (spId) relevantIds.add(spId)
      }
      setVisits(allVisits.filter(v => relevantIds.has(v.user_id)))
    }

    setLoading(false)
  }

  async function handleExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !isAdmin) return
    setMsg(null)

    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    // Read as array-of-arrays to handle the pivot header format
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 })

    const importMonth = month
    const importYear  = year
    // Use first day of the import month as the visit_date placeholder
    const visitDateStr = `${importYear}-${String(importMonth).padStart(2, "0")}-01`

    // Build case-insensitive lookup: lowercase(db name) → userId
    // Also support substring match for full names (e.g. "Jimmy Darmadi" matches "JIMMY DARMADI TJENDRA")
    const idMapLower: Record<string, string> = {}
    for (const [name, id] of Object.entries(userIdMap)) {
      idMapLower[name.toLowerCase()] = id
    }
    function resolveUserId(rawName: string): string | undefined {
      const lower = rawName.toLowerCase()
      // 1. Exact case-insensitive match
      if (idMapLower[lower]) return idMapLower[lower]
      // 2. DB name is a substring of Excel full name
      //    e.g. "Jimmy Darmadi" matches "JIMMY DARMADI TJENDRA"
      for (const [dbLower, id] of Object.entries(idMapLower)) {
        if (lower.includes(dbLower)) return id
      }
      // 3. Fuzzy: Levenshtein distance ≤ 4 — catches spelling variants
      //    e.g. "Dea Alvony Agista" vs "DEA ALVIONY AGISTA" (distance 1)
      //    Guard: first word must match or be very close (≤ 1) to avoid false positives
      const excelFirstWord = lower.split(" ")[0]
      let bestId: string | undefined
      let bestDist = 5 // threshold: accept up to 4 differences
      for (const [dbLower, id] of Object.entries(idMapLower)) {
        const dbFirstWord = dbLower.split(" ")[0]
        if (excelFirstWord !== dbFirstWord && levenshtein(excelFirstWord, dbFirstWord) > 1) continue
        const dist = levenshtein(lower, dbLower)
        if (dist <= 4 && dist < bestDist) { bestDist = dist; bestId = id }
      }
      return bestId
    }

    const inserts: {
      user_id: string; visit_date: string; visit_type: "konsumen";
      count: number; accompanied_count: number; visit_lokasi_count: number;
      notes: null; week_number: number; month: number; year: number
    }[] = []
    const skippedNames: string[] = []

    // Pivot format: row[0]=Name, row[1]=Visit Konsumen, row[2]=Accompanied, row[3]=Visit Lokasi
    // Skip rows 0-4 (empty/header/total rows); skip rows where col[0] is "Total" or starts with "PT."
    for (let i = 5; i < rawRows.length; i++) {
      const row = rawRows[i] as (string | number | null | undefined)[]
      const rawName = String(row[0] ?? "").trim()
      if (!rawName || rawName === "Total") continue
      // Skip agent company rows
      if (rawName.startsWith("PT.") || rawName.startsWith("PT ")) continue

      const userId = resolveUserId(rawName)
      if (!userId) { skippedNames.push(rawName); continue }

      const vk         = Number(row[1] ?? 0)  // Visit Konsumen
      const accompanied = Number(row[2] ?? 0) // Accompanied Visit (Didampingi Atasan)
      const vl         = Number(row[3] ?? 0)  // Visit Lokasi
      // SP total visit = VK + VL + Accompanied
      const count = vk + vl + accompanied
      if (count <= 0 && accompanied <= 0) continue

      inserts.push({
        user_id:            userId,
        visit_date:         visitDateStr,
        visit_type:         "konsumen" as const,
        count,                     // SP total
        accompanied_count:  accompanied,
        visit_lokasi_count: vl,
        notes:              null,
        week_number:        1,
        month:              importMonth,
        year:               importYear,
      })
    }

    if (inserts.length === 0) {
      const hint = skippedNames.length > 0 ? ` Nama tidak cocok: ${skippedNames.join(", ")}` : ""
      setMsg({ type: "err", text: `Tidak ada data valid di file Excel.${hint}` })
      if (fileRef.current) fileRef.current.value = ""
      return
    }

    // Additive: do NOT delete existing records — just insert new batch
    const { error } = await supabase.from("visit_logs").insert(inserts)
    if (error) {
      setMsg({ type: "err", text: error.message })
    } else {
      const skippedHint = skippedNames.length > 0
        ? ` | Tidak cocok: ${skippedNames.join(", ")}`
        : ""
      setMsg({ type: "ok", text: `${inserts.length} user diimport (data ditambahkan).${skippedHint}` })
      fetchData()
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  const ytdM = ytdMode ? (now.getMonth() + 1) : 1
  const displayTargetMap = ytdM === 1 ? userTargetMap : Object.fromEntries(
    Object.entries(userTargetMap).map(([k, v]) => [k, v * ytdM])
  )

  const isHunterUser = user ? userRoleMap[user.id] === "hunter" : false

  // Hunter's personal KPI = sum of accompanied_count from their SPs' visits
  // SP's personal KPI = sum of their own count
  const totalMonth = (() => {
    if (!user) return 0
    if (isHunterUser) {
      const mySpIds = new Set(
        (hunterSpMap[user.name] ?? []).map(n => userIdMap[n]).filter(Boolean)
      )
      return visits.filter(v => mySpIds.has(v.user_id)).reduce((s, v) => s + (v.accompanied_count || 0), 0)
    }
    return visits.filter(v => v.user_id === user.id).reduce((s, v) => s + (v.count || 0), 0)
  })()
  const myTarget = user ? ((displayTargetMap[user.id]) || 40) : 40
  const pctMonth = myTarget > 0 ? Math.round((totalMonth / myTarget) * 100) : 0

  const kpiCards = [
    { label: ytdMode ? "Visit YTD" : "Visit Bulan Ini", value: totalMonth, unit: "visit", sub: `Target ${myTarget}`, pct: pctMonth },
    { label: ytdMode ? "% YTD" : "% Bulan Ini",         value: `${pctMonth}%`, unit: "", sub: `${totalMonth} dari ${myTarget} visit`, pct: pctMonth },
  ]

  const hunterIds = new Set(
    Object.entries(userRoleMap).filter(([, role]) => role === "hunter").map(([id]) => id)
  )
  const spIdSet = new Set(
    Object.entries(userRoleMap).filter(([, role]) => role === "sales_person").map(([id]) => id)
  )

  // Hunter visit total = sum of accompanied_count from all SPs
  const hunterVisitTotal = visits.filter(v => spIdSet.has(v.user_id)).reduce((s, v) => s + (v.accompanied_count || 0), 0)
  const hunterTargetTotal = Array.from(hunterIds).reduce((s, id) => s + (displayTargetMap[id] || 0), 0)
  const hunterPct = hunterTargetTotal > 0 ? Math.round((hunterVisitTotal / hunterTargetTotal) * 100) : 0

  const spVisitTotal = visits.filter(v => spIdSet.has(v.user_id)).reduce((s, v) => s + (v.count || 0), 0)
  const spTargetTotal = Array.from(spIdSet).reduce((s, id) => s + (displayTargetMap[id] || 0), 0)
  const spPct = spTargetTotal > 0 ? Math.round((spVisitTotal / spTargetTotal) * 100) : 0

  const hunterGroupsRaw = isAdmin
    ? HUNTER_GROUPS
    : HUNTER_GROUPS.filter(g => g.dbName === user?.name || g.name === user?.name)
  // Merge DB-driven SP list into each group (falls back to empty array if not yet loaded)
  const hunterGroups = hunterGroupsRaw.map(g => ({
    ...g,
    spNames: hunterSpMap[g.dbName] ?? [],
  }))

  return (
    <DashboardShell>
      <div className="space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Visit</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isAdmin ? "Rekap kunjungan semua hunter" : "Rekap kunjungan tim Anda"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} disabled={ytdMode}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <ChevronLeft size={14} />
            </button>
            <div className="text-sm font-semibold text-white min-w-[130px] text-center">
              {ytdMode ? `Jan – ${getMonthName(now.getMonth() + 1)} ${year}` : `${getMonthName(month)} ${year}`}
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
            {isAdmin && (
              <>
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg text-slate-400 hover:text-white transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <Upload size={13} /> Import Excel
                </button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcel} />
              </>
            )}
          </div>
        </div>

        {msg && (
          <div className={`text-xs p-3 rounded-lg ${msg.type === "ok" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {msg.text}
          </div>
        )}

        {/* KPI Cards */}
        {isAdmin ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { label: ytdMode ? "Visit Hunter YTD" : "Visit Hunter", value: hunterVisitTotal, unit: "visit", sub: `Target ${hunterTargetTotal}`, pct: hunterPct },
              { label: ytdMode ? "% Hunter YTD"    : "% Hunter",     value: `${hunterPct}%`,  unit: "",      sub: `${hunterVisitTotal}/${hunterTargetTotal}`,  pct: hunterPct },
              { label: ytdMode ? "Visit SP YTD"    : "Visit SP",     value: spVisitTotal,      unit: "visit", sub: `Target ${spTargetTotal}`, pct: spPct },
              { label: ytdMode ? "% SP YTD"        : "% SP",         value: `${spPct}%`,       unit: "",      sub: `${spVisitTotal}/${spTargetTotal}`,           pct: spPct },
            ].map((c, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>{c.label}</div>
                <div className="text-lg font-bold mb-0.5" style={{ color: i % 2 === 0 ? "var(--text-primary)" : barColor(c.pct) }}>
                  {c.value}{c.unit && <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>{c.unit}</span>}
                </div>
                <div className="text-[10px] mb-1.5" style={{ color: "var(--text-muted)" }}>{c.sub}</div>
                <div className="h-1 rounded-full" style={{ background: "var(--border)" }}>
                  <div className="h-1 rounded-full transition-all" style={{ width: `${Math.min(c.pct, 100)}%`, background: barColor(c.pct) }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {kpiCards.map((c, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>{c.label}</div>
                <div className="text-lg font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>
                  {c.value}{c.unit && <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>{c.unit}</span>}
                </div>
                <div className="text-[10px] mb-1.5" style={{ color: "var(--text-muted)" }}>{c.sub}</div>
                {c.pct > 0 && (
                  <div className="h-1 rounded-full" style={{ background: "var(--border)" }}>
                    <div className="h-1 rounded-full transition-all" style={{ width: `${Math.min(c.pct, 100)}%`, background: barColor(c.pct) }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Per-Hunter + SP cards */}
        {loading ? (
          <div className="text-center py-8 text-slate-600 text-sm">Memuat...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hunterGroups.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>Tidak ada data tim ditemukan</div>
            ) : hunterGroups.map(hunter => (
              <HunterSection
                key={hunter.dbName}
                hunter={hunter}
                visits={visits}
                userIdMap={userIdMap}
                userTargetMap={displayTargetMap}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
