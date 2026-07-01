export interface PivotVisitRow { name: string; visitKonsumen: number; accompanied: number; visitLokasi: number }
export interface SalesVisit { name: string; visits: number }
export interface ReportClosing { salesPerson: string; customer: string; project?: string | null; unit?: string | null; value: number; visitDate?: string | null; closingDate?: string | null }
export interface ReportPipeline { salesPerson: string; customer: string; project?: string | null; unit?: string | null; value: number; visitDate?: string | null; bookingFee?: boolean }
export interface ReportActivity { activity: string; target: string }
export interface ReportSnapshot {
  hunterName: string; periodStart: string; periodEnd: string; coverage: string[]
  monthlyTarget: number; winOrDieTarget: number; closings: ReportClosing[]; pipelines: ReportPipeline[]
  hunterVisits: number; salesVisits: SalesVisit[]; activities: ReportActivity[]
}

export function normalizePersonName(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ")
}

export function calculateVisitSummary(rows: PivotVisitRow[], activeSalesNames: string[]) {
  const byName = new Map(rows.map(row => [normalizePersonName(row.name), row]))
  const sales = activeSalesNames.map(name => {
    const row = byName.get(normalizePersonName(name))
    return { name, visits: row ? row.visitKonsumen + row.accompanied + row.visitLokasi : 0 }
  })
  const hunterVisits = activeSalesNames.reduce((sum, name) => sum + (byName.get(normalizePersonName(name))?.accompanied || 0), 0)
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

export function buildReportHtml(data: ReportSnapshot) {
  const closingTotal = data.closings.reduce((sum, item) => sum + item.value, 0)
  const pipelineTotal = data.pipelines.reduce((sum, item) => sum + item.value, 0)
  const rows = (items: string[]) => items.length ? items.join("") : '<tr><td colspan="8" class="empty">Belum ada data</td></tr>'
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Weekly Report - ${esc(data.hunterName)}</title><style>
  @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#F4FAF7;color:#1B4332;font:11px Arial,sans-serif}.page{max-width:1120px;margin:auto;padding:18px}.head{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #2D6A4F;padding-bottom:12px}.brand{font-size:20px;font-weight:800}.muted{color:#5A8272}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.card{background:#fff;border:1px solid #D6EFD8;border-radius:9px;padding:11px}.card b{display:block;font-size:16px;margin-top:5px}.section{background:#fff;border:1px solid #D6EFD8;border-radius:9px;padding:12px;margin:12px 0;break-inside:avoid}.section h2{margin:0 0 9px;font-size:13px;color:#2D6A4F}table{width:100%;border-collapse:collapse}th{background:#E8F5EE;text-align:left}th,td{padding:6px;border:1px solid #D6EFD8;vertical-align:top}.num{text-align:right}.empty{text-align:center;color:#5A8272}.footer{text-align:center;color:#5A8272;margin-top:12px;font-size:9px}@media print{body{background:#fff}.page{padding:0}.no-print{display:none}}</style></head><body><main class="page">
  <div class="head"><div><div class="brand">PT CENTRAL GROUP DEVELOPMENT · MASCOL</div><div class="muted">WEEKLY SALES REPORT</div></div><div><b>${esc(data.hunterName)}</b><br>${date(data.periodStart)} – ${date(data.periodEnd)}<br>Coverage: ${esc(data.coverage.join(", ") || "—")}<br>Target Omset: ${money(data.monthlyTarget)} · Win-or-Die: ${money(data.winOrDieTarget)}</div></div>
  <div class="grid"><div class="card">Closing MTD<b>${data.closings.length}</b></div><div class="card">Omset MTD<b>${money(closingTotal)}</b></div><div class="card">Pipeline Hot<b>${data.pipelines.length}</b></div><div class="card">Potensi Pipeline<b>${money(pipelineTotal)}</b></div></div>
  <section class="section"><h2>1. DATA CLOSING / PENCAPAIAN OMSET MTD</h2><table><thead><tr><th>Sales</th><th>Konsumen</th><th>Project</th><th>Unit</th><th class="num">HJR</th><th>Visit</th><th>Closing</th></tr></thead><tbody>${rows(data.closings.map(x=>`<tr><td>${esc(x.salesPerson)}</td><td>${esc(x.customer)}</td><td>${esc(x.project)}</td><td>${esc(x.unit)}</td><td class="num">${money(x.value)}</td><td>${date(x.visitDate)}</td><td>${date(x.closingDate)}</td></tr>`))}</tbody></table></section>
  <section class="section"><h2>2. PENCAPAIAN VISIT TIM</h2><div class="grid"><div class="card">Visit Sales Hunter<b>${data.hunterVisits}</b></div>${data.salesVisits.map(x=>`<div class="card">${esc(x.name)}<b>${x.visits}</b></div>`).join("")}</div></section>
  <section class="section"><h2>3. DATA PIPELINE & POTENSI OMSET MINGGU INI (HOT)</h2><table><thead><tr><th>Sales</th><th>Konsumen</th><th>Project</th><th>Unit</th><th class="num">Potensi</th><th>Visit</th><th>BF</th></tr></thead><tbody>${rows(data.pipelines.map(x=>`<tr><td>${esc(x.salesPerson)}</td><td>${esc(x.customer)}</td><td>${esc(x.project)}</td><td>${esc(x.unit)}</td><td class="num">${money(x.value)}</td><td>${date(x.visitDate)}</td><td>${x.bookingFee ? "Ya" : "Tidak"}</td></tr>`))}</tbody></table></section>
  <section class="section"><h2>4. RENCANA AKTIVITAS MINGGU DEPAN</h2><table><thead><tr><th>Aktivitas</th><th>Target / Hasil yang Diharapkan</th></tr></thead><tbody>${rows(data.activities.map(x=>`<tr><td>${esc(x.activity)}</td><td>${esc(x.target)}</td></tr>`))}</tbody></table></section>
  <div class="footer">CONFIDENTIAL · INTERNAL PT CENTRAL GROUP DEVELOPMENT · Dibuat ${esc(new Date().toLocaleString("id-ID"))}</div></main></body></html>`
}
