export interface PipelineExportRow {
  id: string
  salesHunter: string
  project?: string | null
  unit?: string | null
  status: string
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
        `Minat: ${[row.project, row.unit].filter(Boolean).join(" - ") || "—"}`,
        `Kendala: ${progress?.kendala || "—"}`,
        `Next Action: ${progress?.nextAction || "—"}`,
        `Target Closing: ${displayDate(progress?.targetClosing || "")}`,
      ].join("\n")
    })
    .join("\n\n")
}
