import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
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

export interface ClosingReportData {
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

// Matches the on-screen Target Omset card thresholds exactly (app/closing/page.tsx)
const barGreen  = "#22c55e"
const barOrange = "#E84500"
const barRed    = "#ef4444"

const accentBorder = "#FFD9C7"
const greenBorder   = "#BBF7D0"

// Fixed per-project color so the same project always gets the same dot across
// every report, instead of an index that could repeat once there are more
// than DOT_COLORS.length projects.
const PROJECT_DOT_COLORS: Record<string, string> = {
  "CH":               "#FF6A3D",
  "CT":               "#8b5cf6",
  "MRD CRBA+CBA":     "#10b981",
  "CRT":              "#3b82f6",
  "MRD CRTU":         "#f59e0b",
  "MRD CLH":          "#ec4899",
  "SCC - Hillside":   "#14b8a6",
  "SCC - Valleyside": "#6366f1",
}
const DOT_COLORS = Object.values(PROJECT_DOT_COLORS)
function projectDotColor(name: string, fallbackIndex: number): string {
  return PROJECT_DOT_COLORS[name] ?? DOT_COLORS[fallbackIndex % DOT_COLORS.length]
}

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 12
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

async function fetchLogo(): Promise<{ dataUrl: string; aspect: number } | null> {
  try {
    const res = await fetch("/logo-central-group.png")
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Failed to read logo blob"))
      reader.readAsDataURL(blob)
    })
    const aspect = await new Promise<number>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight)
      img.onerror = () => reject(new Error("Failed to load logo image"))
      img.src = dataUrl
    })
    return { dataUrl, aspect }
  } catch {
    return null
  }
}

function roundedBox(pdf: jsPDF, x: number, y: number, w: number, h: number, fill: string, stroke: string, radius = 2) {
  pdf.setFillColor(fill)
  pdf.setDrawColor(stroke)
  pdf.setLineWidth(0.25)
  pdf.roundedRect(x, y, w, h, radius, radius, "FD")
}

function progressBar(pdf: jsPDF, x: number, y: number, w: number, h: number, pct: number, color: string) {
  pdf.setFillColor(border)
  pdf.roundedRect(x, y, w, h, h / 2, h / 2, "F")
  const fillW = w * Math.min(Math.max(pct, 0), 100) / 100
  if (fillW > 0) {
    pdf.setFillColor(color)
    pdf.roundedRect(x, y, Math.max(h, fillW), h, h / 2, h / 2, "F")
  }
  // Over-achievers (>100%) fill the whole bar the same as an exact 100% —
  // add a small marker at the tip so the two aren't visually identical.
  if (pct > 100) {
    pdf.setFillColor(ink)
    pdf.circle(x + w - h / 2, y + h / 2, h * 0.55, "F")
  }
}

/** Draws uppercase micro-labels with a touch of letter-spacing, then resets it so it never bleeds into later text. */
function labelText(pdf: jsPDF, text: string, x: number, y: number, align?: "left" | "right") {
  pdf.setCharSpace(0.15)
  pdf.text(text, x, y, align ? { align } : undefined)
  pdf.setCharSpace(0)
}

function fitText(pdf: jsPDF, text: string, maxWidth: number): string {
  if (pdf.getTextWidth(text) <= maxWidth) return text
  let truncated = text
  while (truncated.length > 1 && pdf.getTextWidth(`${truncated}…`) > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}…`
}

function barColor(pct: number): string {
  return pct >= 100 ? barGreen : pct >= 70 ? barOrange : barRed
}

/**
 * Shortens a multi-word name from the end ("Riezkya Adella Hayuningtyas" →
 * "Riezkya Adella H.") instead of ellipsis-truncating it, so the reader can
 * still tell people apart. Falls back to fitText if even that doesn't fit.
 */
function abbreviateName(pdf: jsPDF, name: string, maxWidth: number): string {
  if (pdf.getTextWidth(name) <= maxWidth) return name
  const words = name.trim().split(/\s+/)
  for (let i = words.length - 1; i > 0; i--) {
    if (words[i].length <= 2) continue
    words[i] = `${words[i][0]}.`
    const candidate = words.join(" ")
    if (pdf.getTextWidth(candidate) <= maxWidth) return candidate
  }
  return fitText(pdf, words.join(" "), maxWidth)
}

function formatDateDMY(iso: string): string {
  const [yearStr, monthStr, dayStr] = iso.split("-")
  if (!yearStr || !monthStr || !dayStr) return iso
  return `${dayStr}/${monthStr}/${yearStr}`
}

export async function generateClosingReportPdf(data: ClosingReportData): Promise<void> {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
  const periodWord = data.isYtd ? "tahun ini" : "bulan ini"
  const omsetLabel = data.isYtd ? "Omset YTD" : "Omset MTD"
  const mtdPct = data.mtdTarget > 0 ? Math.round((data.mtdValue / data.mtdTarget) * 100) : 0

  let y = MARGIN

  // ---- Header ----
  const logo = await fetchLogo()
  let titleX = MARGIN
  if (logo) {
    const logoW = 26
    const logoH = logoW / logo.aspect
    pdf.addImage(logo.dataUrl, "PNG", MARGIN, y, logoW, logoH)
    titleX = MARGIN + logoW + 5
  }
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(17)
  pdf.setTextColor(ink)
  pdf.text("Report Closing", titleX, y + 6)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(9)
  pdf.setTextColor(inkMuted)
  pdf.text("PT Central Group Development · MASCOL Division", titleX, y + 12)

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(12)
  pdf.setTextColor(ink)
  pdf.text(data.periodLabel, PAGE_WIDTH - MARGIN, y + 6, { align: "right" })
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8)
  pdf.setTextColor(inkMuted)
  pdf.text(`Dibuat ${data.generatedAt}`, PAGE_WIDTH - MARGIN, y + 11, { align: "right" })

  y += 18
  pdf.setDrawColor(border)
  pdf.setLineWidth(0.3)
  pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  pdf.setDrawColor(accent)
  pdf.setLineWidth(1)
  pdf.line(MARGIN, y, MARGIN + 30, y)
  y += 6

  // ---- KPI + Top performers, one row of 3 equal columns ----
  const summaryH = 26
  const summaryGap = 5
  const summaryW = (CONTENT_WIDTH - summaryGap * 2) / 3

  // Column 1: Omset MTD/YTD — big percentage at left, label/target stacked beside it, value below
  const kpiX = MARGIN
  roundedBox(pdf, kpiX, y, summaryW, summaryH, surface, border)
  const pctColor = mtdPct >= 100 ? green : mtdPct >= 70 ? accent : red
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(19)
  pdf.setTextColor(pctColor)
  pdf.text(`${mtdPct}%`, kpiX + 4, y + 11)
  const pctWidth = pdf.getTextWidth(`${mtdPct}%`)
  const kpiLabelX = kpiX + 4 + pctWidth + 4
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(7.5)
  pdf.setTextColor(inkMuted)
  labelText(pdf, omsetLabel.toUpperCase(), kpiLabelX, y + 8)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(7)
  pdf.text(fitText(pdf, `Target Tim: ${formatRupiahFull(data.mtdTarget)}`, kpiX + summaryW - kpiLabelX - 4), kpiLabelX, y + 12)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(13)
  pdf.setTextColor(ink)
  pdf.text(fitText(pdf, formatRupiahFull(data.mtdValue), summaryW - 8), kpiX + 4, y + 21)

  // Columns 2 & 3: Top Sales Hunter / Top Sales Person
  function drawPerformer(x: number, label: string, name: string | null, value: number, valueColor: string, caption: string, cardBorder: string) {
    roundedBox(pdf, x, y, summaryW, summaryH, surface, cardBorder)
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(8)
    pdf.setTextColor(inkMuted)
    labelText(pdf, label.toUpperCase(), x + 4, y + 6)
    if (name) {
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(11)
      pdf.setTextColor(ink)
      pdf.text(fitText(pdf, name, summaryW - 8), x + 4, y + 12.5)
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(13)
      pdf.setTextColor(valueColor)
      pdf.text(fitText(pdf, formatRupiahFull(value), summaryW - 8), x + 4, y + 18.5)
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(8)
      pdf.setTextColor(inkMuted)
      pdf.text(fitText(pdf, caption, summaryW - 8), x + 4, y + 23)
    } else {
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(9)
      pdf.setTextColor(inkMuted)
      pdf.text(`Belum ada closing ${periodWord}`, x + 4, y + 14)
    }
  }
  drawPerformer(kpiX + summaryW + summaryGap, "Top Sales Hunter", data.topHunter?.name ?? null, data.topHunter?.omset ?? 0, accent, `Capaian ${periodWord}: ${data.topHunter?.pct ?? 0}%`, accentBorder)
  drawPerformer(kpiX + (summaryW + summaryGap) * 2, "Top Sales Person", data.topSales?.name ?? null, data.topSales?.omset ?? 0, green, `Kontribusi ${periodWord}`, greenBorder)
  y += summaryH + 5

  // ---- Target Omset Alert — all hunters (5-col grid, matches on-screen Target Omset card) ----
  const alertPad = 4
  const alertCols = 5
  const alertGap = 3
  const alertGridX = MARGIN + alertPad
  const alertGridW = CONTENT_WIDTH - alertPad * 2
  const alertCardW = (alertGridW - alertGap * (alertCols - 1)) / alertCols
  const alertCardH = 24
  const alertRows = Math.max(1, Math.ceil(data.allHunters.length / alertCols))
  const alertBoxH = 11 + alertRows * alertCardH + (alertRows - 1) * alertGap + alertPad

  roundedBox(pdf, MARGIN, y, CONTENT_WIDTH, alertBoxH, amberBg, amberBorder)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(10)
  pdf.setTextColor(amber)
  labelText(pdf, "TARGET OMSET ALERT — SEMUA HUNTER", MARGIN + 5, y + 7)

  if (data.allHunters.length > 0) {
    data.allHunters.forEach((hunter, i) => {
      const col = i % alertCols
      const row = Math.floor(i / alertCols)
      const cx = alertGridX + col * (alertCardW + alertGap)
      const cy = y + 11 + row * (alertCardH + alertGap)
      const pct = hunter.target > 0 ? Math.round((hunter.omset / hunter.target) * 100) : 0
      const color = barColor(pct)
      const achieved = pct >= 100
      roundedBox(pdf, cx, cy, alertCardW, alertCardH, "#FFFFFF", achieved ? "#86EFAC" : amberBorder, 1.5)

      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(7.5)
      pdf.setTextColor(inkMuted)
      pdf.text(fitText(pdf, hunter.name, alertCardW - 4), cx + 2.5, cy + 5)

      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(9.5)
      pdf.setTextColor(ink)
      pdf.text(fitText(pdf, formatRupiahFull(hunter.omset), alertCardW - 4), cx + 2.5, cy + 10.5)

      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(7)
      pdf.setTextColor(inkMuted)
      pdf.text(fitText(pdf, `Target: ${formatRupiahFull(hunter.target)}`, alertCardW - 4), cx + 2.5, cy + 14.5)

      progressBar(pdf, cx + 2.5, cy + 17, alertCardW - 5, 1.6, pct, color)

      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(10)
      pdf.setTextColor(color)
      pdf.text(`${pct}%`, cx + 2.5, cy + 22.5)
    })
  } else {
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(9)
    pdf.setTextColor(inkMuted)
    pdf.text("Belum ada data hunter", MARGIN + 5, y + 14)
  }
  y += alertBoxH + 5

  // ---- Omset per Proyek ----
  const projPad = 4
  const projCols = 4
  const projGap = 3
  const projGridX = MARGIN + projPad
  const projGridW = CONTENT_WIDTH - projPad * 2
  const projCardW = (projGridW - projGap * (projCols - 1)) / projCols
  const projCardH = 15
  const projRows = Math.max(1, Math.ceil(data.projectData.length / projCols))
  const projBoxH = 10 + projRows * projCardH + (projRows - 1) * projGap + projPad

  roundedBox(pdf, MARGIN, y, CONTENT_WIDTH, projBoxH, surface, border)
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(9)
  pdf.setTextColor(inkMuted)
  labelText(pdf, "OMSET PER PROYEK", MARGIN + 5, y + 6.5)

  data.projectData.forEach((project, i) => {
    const col = i % projCols
    const row = Math.floor(i / projCols)
    const cx = projGridX + col * (projCardW + projGap)
    const cy = y + 10 + row * (projCardH + projGap)
    roundedBox(pdf, cx, cy, projCardW, projCardH, "#FFFFFF", project.value > 0 ? border : "#F1F5F9", 1.5)

    pdf.setFillColor(projectDotColor(project.name, i))
    pdf.circle(cx + 3.5, cy + 5.2, 1, "F")
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(7.5)
    pdf.setTextColor(inkMuted)
    pdf.text(fitText(pdf, project.name, projCardW - 9), cx + 6, cy + 6)

    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(9.5)
    pdf.setTextColor(project.value > 0 ? ink : inkFaint)
    pdf.text(fitText(pdf, formatRupiahFull(project.value), projCardW - 4), cx + 2.5, cy + 11.5)
  })
  y += projBoxH + 6

  // ---- Transactions table (real text, auto-paginates if it overflows) ----
  // Hunter/Sales packs two lines into one cell with distinct styles (bold
  // name, muted role), which means autoTable can't measure it for its own
  // width calculation — so the column's width is computed here from the
  // actual data instead, capped at nameColMaxWidth. Names past that width
  // are abbreviated ("Riezkya Adella Hayuningtyas" → "Riezkya Adella H.")
  // rather than fixed to a hardcoded width.
  const nameColMaxWidth = 40
  const nameColCellPad = 2
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(8)
  const hunterWidths = data.rows.map(row => pdf.getTextWidth(row.hunter || "—"))
  const headerWidth = pdf.getTextWidth("Hunter / Sales")
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(7)
  const spDisplays = data.rows.map(row => abbreviateName(pdf, row.salesPerson || "—", nameColMaxWidth - nameColCellPad * 2))
  const spWidths = spDisplays.map(display => pdf.getTextWidth(display))
  const nameColContentWidth = Math.max(headerWidth, ...hunterWidths, ...spWidths)
  const nameColWidth = Math.min(nameColMaxWidth, nameColContentWidth + nameColCellPad * 2 + 1)

  autoTable(pdf, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, bottom: 14 },
    head: [["Hunter / Sales", "Konsumen", "Project / Unit", "Nilai Omset", "Cara Bayar", "Tgl Closing"]],
    body: data.rows.map((row, i) => [
      `${row.hunter || "—"}\n${spDisplays[i]}`,
      row.konsumen || "—",
      [row.project, row.unit].filter(Boolean).join(" - ") || "—",
      formatRupiahFull(row.nilaiOmset),
      row.caraBayar || "—",
      formatDateDMY(row.closingDate),
    ]),
    foot: [[
      { content: `Total · ${data.totalCount} transaksi`, colSpan: 3, styles: { halign: "left", fontStyle: "bold", fontSize: 9 } },
      { content: formatRupiahFull(data.totalOmset), styles: { halign: "right", textColor: green, fontStyle: "bold", fontSize: 10 } },
      { content: "", colSpan: 2 },
    ]],
    styles: { font: "helvetica", fontSize: 8, textColor: ink, lineColor: border, lineWidth: 0.1, cellPadding: nameColCellPad, valign: "middle" },
    headStyles: { fillColor: ink, textColor: "#FFFFFF", fontStyle: "bold", fontSize: 7.5 },
    footStyles: { fillColor: surface, lineWidth: { top: 0.5 } },
    alternateRowStyles: { fillColor: surface },
    columnStyles: {
      0: { cellWidth: nameColWidth },
      3: { halign: "right", textColor: green, fontStyle: "bold", minCellWidth: 26 },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body" && hookData.column.index === 0) {
        hookData.cell.text = []
      }
    },
    didDrawCell: (hookData) => {
      if (hookData.section !== "body" || hookData.column.index !== 0) return
      const raw = hookData.row.raw
      const combined = Array.isArray(raw) ? String(raw[0] ?? "") : ""
      const [hunterName, spName] = combined.split("\n")
      const cell = hookData.cell
      const padLeft = cell.padding("left")
      const availWidth = cell.width - padLeft - cell.padding("right")
      const centerY = cell.y + cell.height / 2
      pdf.setFont("helvetica", "bold")
      pdf.setFontSize(8)
      pdf.setTextColor(ink)
      pdf.text(fitText(pdf, hunterName || "—", availWidth), cell.x + padLeft, centerY - 1.1)
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(7)
      pdf.setTextColor(inkMuted)
      pdf.text(spName || "—", cell.x + padLeft, centerY + 2.3)
    },
    didDrawPage: () => {
      pdf.setFont("helvetica", "normal")
      pdf.setFontSize(7.5)
      pdf.setTextColor(inkMuted)
      pdf.text("Report Closing · PT Central Group Development", MARGIN, PAGE_HEIGHT - 8)
    },
  })

  // Page numbers are stamped after the fact, once the true page count is
  // known, so the footer can read "Halaman N dari M" instead of just "N".
  const totalPages = pdf.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    pdf.setPage(page)
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(7.5)
    pdf.setTextColor(inkMuted)
    pdf.text(`Halaman ${page} dari ${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, { align: "right" })
  }

  pdf.save(`Report Closing - ${new Date().toISOString().slice(0, 10)}.pdf`)
}
