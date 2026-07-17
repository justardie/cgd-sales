import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { formatRupiah } from "@/lib/utils"

export interface ClosingReportRow {
  hunter: string
  salesPerson: string
  konsumen: string
  project: string
  unit: string
  nilaiOmset: number
  caraBayar: string
  closingDate: string
}

export interface ClosingReportProps {
  periodLabel: string
  generatedAt: string
  mtdValue: number
  mtdTarget: number
  topHunter: { name: string; omset: number; pct: number } | null
  topSales: { name: string; omset: number } | null
  targetAlertHunters: { name: string; omset: number; target: number }[]
  projectData: { name: string; value: number }[]
  rows: ClosingReportRow[]
  totalOmset: number
  totalCount: number
}

const PIE_COLORS = ["#FF6A3D", "#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ec4899"]
const MAX_ROWS = 25

const REPORT_WIDTH = 1200
const REPORT_HEIGHT = 850

const ink        = "#0F172A"
const inkMuted   = "#64748B"
const inkFaint   = "#94A3B8"
const border     = "#E2E8F0"
const surface    = "#F8FAFC"
const accent     = "#FF6A3D"
const green      = "#16A34A"
const amber      = "#B45309"
const amberBg    = "#FFFBEB"
const amberBorder = "#FDE68A"

export default function ClosingReportTemplate({
  periodLabel, generatedAt, mtdValue, mtdTarget, topHunter, topSales,
  targetAlertHunters, projectData, rows, totalOmset, totalCount,
}: ClosingReportProps) {
  const mtdPct = mtdTarget > 0 ? Math.round((mtdValue / mtdTarget) * 100) : 0
  const visibleRows = rows.slice(0, MAX_ROWS)
  const hiddenCount = rows.length - visibleRows.length
  const alertHunters = targetAlertHunters.slice(0, 6)

  return (
    <div style={{
      width: REPORT_WIDTH, height: REPORT_HEIGHT, background: "#FFFFFF", color: ink,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "28px 34px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `2px solid ${ink}`, paddingBottom: 10 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>Report Closing</div>
          <div style={{ fontSize: 11, color: inkMuted, marginTop: 2 }}>PT Central Group Development · MASCOL Division</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{periodLabel}</div>
          <div style={{ fontSize: 10, color: inkFaint, marginTop: 2 }}>Dibuat {generatedAt}</div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: inkMuted, textTransform: "uppercase" }}>Omset MTD</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{formatRupiah(mtdValue)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: inkMuted }}>Target Tim: {formatRupiah(mtdTarget)}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: mtdPct >= 100 ? green : mtdPct >= 70 ? accent : "#DC2626" }}>{mtdPct}%</div>
          </div>
        </div>
      </div>

      {/* Top performers + Target alert */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: inkMuted, textTransform: "uppercase" }}>🏆 Top Sales Hunter</div>
          {topHunter ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{topHunter.name}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: accent }}>{formatRupiah(topHunter.omset)}</div>
              <div style={{ fontSize: 10, color: inkMuted }}>Capaian bulan ini: {topHunter.pct}%</div>
            </>
          ) : <div style={{ fontSize: 11, color: inkFaint, marginTop: 6 }}>Belum ada closing bulan ini</div>}
        </div>
        <div style={{ flex: 1, background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: inkMuted, textTransform: "uppercase" }}>🌟 Top Sales Person</div>
          {topSales ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{topSales.name}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: green }}>{formatRupiah(topSales.omset)}</div>
              <div style={{ fontSize: 10, color: inkMuted }}>Kontribusi bulan ini</div>
            </>
          ) : <div style={{ fontSize: 11, color: inkFaint, marginTop: 6 }}>Belum ada closing bulan ini</div>}
        </div>
        <div style={{ flex: 1.6, background: amberBg, border: `1px solid ${amberBorder}`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: amber, textTransform: "uppercase" }}>⚠ Target Omset Alert</div>
          {alertHunters.length > 0 ? (
            <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
              {alertHunters.map(hunter => {
                const p = hunter.target > 0 ? Math.round((hunter.omset / hunter.target) * 100) : 0
                return (
                  <div key={hunter.name} style={{ background: "#FFFFFF", border: `1px solid ${amberBorder}`, borderRadius: 6, padding: "5px 8px", minWidth: 88 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: ink }}>{hunter.name}</div>
                    <div style={{ fontSize: 9, color: amber, fontWeight: 700 }}>{p}%</div>
                  </div>
                )
              })}
            </div>
          ) : <div style={{ fontSize: 11, color: green, marginTop: 6, fontWeight: 600 }}>Semua hunter mencapai target 🎉</div>}
        </div>
      </div>

      {/* Omset per Proyek */}
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: inkMuted, textTransform: "uppercase", width: 110, flexShrink: 0 }}>
          Omset per Proyek
        </div>
        {projectData.length > 0 ? (
          <>
            <div style={{ width: 130, height: 100, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={projectData} dataKey="value" nameKey="name" innerRadius={26} outerRadius={44} paddingAngle={2} isAnimationActive={false}>
                    {projectData.map((project, index) => <Cell key={project.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", flex: 1 }}>
              {projectData.map((project, index) => (
                <div key={project.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[index % PIE_COLORS.length], display: "inline-block" }} />
                  <span style={{ color: inkMuted }}>{project.name}</span>
                  <span style={{ fontWeight: 700 }}>{formatRupiah(project.value)}</span>
                </div>
              ))}
            </div>
          </>
        ) : <div style={{ fontSize: 11, color: inkFaint }}>Belum ada omset pada periode ini</div>}
      </div>

      {/* Table */}
      <div style={{ flex: 1, border: `1px solid ${border}`, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ background: ink }}>
              {["Hunter / Sales", "Konsumen", "Project / Unit", "Nilai Omset", "Cara Bayar", "Tgl Closing"].map((label, i) => (
                <th key={label} style={{
                  padding: "6px 10px", textAlign: i === 3 ? "right" : "left", color: "#FFFFFF",
                  fontWeight: 700, fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase",
                }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#FFFFFF" : surface, borderBottom: `1px solid ${border}` }}>
                <td style={{ padding: "5px 10px" }}>
                  <div style={{ fontWeight: 600 }}>{row.hunter || "—"}</div>
                  <div style={{ color: inkMuted, fontSize: 9 }}>{row.salesPerson || "—"}</div>
                </td>
                <td style={{ padding: "5px 10px", fontWeight: 600 }}>{row.konsumen}</td>
                <td style={{ padding: "5px 10px", color: inkMuted }}>{[row.project, row.unit].filter(Boolean).join(" - ") || "—"}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 700, color: green, whiteSpace: "nowrap" }}>{formatRupiah(row.nilaiOmset)}</td>
                <td style={{ padding: "5px 10px", color: inkMuted }}>{row.caraBayar || "—"}</td>
                <td style={{ padding: "5px 10px", color: inkMuted, whiteSpace: "nowrap" }}>{row.closingDate}</td>
              </tr>
            ))}
            {hiddenCount > 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "5px 10px", textAlign: "center", color: inkFaint, fontStyle: "italic" }}>
                  +{hiddenCount} transaksi lainnya (lihat detail di aplikasi)
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: surface, borderTop: `2px solid ${ink}` }}>
              <td colSpan={3} style={{ padding: "7px 10px", fontWeight: 700 }}>Total · {totalCount} transaksi</td>
              <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 800, color: green, fontSize: 12 }}>{formatRupiah(totalOmset)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
