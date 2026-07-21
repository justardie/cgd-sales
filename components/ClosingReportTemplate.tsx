import { formatRupiahFull } from "@/lib/utils"

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
  isYtd: boolean
  mtdValue: number
  mtdTarget: number
  topHunter: { name: string; omset: number; pct: number } | null
  topSales: { name: string; omset: number } | null
  allHunters: { name: string; omset: number; target: number }[]
  projectData: { name: string; value: number }[]
  rows: ClosingReportRow[]
  totalOmset: number
  totalCount: number
}

const PIE_COLORS = ["#FF6A3D", "#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ec4899"]
const MAX_ROWS = 40

export const REPORT_WIDTH = 1500

const ink        = "#0F172A"
const inkMuted   = "#64748B"
const inkFaint   = "#94A3B8"
const border     = "#E2E8F0"
const surface    = "#F8FAFC"
const accent     = "#FF6A3D"
const green      = "#16A34A"
const red        = "#DC2626"
const amber      = "#B45309"
const amberBg    = "#FFFBEB"
const amberBorder = "#FDE68A"

export default function ClosingReportTemplate({
  periodLabel, generatedAt, isYtd, mtdValue, mtdTarget, topHunter, topSales,
  allHunters, projectData, rows, totalOmset, totalCount,
}: ClosingReportProps) {
  const mtdPct = mtdTarget > 0 ? Math.round((mtdValue / mtdTarget) * 100) : 0
  const visibleRows = rows.slice(0, MAX_ROWS)
  const hiddenCount = rows.length - visibleRows.length
  const periodWord = isYtd ? "tahun ini" : "bulan ini"
  const omsetLabel = isYtd ? "Omset YTD" : "Omset MTD"

  return (
    <div style={{
      width: REPORT_WIDTH, background: "#FFFFFF", color: ink,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "34px 42px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `3px solid ${ink}`, paddingBottom: 12 }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>Report Closing</div>
          <div style={{ fontSize: 15, color: inkMuted, marginTop: 3 }}>PT Central Group Development · MASCOL Division</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 19, fontWeight: 700 }}>{periodLabel}</div>
          <div style={{ fontSize: 13, color: inkFaint, marginTop: 3 }}>Dibuat {generatedAt}</div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: inkMuted, textTransform: "uppercase" }}>{omsetLabel}</div>
          <div style={{ fontSize: 34, fontWeight: 800, marginTop: 3 }}>{formatRupiahFull(mtdValue)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, color: inkMuted }}>Target Tim: {formatRupiahFull(mtdTarget)}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: mtdPct >= 100 ? green : mtdPct >= 70 ? accent : red }}>{mtdPct}%</div>
        </div>
      </div>

      {/* Top performers */}
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1, background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: inkMuted, textTransform: "uppercase" }}>🏆 Top Sales Hunter</div>
          {topHunter ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 5 }}>{topHunter.name}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: accent }}>{formatRupiahFull(topHunter.omset)}</div>
              <div style={{ fontSize: 14, color: inkMuted }}>Capaian {periodWord}: {topHunter.pct}%</div>
            </>
          ) : <div style={{ fontSize: 15, color: inkFaint, marginTop: 8 }}>Belum ada closing {periodWord}</div>}
        </div>
        <div style={{ flex: 1, background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: inkMuted, textTransform: "uppercase" }}>🌟 Top Sales Person</div>
          {topSales ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 5 }}>{topSales.name}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: green }}>{formatRupiahFull(topSales.omset)}</div>
              <div style={{ fontSize: 14, color: inkMuted }}>Kontribusi {periodWord}</div>
            </>
          ) : <div style={{ fontSize: 15, color: inkFaint, marginTop: 8 }}>Belum ada closing {periodWord}</div>}
        </div>
      </div>

      {/* Target Omset Alert — all hunters */}
      <div style={{ background: amberBg, border: `1px solid ${amberBorder}`, borderRadius: 12, padding: "14px 20px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1, color: amber, textTransform: "uppercase", marginBottom: 10 }}>⚠ Target Omset Alert — Semua Hunter</div>
        {allHunters.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
            {allHunters.map(hunter => {
              const p = hunter.target > 0 ? Math.round((hunter.omset / hunter.target) * 100) : 0
              const achieved = p >= 100
              return (
                <div key={hunter.name} style={{
                  background: "#FFFFFF", borderRadius: 8, padding: "10px 12px",
                  border: `1.5px solid ${achieved ? "#86EFAC" : amberBorder}`,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: ink }}>{hunter.name}</div>
                  <div style={{ fontSize: 16, color: inkMuted, marginTop: 3 }}>{formatRupiahFull(hunter.omset)}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: achieved ? green : amber, marginTop: 3 }}>{p}%</div>
                </div>
              )
            })}
          </div>
        ) : <div style={{ fontSize: 14, color: inkFaint }}>Belum ada data hunter</div>}
      </div>

      {/* Omset per Proyek */}
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 20px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, color: inkMuted, textTransform: "uppercase", marginBottom: 10 }}>
          Omset per Proyek
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {projectData.map((project, index) => (
            <div key={project.name} style={{
              background: "#FFFFFF", borderRadius: 8, padding: "8px 12px",
              border: `1.5px solid ${project.value > 0 ? border : "#F1F5F9"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: PIE_COLORS[index % PIE_COLORS.length], flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontSize: 13, color: inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.name}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: project.value > 0 ? ink : inkFaint, marginTop: 3 }}>{formatRupiahFull(project.value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: ink }}>
              {["Hunter / Sales", "Konsumen", "Project / Unit", "Nilai Omset", "Cara Bayar", "Tgl Closing"].map((label, i) => (
                <th key={label} style={{
                  padding: "9px 14px", textAlign: i === 3 ? "right" : "left", color: "#FFFFFF",
                  fontWeight: 700, fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase",
                }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#FFFFFF" : surface, borderBottom: `1px solid ${border}` }}>
                <td style={{ padding: "8px 14px" }}>
                  <div style={{ fontWeight: 600 }}>{row.hunter || "—"}</div>
                  <div style={{ color: inkMuted, fontSize: 12 }}>{row.salesPerson || "—"}</div>
                </td>
                <td style={{ padding: "8px 14px", fontWeight: 600 }}>{row.konsumen}</td>
                <td style={{ padding: "8px 14px", color: inkMuted }}>{[row.project, row.unit].filter(Boolean).join(" - ") || "—"}</td>
                <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, color: green, whiteSpace: "nowrap" }}>{formatRupiahFull(row.nilaiOmset)}</td>
                <td style={{ padding: "8px 14px", color: inkMuted }}>{row.caraBayar || "—"}</td>
                <td style={{ padding: "8px 14px", color: inkMuted, whiteSpace: "nowrap" }}>{row.closingDate}</td>
              </tr>
            ))}
            {hiddenCount > 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "8px 14px", textAlign: "center", color: inkFaint, fontStyle: "italic" }}>
                  +{hiddenCount} transaksi lainnya (lihat detail di aplikasi)
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: surface, borderTop: `3px solid ${ink}` }}>
              <td colSpan={3} style={{ padding: "10px 14px", fontWeight: 700, fontSize: 15 }}>Total · {totalCount} transaksi</td>
              <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: green, fontSize: 18 }}>{formatRupiahFull(totalOmset)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
