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
const MAX_ROWS = 15

export const REPORT_WIDTH = 900

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
      padding: "26px 30px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 12,
      lineHeight: 1.4,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `3px solid ${ink}`, paddingBottom: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.3 }}>Report Closing</div>
          <div style={{ fontSize: 12, color: inkMuted, marginTop: 3, lineHeight: 1.4 }}>PT Central Group Development · MASCOL Division</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>{periodLabel}</div>
          <div style={{ fontSize: 11, color: inkFaint, marginTop: 3, lineHeight: 1.4 }}>Dibuat {generatedAt}</div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: inkMuted, textTransform: "uppercase", lineHeight: 1.4 }}>{omsetLabel}</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 3, lineHeight: 1.3 }}>{formatRupiahFull(mtdValue)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: inkMuted, lineHeight: 1.4 }}>Target Tim: {formatRupiahFull(mtdTarget)}</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: mtdPct >= 100 ? green : mtdPct >= 70 ? accent : red, lineHeight: 1.3 }}>{mtdPct}%</div>
        </div>
      </div>

      {/* Top performers */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: inkMuted, textTransform: "uppercase", lineHeight: 1.4 }}>🏆 Top Sales Hunter</div>
          {topHunter ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, lineHeight: 1.4 }}>{topHunter.name}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: accent, lineHeight: 1.4 }}>{formatRupiahFull(topHunter.omset)}</div>
              <div style={{ fontSize: 11, color: inkMuted, lineHeight: 1.4 }}>Capaian {periodWord}: {topHunter.pct}%</div>
            </>
          ) : <div style={{ fontSize: 12, color: inkFaint, marginTop: 6, lineHeight: 1.4 }}>Belum ada closing {periodWord}</div>}
        </div>
        <div style={{ flex: 1, background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: inkMuted, textTransform: "uppercase", lineHeight: 1.4 }}>🌟 Top Sales Person</div>
          {topSales ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4, lineHeight: 1.4 }}>{topSales.name}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: green, lineHeight: 1.4 }}>{formatRupiahFull(topSales.omset)}</div>
              <div style={{ fontSize: 11, color: inkMuted, lineHeight: 1.4 }}>Kontribusi {periodWord}</div>
            </>
          ) : <div style={{ fontSize: 12, color: inkFaint, marginTop: 6, lineHeight: 1.4 }}>Belum ada closing {periodWord}</div>}
        </div>
      </div>

      {/* Target Omset Alert — all hunters */}
      <div style={{ background: amberBg, border: `1px solid ${amberBorder}`, borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: amber, textTransform: "uppercase", marginBottom: 8, lineHeight: 1.4 }}>⚠ Target Omset Alert — Semua Hunter</div>
        {allHunters.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {allHunters.map(hunter => {
              const p = hunter.target > 0 ? Math.round((hunter.omset / hunter.target) * 100) : 0
              const achieved = p >= 100
              return (
                <div key={hunter.name} style={{
                  background: "#FFFFFF", borderRadius: 8, padding: "8px 10px",
                  border: `1.5px solid ${achieved ? "#86EFAC" : amberBorder}`,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: ink, lineHeight: 1.4 }}>{hunter.name}</div>
                  <div style={{ fontSize: 13, color: inkMuted, marginTop: 2, lineHeight: 1.4 }}>{formatRupiahFull(hunter.omset)}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: achieved ? green : amber, marginTop: 2, lineHeight: 1.4 }}>{p}%</div>
                </div>
              )
            })}
          </div>
        ) : <div style={{ fontSize: 12, color: inkFaint, lineHeight: 1.4 }}>Belum ada data hunter</div>}
      </div>

      {/* Omset per Proyek */}
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: inkMuted, textTransform: "uppercase", marginBottom: 8, lineHeight: 1.4 }}>
          Omset per Proyek
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {projectData.map((project, index) => (
            <div key={project.name} style={{
              background: "#FFFFFF", borderRadius: 8, padding: "8px 10px",
              border: `1.5px solid ${project.value > 0 ? border : "#F1F5F9"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: PIE_COLORS[index % PIE_COLORS.length], flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontSize: 11, color: inkMuted, lineHeight: 1.5 }}>{project.name}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: project.value > 0 ? ink : inkFaint, marginTop: 3, lineHeight: 1.4 }}>{formatRupiahFull(project.value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ border: `1px solid ${border}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: ink }}>
              {["Hunter / Sales", "Konsumen", "Project / Unit", "Nilai Omset", "Cara Bayar", "Tgl Closing"].map((label, i) => (
                <th key={label} style={{
                  padding: "7px 10px", textAlign: i === 3 ? "right" : "left", color: "#FFFFFF",
                  fontWeight: 700, fontSize: 10, letterSpacing: 0.4, textTransform: "uppercase", lineHeight: 1.4,
                }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#FFFFFF" : surface, borderBottom: `1px solid ${border}` }}>
                <td style={{ padding: "6px 10px", lineHeight: 1.4 }}>
                  <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{row.hunter || "—"}</div>
                  <div style={{ color: inkMuted, fontSize: 10, lineHeight: 1.4 }}>{row.salesPerson || "—"}</div>
                </td>
                <td style={{ padding: "6px 10px", fontWeight: 600, lineHeight: 1.4 }}>{row.konsumen}</td>
                <td style={{ padding: "6px 10px", color: inkMuted, lineHeight: 1.4 }}>{[row.project, row.unit].filter(Boolean).join(" - ") || "—"}</td>
                <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: green, whiteSpace: "nowrap", lineHeight: 1.4 }}>{formatRupiahFull(row.nilaiOmset)}</td>
                <td style={{ padding: "6px 10px", color: inkMuted, lineHeight: 1.4 }}>{row.caraBayar || "—"}</td>
                <td style={{ padding: "6px 10px", color: inkMuted, whiteSpace: "nowrap", lineHeight: 1.4 }}>{row.closingDate}</td>
              </tr>
            ))}
            {hiddenCount > 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "6px 10px", textAlign: "center", color: inkFaint, fontStyle: "italic", lineHeight: 1.4 }}>
                  +{hiddenCount} transaksi lainnya (lihat detail di aplikasi)
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: surface, borderTop: `3px solid ${ink}` }}>
              <td colSpan={3} style={{ padding: "8px 10px", fontWeight: 700, fontSize: 12, lineHeight: 1.4 }}>Total · {totalCount} transaksi</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: green, fontSize: 14, lineHeight: 1.4 }}>{formatRupiahFull(totalOmset)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
