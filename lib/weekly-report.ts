export interface PivotVisitRow { name: string; visitKonsumen: number; accompanied: number; visitLokasi: number }
export interface SalesVisit extends PivotVisitRow { visits: number }
export interface ReportClosing { salesPerson: string; customer: string; project?: string | null; unit?: string | null; value: number; visitDate?: string | null; closingDate?: string | null }
export interface ReportPipeline { salesPerson: string; customer: string; project?: string | null; unit?: string | null; value: number; visitDate?: string | null; bookingFee?: boolean }
export interface ReportActivity { activity: string; target: string }
export interface ReportSnapshot {
  hunterName: string; reportDate?: string; periodStart: string; periodEnd: string; coverage: string[]
  monthlyTarget: number; winOrDieTarget: number; visitTarget?: number
  closings: ReportClosing[]; pipelines: ReportPipeline[]
  hunterVisits: number; salesVisits: SalesVisit[]; activities: ReportActivity[]
}

export function normalizePersonName(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ")
}

const normalizeHeader = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ")
const SKIP_LABELS = new Set(["total", "count", "0", ""])

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0, januari: 0,
  feb: 1, february: 1, februari: 1,
  mar: 2, march: 2, maret: 2,
  apr: 3, april: 3,
  may: 4, mei: 4,
  jun: 5, june: 5, juni: 5,
  jul: 6, july: 6, juli: 6,
  aug: 7, august: 7, agu: 7, agustus: 7,
  sep: 8, september: 8, sept: 8,
  oct: 9, october: 9, okt: 9, oktober: 9,
  nov: 10, november: 10,
  dec: 11, december: 11, des: 11, desember: 11,
}

function parseMonthYearLabel(label: string): { year: number; month: number } | null {
  const match = label.trim().match(/^([a-zA-Z]+)\.?\s+(\d{4})$/)
  if (!match) return null
  const month = MONTH_NAMES[match[1].toLowerCase()]
  if (month === undefined) return null
  return { year: Number(match[2]), month }
}

/** Returns every {year, month} (month 0-indexed) spanned by a date range — a report week can span at most two calendar months. */
export function monthsInRange(startISO: string, endISO: string): { year: number; month: number }[] {
  const start = new Date(`${startISO}T00:00:00Z`)
  const end = new Date(`${endISO}T00:00:00Z`)
  const months: { year: number; month: number }[] = []
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const endCursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))
  while (cursor <= endCursor) {
    months.push({ year: cursor.getUTCFullYear(), month: cursor.getUTCMonth() })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return months
}

/**
 * Locates the pivot header row and its column layout by scanning every cell
 * instead of assuming fixed column positions — different hunters' Odoo
 * exports insert extra measure columns (e.g. "None", "Prospect (Call/Chat)")
 * before "Visit Konsumen" / "Accompanied Visit", which shifts them out of
 * columns 1/2, and use different header casing.
 *
 * Odoo also groups pivot rows by Month > Salesperson with indented labels
 * (e.g. "     July 2026" then "          HERIYANDI" nested under it), so the
 * same salesperson can appear once per month. When the report week spans two
 * calendar months (e.g. Mon 29 Jun – Sun 5 Jul), both months' groups are
 * summed per person; otherwise only the single matching month is used. Falls
 * back to the most recent group if none of the target months are present.
 */
export function parsePivotSheet(raw: (string | number)[][], targets?: { year: number; month: number }[]): PivotVisitRow[] {
  let headerRowIndex = -1
  let visitKonsumenCol = -1, accompaniedCol = -1, visitLokasiCol = -1
  for (let r = 0; r < raw.length; r++) {
    const row = raw[r]
    const vk = row.findIndex(cell => normalizeHeader(cell).includes("visit konsumen"))
    const ac = row.findIndex(cell => normalizeHeader(cell).includes("accompanied"))
    if (vk < 0 || ac < 0) continue
    headerRowIndex = r
    visitKonsumenCol = vk
    accompaniedCol = ac
    visitLokasiCol = row.findIndex(cell => normalizeHeader(cell).includes("visit lokasi"))
    break
  }
  if (headerRowIndex < 0) throw new Error("Header Visit Konsumen dan Accompanied Visit tidak ditemukan.")

  const nameCol = 0
  const toRow = (row: (string | number)[]): PivotVisitRow => ({
    name: String(row[nameCol]).trim(),
    visitKonsumen: Number(row[visitKonsumenCol]) || 0,
    accompanied: Number(row[accompaniedCol]) || 0,
    visitLokasi: visitLokasiCol >= 0 ? Number(row[visitLokasiCol]) || 0 : 0,
  })

  type Entry = { label: string; indent: number; row: (string | number)[] }
  const entries: Entry[] = raw.slice(headerRowIndex + 1)
    .map(row => ({ label: String(row[nameCol] ?? ""), row }))
    .filter(({ label }) => !SKIP_LABELS.has(normalizeHeader(label)))
    .map(({ label, row }) => ({ label: label.trim(), indent: (label.match(/^ */)?.[0].length) ?? 0, row }))

  const groups = entries
    .map((entry, index) => ({ index, indent: entry.indent, monthYear: parseMonthYearLabel(entry.label) }))
    .filter((entry): entry is { index: number; indent: number; monthYear: { year: number; month: number } } => entry.monthYear !== null)

  if (groups.length === 0) {
    // Flat pivot with no month grouping — every remaining row is a person row.
    return entries.map(e => toRow(e.row))
  }

  const matchingGroups = targets
    ? groups.filter(g => targets.some(t => t.year === g.monthYear.year && t.month === g.monthYear.month))
    : []
  const chosenGroups = matchingGroups.length > 0
    ? matchingGroups
    : [groups.reduce((latest, g) =>
        (g.monthYear.year * 12 + g.monthYear.month) > (latest.monthYear.year * 12 + latest.monthYear.month) ? g : latest
      )]

  const combined = new Map<string, PivotVisitRow>()
  for (const group of chosenGroups) {
    const nextBoundary = groups.find(g => g.index > group.index && g.indent <= group.indent)
    const endIndex = nextBoundary ? nextBoundary.index : entries.length
    const rows = entries
      .slice(group.index + 1, endIndex)
      .filter(e => e.indent > group.indent)
      .map(e => toRow(e.row))
    for (const row of rows) {
      const key = normalizePersonName(row.name)
      const existing = combined.get(key)
      if (existing) {
        existing.visitKonsumen += row.visitKonsumen
        existing.accompanied += row.accompanied
        existing.visitLokasi += row.visitLokasi
      } else {
        combined.set(key, { ...row })
      }
    }
  }
  return Array.from(combined.values())
}

const isoUtc = (value: Date) => value.toISOString().slice(0, 10)
export function getPreviousWeekPeriod(reportDate: string) {
  const selected = new Date(`${reportDate}T00:00:00Z`)
  const daysSinceMonday = (selected.getUTCDay() + 6) % 7
  const monday = new Date(selected)
  monday.setUTCDate(selected.getUTCDate() - daysSinceMonday - 7)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return { start: isoUtc(monday), end: isoUtc(sunday) }
}

export function calculateVisitSummary(rows: PivotVisitRow[], activeSalesNames: string[]) {
  const byName = new Map(rows.map(row => [normalizePersonName(row.name), row]))
  const sales: SalesVisit[] = activeSalesNames.map(name => {
    const row = byName.get(normalizePersonName(name))
    const visitKonsumen = row?.visitKonsumen || 0
    const accompanied = row?.accompanied || 0
    const visitLokasi = row?.visitLokasi || 0
    return { name, visitKonsumen, accompanied, visitLokasi, visits: visitKonsumen + accompanied + visitLokasi }
  })
  const hunterVisits = sales.reduce((sum, person) => sum + person.accompanied, 0)
  const missingNames = activeSalesNames.filter(name => !byName.has(normalizePersonName(name)))
  return { hunterVisits, sales, missingNames }
}

export function getMtdRange(end: string) {
  const [year, month] = end.split("-")
  return { start: `${year}-${month}-01`, end }
}

const esc = (value: unknown) => String(value ?? "—").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0)
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "—"
const percent = (actual: number, target: number) => target > 0 ? Math.round(actual / target * 1000) / 10 : 0
const safeWidth = (value: number) => Math.max(0, Math.min(value, 100))

export function buildReportHtml(data: ReportSnapshot) {
  const visitTarget = 40
  const closingTotal = data.closings.reduce((sum, item) => sum + item.value, 0)
  const pipelineTotal = data.pipelines.reduce((sum, item) => sum + item.value, 0)
  const targetPct = percent(closingTotal, data.monthlyTarget)
  const wodPct = percent(closingTotal, data.winOrDieTarget)
  const visitPct = percent(data.hunterVisits, visitTarget)
  const rows = (items: string[], colspan = 8) => items.length ? items.join("") : `<tr><td colspan="${colspan}" class="empty">Belum ada data</td></tr>`
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sales Weekly Report - ${esc(data.hunterName)}</title><style>
  @page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{margin:0;background:#eef6f1;color:#173d2d;font:12px Arial,sans-serif}.wrap{max-width:1120px;margin:auto;padding:18px}.btn-print{position:fixed;right:18px;top:14px;border:0;border-radius:8px;padding:9px 14px;background:#1b4332;color:#fff;font-weight:700;cursor:pointer}.hdr{background:#fff;border:1px solid #cfe7d7;border-top:5px solid #2d6a4f;border-radius:11px;padding:16px}.hdr-top{display:flex;justify-content:space-between;gap:22px}.org{font-weight:800;font-size:22px;letter-spacing:.2px}.sub{color:#5a8272;margin-top:3px}.badge-report{display:inline-block;background:#e8f5ee;color:#2d6a4f;border-radius:99px;padding:5px 10px;font-weight:700}.meta-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:14px}.meta{border-top:1px solid #d6efd8;padding-top:8px}.lbl{font-size:10px;text-transform:uppercase;color:#759788;letter-spacing:.5px}.val{font-weight:700;margin-top:3px}.progresses{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:13px}.progress{background:#f4faf7;border-radius:8px;padding:10px}.progress-row{display:flex;justify-content:space-between;gap:10px;font-weight:700}.bar{height:8px;background:#dcece2;border-radius:99px;overflow:hidden;margin-top:7px}.fill{height:100%;background:#52b788;border-radius:99px}.fill.gold{background:#d4a72c}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}.card{background:#fff;border:1px solid #d6efd8;border-radius:9px;padding:11px}.card .v{display:block;font-size:19px;font-weight:800;margin-top:5px;color:#1b4332}.section{background:#fff;border:1px solid #d6efd8;border-radius:10px;margin:12px 0;break-inside:avoid;overflow:hidden}.sec-head{display:flex;align-items:center;gap:9px;padding:10px 12px;background:#e8f5ee}.sec-num{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#2d6a4f;color:#fff;font-weight:800}.sec-title{font-size:15px;font-weight:800}.sec-sub{margin-left:auto;color:#5a8272}.sec-body{padding:11px}.visit-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.vcard{border:1px solid #d6efd8;border-radius:8px;padding:10px;background:#f9fcfa}.vcard-hunter{border-color:#52b788;background:#eef9f2}.vcard.missed{border-color:#ef9a9a;background:#fff5f5}.visit-status{font-size:10px;font-weight:800;margin-top:6px;color:#27864f}.visit-status.missed{color:#c62828}.figs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-top:7px}.fig{text-align:center;background:#fff;border-radius:5px;padding:6px}.fig b{display:block;font-size:16px}table{width:100%;border-collapse:collapse}th{background:#eef7f1;color:#456c5c;text-align:left;font-size:10px;text-transform:uppercase}th,td{padding:7px;border:1px solid #d6efd8;vertical-align:top}.num{text-align:right}.total td{font-weight:800;background:#f4faf7}.empty{text-align:center;color:#759788}.badge{display:inline-block;padding:2px 6px;border-radius:99px;background:#e8f5ee;color:#2d6a4f;font-weight:700}.footer{text-align:center;color:#759788;margin:13px 0 3px;font-size:10px}@media(max-width:760px){.meta-grid,.progresses,.cards,.visit-grid{grid-template-columns:1fr 1fr}.hdr-top{display:block}}@media print{body{background:#fff}.wrap{padding:0}.btn-print{display:none}}
  </style></head><body><button class="btn-print" onclick="window.print()">🖨 Print / PDF</button><main class="wrap">
  <header class="hdr"><div class="hdr-top"><div><div class="org">PT CENTRAL GROUP DEVELOPMENT</div><div class="sub">MASCOL DIVISION</div></div><div><span class="badge-report">SALES WEEKLY REPORT</span></div></div><div class="meta-grid"><div class="meta"><div class="lbl">Nama Hunter</div><div class="val">${esc(data.hunterName)}</div></div><div class="meta"><div class="lbl">Jabatan</div><div class="val">Sales Hunter</div></div><div class="meta"><div class="lbl">Project Coverage</div><div class="val">${esc(data.coverage.join(", ") || "—")}</div></div><div class="meta"><div class="lbl">Periode Laporan</div><div class="val">${date(data.periodStart)} – ${date(data.periodEnd)}</div></div><div class="meta"><div class="lbl">Tanggal Laporan</div><div class="val">${date(data.reportDate)}</div></div></div><div class="progresses"><div class="progress"><div class="progress-row"><span>Progress Target Omset</span><span>${targetPct}%</span></div><div class="sub">Target ${money(data.monthlyTarget)} · Real ${money(closingTotal)}</div><div class="bar"><div class="fill" style="width:${safeWidth(targetPct)}%"></div></div></div><div class="progress"><div class="progress-row"><span>Target Minimum Win or Die</span><span>${wodPct}%</span></div><div class="sub">Minimum ${money(data.winOrDieTarget)} · Real ${money(closingTotal)}</div><div class="bar"><div class="fill gold" style="width:${safeWidth(wodPct)}%"></div></div></div></div></header>
  <div class="cards"><div class="card"><span class="lbl">Closing MTD</span><span class="v">${data.closings.length} Konsumen</span></div><div class="card"><span class="lbl">Omset MTD</span><span class="v">${money(closingTotal)}</span></div><div class="card"><span class="lbl">Pipeline Hot</span><span class="v">${data.pipelines.length} Konsumen</span></div><div class="card"><span class="lbl">Total Potensi Pipeline</span><span class="v">${money(pipelineTotal)}</span></div></div>
  <section class="section"><div class="sec-head"><span class="sec-num">1</span><span class="sec-title">Pencapaian Omset Tim</span><span class="sec-sub">Closing MTD sampai ${date(data.periodEnd)}</span></div><div class="sec-body"><table><thead><tr><th>No</th><th>Nama Sales</th><th>Nama Konsumen</th><th>Project</th><th>Unit</th><th class="num">Harga Jual Resmi</th><th>Tgl Visit</th><th>Tgl Closing</th></tr></thead><tbody>${rows(data.closings.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.salesPerson)}</td><td>${esc(x.customer)}</td><td>${esc(x.project)}</td><td>${esc(x.unit)}</td><td class="num">${money(x.value)}</td><td>${date(x.visitDate)}</td><td>${date(x.closingDate)}</td></tr>`))}<tr class="total"><td colspan="5">TOTAL OMSET MTD</td><td class="num">${money(closingTotal)}</td><td colspan="2">${data.closings.length} closing</td></tr></tbody></table></div></section>
  <section class="section"><div class="sec-head"><span class="sec-num">2</span><span class="sec-title">Pencapaian Visit Tim</span><span class="sec-sub">Target 40 visit per orang</span></div><div class="sec-body"><div class="visit-grid"><div class="vcard vcard-hunter ${data.hunterVisits < visitTarget ? "missed" : ""}"><b>${esc(data.hunterName)}</b><div class="sub">Sales Hunter · Akumulasi Accompanied Visit tim</div><div class="figs"><div class="fig"><b>${data.hunterVisits}</b>Accompanied</div><div class="fig"><b>${visitTarget}</b>Target</div><div class="fig"><b>${visitPct}%</b>Capaian</div></div><div class="visit-status ${data.hunterVisits < visitTarget ? "missed" : ""}">${data.hunterVisits < visitTarget ? "⚠ Belum tercapai" : "✓ Target tercapai"}</div></div>${data.salesVisits.map(x=>`<div class="vcard ${x.visits < visitTarget ? "missed" : ""}"><b>${esc(x.name)}</b><div class="sub">Sales Person · Target ${visitTarget}</div><div class="figs"><div class="fig"><b>${x.visitKonsumen || 0}</b>Konsumen</div><div class="fig"><b>${x.visitLokasi || 0}</b>Lokasi</div><div class="fig"><b>${x.accompanied || 0}</b>Didampingi</div><div class="fig"><b>${x.visits}</b>Total</div></div><div class="visit-status ${x.visits < visitTarget ? "missed" : ""}">${x.visits < visitTarget ? "⚠ Belum tercapai" : "✓ Target tercapai"}</div></div>`).join("")}</div></div></section>
  <section class="section"><div class="sec-head"><span class="sec-num">3</span><span class="sec-title">Pipeline Hot &amp; Potensi Omset</span><span class="sec-sub">Seluruh pipeline berstatus Hot</span></div><div class="sec-body"><table><thead><tr><th>No</th><th>Sales</th><th>Konsumen</th><th>Project</th><th>Unit</th><th class="num">Potensi</th><th>Visit</th><th>Booking Fee</th></tr></thead><tbody>${rows(data.pipelines.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.salesPerson)}</td><td>${esc(x.customer)}</td><td>${esc(x.project)}</td><td>${esc(x.unit)}</td><td class="num">${money(x.value)}</td><td>${date(x.visitDate)}</td><td><span class="badge">${x.bookingFee ? "Sudah" : "Belum"}</span></td></tr>`))}<tr class="total"><td colspan="5">TOTAL POTENSI PIPELINE HOT</td><td class="num">${money(pipelineTotal)}</td><td colspan="2">${data.pipelines.length} konsumen</td></tr></tbody></table></div></section>
  <section class="section"><div class="sec-head"><span class="sec-num">4</span><span class="sec-title">Rencana Aktivitas Minggu Depan</span></div><div class="sec-body"><table><thead><tr><th>No</th><th>Aktivitas</th><th>Target / Hasil yang Diharapkan</th></tr></thead><tbody>${rows(data.activities.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.activity)}</td><td>${esc(x.target)}</td></tr>`),3)}</tbody></table></div></section>
  <div class="footer">CONFIDENTIAL · INTERNAL PT CENTRAL GROUP DEVELOPMENT · Dibuat ${esc(new Date().toLocaleString("id-ID"))}</div></main></body></html>`
}
