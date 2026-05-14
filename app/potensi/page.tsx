"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, normalizeProject, PROJECT_NAMES } from "@/lib/utils"
import { HUNTER_GROUPS } from "@/lib/hunters"
import type { User } from "@/types"

interface KonsumenRow {
  sales_hunter: string
  project: string | null
  status: string
  potensi_closing: number | null
  nilai_hjr: number | null
  closing_month: number | null
  closing_year: number | null
}


function barColor(pct: number) {
  if (pct >= 100) return "#22c55e"
  if (pct >= 70)  return "#E84500"
  return "#ef4444"
}

export default function PotensiPage() {
  const { user, isAdmin } = useAuth()
  const [rows, setRows]       = useState<KonsumenRow[]>([])
  const [hunters, setHunters] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [year, setYear]   = useState(new Date().getFullYear())

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user) fetchData() }, [user, month, year])

  async function fetchData() {
    setLoading(true)
    const [konsumenRes, usersRes] = await Promise.all([
      supabase.from("konsumen")
        .select("sales_hunter,project,status,potensi_closing,nilai_hjr,closing_month,closing_year")
        .in("status", ["warm", "hot", "closing"]),
      supabase.from("users")
        .select("id,name,monthly_target,role,status")
        .eq("status", "active")
        .eq("role", "hunter"),
    ])
    setHunters((usersRes.data || []) as User[])
    const all = (konsumenRes.data || []) as KonsumenRow[]
    if (isAdmin) {
      setRows(all)
    } else {
      const name = (user!.name || "").toLowerCase()
      setRows(all.filter(r => (r.sales_hunter || "").toLowerCase() === name))
    }
    setLoading(false)
  }

  const pipelineRows = rows.filter(r => r.status === "warm" || r.status === "hot")
  const closingMTD   = rows.filter(r => r.status === "closing" && r.closing_month === month && r.closing_year === year)
  const closingYTD   = rows.filter(r => r.status === "closing" && r.closing_year === year)

  const totalPotensi    = pipelineRows.reduce((s, r) => s + (Number(r.potensi_closing) || 0), 0)
  const totalClosingMTD = closingMTD.reduce((s, r) => s + (Number(r.nilai_hjr) || 0), 0)
  const totalClosingYTD = closingYTD.reduce((s, r) => s + (Number(r.nilai_hjr) || 0), 0)
  const totalTargetMTD  = hunters.reduce((s, h) => s + (h.monthly_target || 0), 0)
  const pctMTD          = totalTargetMTD > 0 ? Math.round((totalClosingMTD / totalTargetMTD) * 100) : 0

  const byProject = PROJECT_NAMES.map(proj => {
    const pRows = pipelineRows.filter(r => normalizeProject(r.project) === proj)
    const cRows = closingMTD.filter(r => normalizeProject(r.project) === proj)
    return {
      project:       proj,
      pipelineCount: pRows.length,
      pipelineValue: pRows.reduce((s, r) => s + (Number(r.potensi_closing) || 0), 0),
      closingCount:  cRows.length,
      closingValue:  cRows.reduce((s, r) => s + (Number(r.nilai_hjr) || 0), 0),
    }
  }).filter(p => p.pipelineCount > 0 || p.closingCount > 0)

  const displayHunters = HUNTER_GROUPS
    .map(g => hunters.find(h => h.name === g.dbName || h.name === g.name))
    .filter((h): h is User => !!h)

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-white">Potensi</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pipeline aktif + Closing MTD · {new Date().toLocaleString("id-ID", { month: "long", year: "numeric" })}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs text-slate-500 mb-1">Total Potensi Pipeline</div>
            <div className="text-xl font-bold" style={{ color: "#E84500" }}>{formatRupiah(totalPotensi)}</div>
            <div className="text-xs text-slate-600 mt-0.5">{pipelineRows.length} prospek aktif</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs text-slate-500 mb-1">Closing MTD</div>
            <div className="text-xl font-bold text-green-400">{formatRupiah(totalClosingMTD)}</div>
            <div className="text-xs text-slate-600 mt-0.5">{closingMTD.length} transaksi bulan ini</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs text-slate-500 mb-1">Target MTD</div>
            <div className="text-xl font-bold text-white">{formatRupiah(totalTargetMTD)}</div>
            <div className="text-xs mt-0.5" style={{ color: barColor(pctMTD) }}>
              {totalTargetMTD > 0 ? `${pctMTD}% tercapai` : "—"}
            </div>
            {totalTargetMTD > 0 && (
              <div className="mt-2 h-1.5 rounded-full" style={{ background: "var(--surface2)" }}>
                <div className="h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(pctMTD, 100)}%`, background: barColor(pctMTD) }} />
              </div>
            )}
          </div>
          <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-xs text-slate-500 mb-1">{`Closing YTD ${year}`}</div>
            <div className="text-xl font-bold text-blue-400">{formatRupiah(totalClosingYTD)}</div>
            <div className="text-xs text-slate-600 mt-0.5">{closingYTD.length} transaksi tahun ini</div>
          </div>
        </div>

        {/* Per-Hunter Cards (admin only) */}
        {!loading && isAdmin && displayHunters.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Per Hunter</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {displayHunters.map(hunter => {
                const hunterName  = (hunter.name || "").toLowerCase()
                const hPipeline   = pipelineRows.filter(r => (r.sales_hunter || "").toLowerCase() === hunterName)
                const hClosingMTD = closingMTD.filter(r => (r.sales_hunter || "").toLowerCase() === hunterName)
                const pipelineVal = hPipeline.reduce((s, r) => s + (Number(r.potensi_closing) || 0), 0)
                const closingVal  = hClosingMTD.reduce((s, r) => s + (Number(r.nilai_hjr) || 0), 0)
                const pct         = hunter.monthly_target > 0 ? Math.round((closingVal / hunter.monthly_target) * 100) : 0
                return (
                  <div key={hunter.id} className="rounded-xl p-3"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="text-xs text-slate-400 font-medium truncate mb-2">{hunter.name}</div>
                    <div className="text-[10px] text-slate-600 mb-0.5">Pipeline</div>
                    <div className="text-sm font-bold mb-2" style={{ color: "#E84500" }}>
                      {pipelineVal ? formatRupiah(pipelineVal) : "—"}
                    </div>
                    <div className="text-[10px] text-slate-600 mb-0.5">Closing MTD</div>
                    <div className="text-sm font-bold text-green-400">
                      {closingVal ? formatRupiah(closingVal) : "—"}
                    </div>
                    <div className="mt-2 h-1 rounded-full" style={{ background: "var(--surface2)" }}>
                      <div className="h-1 rounded-full"
                        style={{ width: `${Math.min(pct, 100)}%`, background: barColor(pct) }} />
                    </div>
                    <div className={`text-xs font-bold mt-1 ${pct >= 100 ? "text-green-400" : pct >= 70 ? "text-orange-400" : "text-red-400"}`}>
                      {pct}% target
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Per-Project Breakdown */}
        {!loading && byProject.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="px-4 py-3 text-sm font-semibold text-white"
              style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
              Breakdown per Proyek
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                    <th className="px-4 py-2 text-left text-xs text-slate-500 font-medium">Proyek</th>
                    <th className="px-4 py-2 text-right text-xs text-slate-500 font-medium">Pipeline</th>
                    <th className="px-4 py-2 text-right text-xs text-slate-500 font-medium">Nilai Potensi</th>
                    <th className="px-4 py-2 text-right text-xs text-slate-500 font-medium">Closing MTD</th>
                    <th className="px-4 py-2 text-right text-xs text-slate-500 font-medium">Omset MTD</th>
                  </tr>
                </thead>
                <tbody>
                  {byProject.map(p => (
                    <tr key={p.project} style={{ borderBottom: "1px solid var(--border)" }}
                      className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-xs font-medium text-white">{p.project}</td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">{p.pipelineCount || "—"}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold" style={{ color: "#E84500" }}>
                        {p.pipelineValue ? formatRupiah(p.pipelineValue) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-400">{p.closingCount || "—"}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-green-400">
                        {p.closingValue ? formatRupiah(p.closingValue) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border-medium)", background: "var(--surface2)" }}>
                    <td className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Total</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-slate-300">{pipelineRows.length}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: "#E84500" }}>{formatRupiah(totalPotensi)}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-slate-300">{closingMTD.length}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-green-400">{formatRupiah(totalClosingMTD)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {loading && <div className="text-center py-8 text-slate-600 text-sm">Memuat...</div>}
        {!loading && rows.length === 0 && (
          <div className="text-center py-12 text-slate-600 text-sm">Belum ada data pipeline atau closing</div>
        )}
      </div>
    </DashboardShell>
  )
}
