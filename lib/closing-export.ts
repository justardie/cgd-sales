export interface ClosingExportRow {
  salesPerson: string
  prospect: string
  project?: string | null
  unit?: string | null
  nilaiOmset: number
  caraBayar?: string | null
  closingDate?: string | null
  notes?: string | null
}

const displayDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      .format(new Date(`${value}T00:00:00Z`))
  : "—"

const displayRupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0)

export function formatClosingExport(rows: ClosingExportRow[]): string {
  return rows
    .map(row => [
      `Sales: ${row.salesPerson || "—"}`,
      `Konsumen: ${row.prospect || "—"}`,
      `Project/Unit: ${[row.project, row.unit].filter(Boolean).join(" - ") || "—"}`,
      `Nilai Omset: ${displayRupiah(row.nilaiOmset)}`,
      `Cara Bayar: ${row.caraBayar || "—"}`,
      `Tanggal Closing: ${displayDate(row.closingDate)}`,
      `Catatan: ${row.notes || "—"}`,
    ].join("\n"))
    .join("\n\n")
}
