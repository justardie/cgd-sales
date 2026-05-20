"use client"
import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { LeadStatus, LEAD_STATUS_CONFIG } from "@/types"

interface TmUser { id: string; name: string; hunter_name: string }

interface TmStat {
  tm: TmUser
  total: number
  new: number
  tidak_aktif: number
  bisa_dihub_tidak_angkat: number
  angkat_tertarik: number
  angkat_tidak_tertarik: number
  visit_dijadwalkan: number
  sudah_visit: number
  closing: number
  lost: number
}

const STATUS_COLS: { key: LeadStatus; color: string }[] = [
  { key: "new",                     color: "#94a3b8" },
  { key: "bisa_dihub_tidak_angkat", color: "#fbbf24" },
  { key: "angkat_tertarik",         color: "#4ade80" },
  { key: "visit_dijadwalkan",       color: "#a78bfa" },
  { key: "sudah_visit",             color: "#2dd4bf" },
  { key: "closing",                 color: "#34d399" },
  { key: "angkat_tidak_tertarik",   color: "#93c5fd" },
  { key: "tidak_aktif",             color: "#f87171" },
  { key: "lost",                    color: "#9ca3af" },
]

function ProgressBar({ stat }: { stat: TmStat }) {
  if (stat.total === 0) return (
    <div style={{ height: "6px", borderRadius: "3px", background: "var(--border)", flex: 1 }} />
  )
  return (
    <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", flex: 1, gap: "1px" }}>
      {STATUS_COLS.map(({ key, color }) => {
        const val = stat[key as keyof TmStat] as number
        const pct = (val / stat.total) * 100
        if (pct === 0) return null
        return (
          <div
            key={key}
            style={{ width: `${pct}%`, background: color, borderRadius: "2px", transition: "width 0.4s ease" }}
            title={`${LEAD_STATUS_CONFIG[key].result}: ${val}`}
          />
        )
      })}
    </div>
  )
}

function StatPill({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "52px" }}>
      <span style={{ fontSize: "16px", fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px", textAlign: "center", lineHeight: 1.2, maxWidth: "54px" }}>{label}</span>
    </div>
  )
}

export default function FunnelSummaryPage() {
  const { user } = useAuth()
  const role     = user?.role ?? ""
  const isAdmin  = role === "admin"
  const isDgm    = role === "dgm" || isAdmin   // admin sees everything DGM sees
  const isTm     = role === "telemarketing" || (user?.has_tm_access ?? false)
  const isHunter = role === "hunter"

  const now = new Date()
  const [period, setPeriod]   = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [stats, setStats]     = useState<TmStat[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSummary = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // 1. Determine which TM users are visible
    let tmQuery = supabase
      .from("users")
      .select("id, name, hunter_name")
      .eq("has_tm_access", true)
      .eq("status", "active")
      .order("name")
    if (isTm)     tmQuery = tmQuery.eq("id", user.id)
    if (isHunter) tmQuery = tmQuery.eq("hunter_name", user.name)

    const { data: tmData } = await tmQuery
    const tmUsers = (tmData ?? []) as TmUser[]
    if (tmUsers.length === 0) { setStats([]); setLoading(false); return }

    // 2. Fetch only assigned_to + status (no phone numbers)
    const ids = tmUsers.map((t) => t.id)
    const { data: leadsData } = await supabase
      .from("leads")
      .select("assigned_to, status")
      .in("assigned_to", ids)
      .eq("period", period)

    const leads = (leadsData ?? []) as { assigned_to: string; status: LeadStatus }[]

    // 3. Aggregate per TM
    const result: TmStat[] = tmUsers.map((tm) => {
      const mine = leads.filter((l) => l.assigned_to === tm.id)
      return {
        tm,
        total:                    mine.length,
        new:                      mine.filter((l) => l.status === "new").length,
        tidak_aktif:              mine.filter((l) => l.status === "tidak_aktif").length,
        bisa_dihub_tidak_angkat:  mine.filter((l) => l.status === "bisa_dihub_tidak_angkat").length,
        angkat_tertarik:          mine.filter((l) => l.status === "angkat_tertarik").length,
        angkat_tidak_tertarik:    mine.filter((l) => l.status === "angkat_tidak_tertarik").length,
        visit_dijadwalkan:        mine.filter((l) => l.status === "visit_dijadwalkan").length,
        sudah_visit:              mine.filter((l) => l.status === "sudah_visit").length,
        closing:                  mine.filter((l) => l.status === "closing").length,
        lost:                     mine.filter((l) => l.status === "lost").length,
      }
    })

    setStats(result)
    setLoading(false)
  }, [user, isTm, isHunter, period])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  // Team totals
  const teamTotal: Omit<TmStat, "tm"> = {
    total:                    stats.reduce((s, t) => s + t.total, 0),
    new:                      stats.reduce((s, t) => s + t.new, 0),
    tidak_aktif:              stats.reduce((s, t) => s + t.tidak_aktif, 0),
    bisa_dihub_tidak_angkat:  stats.reduce((s, t) => s + t.bisa_dihub_tidak_angkat, 0),
    angkat_tertarik:          stats.reduce((s, t) => s + t.angkat_tertarik, 0),
    angkat_tidak_tertarik:    stats.reduce((s, t) => s + t.angkat_tidak_tertarik, 0),
    visit_dijadwalkan:        stats.reduce((s, t) => s + t.visit_dijadwalkan, 0),
    sudah_visit:              stats.reduce((s, t) => s + t.sudah_visit, 0),
    closing:                  stats.reduce((s, t) => s + t.closing, 0),
    lost:                     stats.reduce((s, t) => s + t.lost, 0),
  }

  const card: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "16px", padding: "20px 24px", boxShadow: "var(--shadow-sm)",
  }
  const lbl: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600 as const, color: "var(--text-muted)",
    textTransform: "uppercase" as const, letterSpacing: "0.06em",
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Summary Funnel Leads</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
            {isTm
              ? "Ringkasan leads kamu"
              : isHunter
              ? "Ringkasan tim telemarketing kamu"
              : "Ringkasan seluruh tim telemarketing"}
          </p>
        </div>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{
            background: "var(--surface2)", border: "1px solid var(--border-medium)",
            borderRadius: "10px", padding: "7px 12px", color: "var(--text-primary)",
            fontSize: "12px", outline: "none", colorScheme: "dark",
          }}
        />
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
        {STATUS_COLS.map(({ key, color }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>
              {LEAD_STATUS_CONFIG[key].result}
            </span>
          </div>
        ))}
      </div>

      {/* Team aggregate (DGM or Hunter with multiple TMs) */}
      {!isTm && stats.length > 1 && (
        <div style={{ ...card, marginBottom: "16px", background: "var(--surface2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div style={{ ...lbl, marginBottom: "4px" }}>Total Tim</div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--accent)", letterSpacing: "-1px" }}>
                {teamTotal.total}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                leads · {stats.length} TM aktif
              </div>
            </div>
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
              <StatPill value={teamTotal.new}                     color="#94a3b8" label="Belum" />
              <StatPill value={teamTotal.bisa_dihub_tidak_angkat} color="#fbbf24" label="Follow Up" />
              <StatPill value={teamTotal.angkat_tertarik + teamTotal.visit_dijadwalkan + teamTotal.sudah_visit} color="#a78bfa" label="Pipeline" />
              <StatPill value={teamTotal.closing}                  color="#34d399" label="Closing" />
              <StatPill value={teamTotal.angkat_tidak_tertarik + teamTotal.tidak_aktif + teamTotal.lost} color="#f87171" label="Dead" />
            </div>
          </div>
          {teamTotal.total > 0 && (
            <div style={{ marginTop: "14px" }}>
              <ProgressBar stat={{ tm: { id: "", name: "", hunter_name: "" }, ...teamTotal }} />
            </div>
          )}
        </div>
      )}

      {/* Per-TM rows */}
      {loading ? (
        <div style={{ ...card, textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
          Memuat data...
        </div>
      ) : stats.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
          Belum ada data leads untuk periode ini.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {stats.map((stat) => {
            const contacted    = stat.total - stat.new
            const contactedPct = stat.total > 0 ? Math.round((contacted / stat.total) * 100) : 0
            const pipeline     = stat.angkat_tertarik + stat.visit_dijadwalkan + stat.sudah_visit + stat.closing
            const visitPct     = stat.total > 0 ? Math.round((pipeline / stat.total) * 100) : 0

            return (
              <div key={stat.tm.id} style={{ ...card, padding: "18px 22px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>

                  {/* Name + meta */}
                  <div style={{ minWidth: "160px", flex: "0 0 160px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "2px" }}>
                      {stat.tm.name}
                    </div>
                    {!isTm && stat.tm.hunter_name && (
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        Hunter: {stat.tm.hunter_name}
                      </div>
                    )}
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {contacted}/{stat.total} dihubungi ({contactedPct}%)
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", flex: 1, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
                        {stat.total}
                      </span>
                      <span style={{ ...lbl, lineHeight: 1.3 }}>Total<br />Leads</span>
                    </div>

                    <div style={{ width: "1px", height: "32px", background: "var(--border)", flexShrink: 0 }} />

                    <StatPill value={stat.new}                    color="#94a3b8" label="Belum" />
                    <StatPill value={stat.bisa_dihub_tidak_angkat} color="#fbbf24" label="Follow Up" />
                    <StatPill value={stat.angkat_tertarik + stat.visit_dijadwalkan + stat.sudah_visit} color="#a78bfa" label="Pipeline" />
                    <StatPill value={stat.closing}                 color="#34d399" label="Closing" />
                    <StatPill value={stat.angkat_tidak_tertarik + stat.tidak_aktif + stat.lost} color="#f87171" label="Dead" />

                    <div style={{ width: "1px", height: "32px", background: "var(--border)", flexShrink: 0 }} />

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "52px" }}>
                      <span style={{ fontSize: "16px", fontWeight: 700, color: "#4ade80", lineHeight: 1 }}>
                        {visitPct}%
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px", textAlign: "center", lineHeight: 1.2 }}>
                        Conv.<br />Rate
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                {stat.total > 0 && (
                  <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <ProgressBar stat={stat} />
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {contactedPct}% reached
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
