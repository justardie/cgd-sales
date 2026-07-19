export interface PipelineExportRow {
  id: string
  salesHunter: string
  konsumen: string
  project?: string | null
  unit?: string | null
  status: string
  nilaiPotensi: number
}

export interface PipelineProgressExport {
  kendala: string
  nextAction: string
  targetClosing: string
}

const displayDate = (value: string) => value
  ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(`${value}T00:00:00Z`))
  : "—"

const displayRupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0)

export function formatPipelineExport(
  rows: PipelineExportRow[],
  progressById: Record<string, PipelineProgressExport>,
): string {
  return rows
    .filter(row => row.status === "warm" || row.status === "hot")
    .map(row => {
      const progress = progressById[row.id]
      return [
        `Sales Hunter: ${row.salesHunter || "—"}`,
        `Nama Konsumen: ${row.konsumen || "—"}`,
        `Status: ${row.status.toUpperCase()}`,
        `Minat: ${[row.project, row.unit].filter(Boolean).join(" - ") || "—"}`,
        `Nilai Potensi: ${displayRupiah(row.nilaiPotensi)}`,
        `Kendala: ${progress?.kendala || "—"}`,
        `Next Action: ${progress?.nextAction || "—"}`,
        `Target Closing: ${displayDate(progress?.targetClosing || "")}`,
      ].join("\n")
    })
    .join("\n\n")
}
