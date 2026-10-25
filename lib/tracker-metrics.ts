// TRACKER — pure calculations over the CIS CRM exports (leads, activity, SO).
// Every rule here matches a written definition shown on the /tracker page.

export type Row = Record<string, string>
export type GroupId = "marcomm" | "offline" | "dgmsales" | "lain"
export type Range = readonly [string, string]

export const ACTIVE_STATUS = ["Prospect", "Warm", "Visit", "Hot", "Hold Unit"]
const VISIT_PLUS = ["Visit", "Hot", "Hold Unit", "Booked"]
const HOT_PLUS = ["Hot", "Hold Unit", "Booked"]
export const FACE_TO_FACE = ["Visit Konsumen", "Visit Lokasi", "Accompanied Visit (Didampingi Atasan)"]
const CLOSING_STATUS = ["Closing", "BAST Done", "Pre - SKUP"]
const EXCLUDED_SALES = ["PROCUREMENT MRD"]
const ACTIVE_WINDOW_DAYS = 7
export const STD = { activePerSales: 10, prospectDay: 2, prospectWeek: 10, prospectMonth: 40, goldPerWeek: 3 } as const
export const M1_TEAMS = ["Sales Leader Rosmaida", "Sales Leader Andriansyah Pulungan"]
export const GROUPS: { id: GroupId; label: string }[] = [
  { id: "marcomm", label: "DGM Marcomm" },
  { id: "offline", label: "Offline" },
  { id: "dgmsales", label: "DGM Sales" },
  { id: "lain", label: "Channel lain" },
]
const OFFLINE_SRC = ["Canvassing", "Pameran", "Open Booth/ Table"]
const DGMSALES_SRC = ["Iklan Pribadi Sales: Organik", "Iklan Pribadi Sales: Paid", "ECommerce", "Ecommerce", "Landing Page"]

// ---------- CSV ----------
export function parseCSV(input: string): Row[] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  if (!text) return []
  const nl = text.indexOf("\n")
  const head = text.slice(0, nl < 0 ? text.length : nl)
  const delim = head.split(";").length > head.split(",").length ? ";" : ","
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
      continue
    }
    if (c === '"') quoted = true
    else if (c === delim) { row.push(field); field = "" }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = "" }
    else if (c !== "\r") field += c
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row) }
  const cols = (rows.shift() ?? []).map((s) => s.trim())
  const out: Row[] = []
  for (const a of rows) {
    if (a.length === 1 && a[0] === "") continue
    const o: Row = {}
    cols.forEach((k, i) => { o[k] = (a[i] ?? "").trim() })
    out.push(o)
  }
  return out
}

// ---------- dates as "yyyy-mm-dd" keys ----------
export function dkey(s: string | undefined): string {
  if (!s || s.length < 10) return ""
  return `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}`
}
const toDate = (k: string) => new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)))
const fromDate = (d: Date) => d.toISOString().slice(0, 10)
export function addDays(k: string, n: number): string { const d = toDate(k); d.setUTCDate(d.getUTCDate() + n); return fromDate(d) }
export function weekStart(k: string): string { return addDays(k, -((toDate(k).getUTCDay() + 6) % 7)) }
const monthStart = (k: string) => k.slice(0, 8) + "01"
export const inRange = (k: string, r: Range) => !!k && k >= r[0] && k <= r[1]
// Rupiah amounts: plain digits, "1.234.567,00" (dot thousands), or "1234567.00" (dot decimal).
function num(s: string | undefined): number {
  if (!s) return 0
  const t = s.trim()
  if (/^-?\d+$/.test(t)) return +t
  const idStyle = t.includes(",") || /^-?\d{1,3}(\.\d{3})+$/.test(t)
  const v = parseFloat(idStyle ? t.replace(/\./g, "").replace(",", ".") : t)
  return Number.isNaN(v) ? 0 : v
}

// ---------- source mapping ----------
function channelSub(s: string): string {
  if (s.toUpperCase().includes("BANK")) return "Bank"
  if (s === "Member by Sales") return "EMS"
  if (s === "BGB by Sales") return "BGB"
  if (s === "Referral by Sales" || s === "Referral") return "Sales partner"
  if (s === "Agent" || s === "Agent by Sales") return "Agents"
  return "Lainnya" + (s ? ` (${s})` : "")
}
export function classify(medium: string | undefined, source: string | undefined): { group: GroupId; sub: string } {
  const m = (medium ?? "").toUpperCase()
  const s = source ?? ""
  if (m === "DIGITAL MARKETING" || m === "CONVENTIONAL") return { group: "marcomm", sub: s || "Tanpa source" }
  if (m === "SALES CHANNEL OPTIMIZE" || m === "CORPORATE ACTIVITIES / OTHER") return { group: "lain", sub: channelSub(s) }
  if (OFFLINE_SRC.includes(s)) return { group: "offline", sub: s }
  if (DGMSALES_SRC.includes(s)) return { group: "dgmsales", sub: s === "Ecommerce" ? "ECommerce" : s }
  return { group: "lain", sub: channelSub(s) }
}
/** Name key used to match a lead to an SO customer. */
export const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9 ]/g, "").replace(/\s+/g, " ").trim()
const teamName = (t: string | undefined) => (t ?? "").replace(/^HOD Ardiawan - /, "").trim()

// ---------- model types ----------
export interface Lead {
  id: string; nama: string; project: string; sales: string; team: string; status: string; nurture: boolean
  group: GroupId; sub: string; created: string; updated: string; active: boolean
}
export interface Closing { k: string; status: string; sales: string; team: string; project: string; customer: string; lead: string; harga: number }
export interface Periods { today: Range; wk: Range; wkPrev: Range; mtd: Range; pmtd: Range }
export interface Vol { wk: number; wkPrev: number; mtd: number; pmtd: number }
export interface Cohort { baru: number; tersambung: number; aktif: number; visit: number; hot: number }
export interface SalesRow {
  sales: string; team: string; kind: "sales" | "agent"; baru: Record<GroupId, number>; baruTotal: number
  aktif: number; hot: number; visitMtd: number; closeWk: number; closeMtd: number; mainProject: string; status: "nol" | "kurang" | "ok"
}
export interface ProjectGap { project: string; sales: number; aktif: number; std: number; gap: number; under: { sales: string; team: string; aktif: number; kurang: number }[] }
export interface M1Row { sales: string; team: string; aktif: number; pToday: number; pWk: number; pMtd: number }
export interface Omset { team: string; realisasi: number; unit: number; byProject: { project: string; unit: number; harga: number }[] }

export interface TrackerInput { leadsNew: Row[]; leadsUpd?: Row[]; activity: Row[]; so?: Row[] }

const groupsOf = <T,>(make: () => T) => Object.fromEntries(GROUPS.map((g) => [g.id, make()])) as Record<GroupId, T>

export function periods(ref: string): Periods {
  const wk0 = weekStart(ref)
  const days = (toDate(ref).getTime() - toDate(wk0).getTime()) / 864e5
  const pm = addDays(monthStart(ref), -1)
  const pmStart = monthStart(pm)
  return {
    today: [ref, ref],
    wk: [wk0, ref],
    wkPrev: [addDays(wk0, -7), addDays(wk0, -7 + days)],
    mtd: [monthStart(ref), ref],
    pmtd: [pmStart, addDays(pmStart, Math.min(+ref.slice(8, 10), +pm.slice(8, 10)) - 1)],
  }
}

interface Ctx { ref: string; P: Periods; leads: Lead[]; newLeads: Lead[]; closings: Closing[]; acts: { id: string; k: string; who: string; type: string }[]; lastAct: Map<string, string>; actDates: Map<string, string[]> }

function toLead(r: Row): Lead {
  const cl = classify(r["Medium"], r["Source"])
  return {
    id: r["Lead ID"], nama: r["Nama Leads"] ?? "", project: r["Project"] ?? "", sales: r["Salesperson"] ?? "", team: teamName(r["Sales Team"]),
    status: r["Status"] ?? "", nurture: r["Di Leads Nurture"] === "Ya", group: cl.group, sub: cl.sub,
    created: dkey(r["Created On"]), updated: dkey(r["Last Updated On"]), active: false,
  }
}

function buildCtx(input: TrackerInput): Ctx {
  let ref = ""
  const lastAct = new Map<string, string>(), actDates = new Map<string, string[]>()
  const acts = input.activity.map((a) => ({ id: a["Lead ID"], k: dkey(a["Completion Date"]), who: a["Assigned To"] ?? "", type: a["Activity Type"] ?? "" })).filter((a) => a.k)
  for (const a of acts) {
    if (a.k > ref) ref = a.k
    if ((lastAct.get(a.id) ?? "") < a.k) lastAct.set(a.id, a.k)
    const list = actDates.get(a.id)
    if (list) list.push(a.k); else actDates.set(a.id, [a.k])
  }
  const byId = new Map<string, Lead>()
  for (const r of [...(input.leadsUpd ?? []), ...input.leadsNew]) {
    if (!r["Lead ID"]) continue
    const l = toLead(r)
    if (l.updated > ref) ref = l.updated
    const prev = byId.get(l.id)
    if (!prev || l.updated > prev.updated) byId.set(l.id, l)
  }
  if (!ref) ref = fromDate(new Date())
  const from = addDays(ref, -(ACTIVE_WINDOW_DAYS - 1))
  const leads = [...byId.values()].map((l) => ({ ...l, active: ACTIVE_STATUS.includes(l.status) && !l.nurture && (lastAct.get(l.id) ?? "") >= from }))
  const finalById = new Map(leads.map((l) => [l.id, l]))
  const newLeads = input.leadsNew.filter((r) => r["Lead ID"]).map((r) => finalById.get(r["Lead ID"]) ?? toLead(r))
  const closings: Closing[] = (input.so ?? [])
    .filter((r) => CLOSING_STATUS.includes(r["Status"]) && !r["Cancel Date"] && !EXCLUDED_SALES.includes(r["Salesperson"]) && r["Closing Date"])
    .map((r) => ({ k: dkey(r["Closing Date"]), status: r["Status"], sales: r["Salesperson"], team: teamName(r["Sales Team"]), project: r["Project"], customer: r["Customer"] ?? "", lead: r["Nama Leads"] ?? "", harga: num(r["Harga Jual Resmi"]) }))
  return { ref, P: periods(ref), leads, newLeads, closings, acts, lastAct, actDates }
}

function buildG1(c: Ctx) {
  const vol = groupsOf<Vol & { subs: Record<string, Vol> }>(() => ({ wk: 0, wkPrev: 0, mtd: 0, pmtd: 0, subs: {} }))
  const keys = ["wk", "wkPrev", "mtd", "pmtd"] as const
  for (const l of c.newLeads) {
    const v = vol[l.group]
    const sub = (v.subs[l.sub] ??= { wk: 0, wkPrev: 0, mtd: 0, pmtd: 0 })
    for (const k of keys) if (inRange(l.created, c.P[k])) { v[k]++; sub[k]++ }
  }
  const cohort = (range: Range) => {
    const o = groupsOf<Cohort>(() => ({ baru: 0, tersambung: 0, aktif: 0, visit: 0, hot: 0 }))
    for (const l of c.newLeads) {
      if (!inRange(l.created, range)) continue
      const x = o[l.group]
      x.baru++
      if (l.sales) x.tersambung++
      if (l.active) x.aktif++
      if (VISIT_PLUS.includes(l.status)) x.visit++
      if (HOT_PLUS.includes(l.status)) x.hot++
    }
    return o
  }
  const pool = groupsOf(() => ({ aktif: 0, hot: 0 }))
  for (const l of c.leads) {
    if (l.active) pool[l.group].aktif++
    if (l.status === "Hot") pool[l.group].hot++
  }
  const unassigned = { mtd: 0, all: 0 }
  for (const l of c.newLeads) if (!l.sales) { unassigned.all++; if (inRange(l.created, c.P.mtd)) unassigned.mtd++ }
  return { vol, cohort: { wk: cohort(c.P.wk), mtd: cohort(c.P.mtd) }, pool, unassigned }
}

function countBy<T>(items: T[], key: (t: T) => string | null): Map<string, number> {
  const m = new Map<string, number>()
  for (const it of items) { const k = key(it); if (k !== null) m.set(k, (m.get(k) ?? 0) + 1) }
  return m
}
const topKey = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""

function buildSales(c: Ctx): SalesRow[] {
  const map = new Map<string, SalesRow & { projects: Map<string, number>; allProjects: Map<string, number> }>()
  const leadSales = new Set(c.leads.map((l) => l.sales))
  const row = (name: string, team: string) => {
    let r = map.get(name)
    if (!r) {
      r = { sales: name, team, kind: "sales", baru: groupsOf(() => 0), baruTotal: 0, aktif: 0, hot: 0, visitMtd: 0, closeWk: 0, closeMtd: 0, mainProject: "", status: "ok", projects: new Map(), allProjects: new Map() }
      map.set(name, r)
    }
    if (!r.team && team) r.team = team
    return r
  }
  for (const l of c.leads) {
    if (!l.sales || EXCLUDED_SALES.includes(l.sales)) continue
    const r = row(l.sales, l.team)
    r.allProjects.set(l.project, (r.allProjects.get(l.project) ?? 0) + 1)
    if (l.active) { r.aktif++; r.projects.set(l.project, (r.projects.get(l.project) ?? 0) + 1) }
    if (l.status === "Hot") r.hot++
    if (inRange(l.created, c.P.mtd)) { r.baru[l.group]++; r.baruTotal++ }
  }
  for (const cl of c.closings) {
    if (!inRange(cl.k, c.P.mtd)) continue
    const r = row(cl.sales, cl.team)
    if (!leadSales.has(cl.sales)) r.kind = "agent"
    r.closeMtd++
    if (inRange(cl.k, c.P.wk)) r.closeWk++
  }
  const faceMtd = countBy(c.acts, (a) => (FACE_TO_FACE.includes(a.type) && inRange(a.k, c.P.mtd) ? a.who : null))
  return [...map.values()].map(({ projects, allProjects, ...r }) => ({
    ...r,
    visitMtd: faceMtd.get(r.sales) ?? 0,
    mainProject: topKey(projects) || topKey(allProjects),
    status: (r.closeMtd === 0 ? "nol" : r.kind === "sales" && r.aktif < STD.activePerSales ? "kurang" : "ok") as SalesRow["status"],
  })).sort((a, b) => {
    const kind = a.kind === b.kind ? 0 : a.kind === "sales" ? -1 : 1
    const ta = a.team || "~", tb = b.team || "~"
    return kind || (ta > tb ? 1 : ta < tb ? -1 : 0) || b.aktif - a.aktif
  })
}

function buildProjects(sales: SalesRow[]): ProjectGap[] {
  const map = new Map<string, ProjectGap>()
  for (const s of sales) {
    if (s.kind !== "sales" || !s.mainProject) continue
    const p = map.get(s.mainProject) ?? { project: s.mainProject, sales: 0, aktif: 0, std: 0, gap: 0, under: [] }
    const short = Math.max(0, STD.activePerSales - s.aktif)
    map.set(s.mainProject, {
      ...p, sales: p.sales + 1, aktif: p.aktif + s.aktif, std: p.std + STD.activePerSales, gap: p.gap + short,
      under: short > 0 ? [...p.under, { sales: s.sales, team: s.team, aktif: s.aktif, kurang: short }] : p.under,
    })
  }
  return [...map.values()].sort((a, b) => b.gap - a.gap)
}

function buildM1(c: Ctx, sales: SalesRow[]) {
  const face = c.acts.filter((a) => FACE_TO_FACE.includes(a.type))
  const count = (who: string, r: Range) => face.filter((a) => a.who === who && inRange(a.k, r)).length
  const rows: M1Row[] = sales.filter((s) => s.kind === "sales" && M1_TEAMS.includes(s.team))
    .map((s) => ({ sales: s.sales, team: s.team, aktif: s.aktif, pToday: count(s.sales, c.P.today), pWk: count(s.sales, c.P.wk), pMtd: count(s.sales, c.P.mtd) }))
  const omset: Omset[] = M1_TEAMS.map((team) => {
    const mine = c.closings.filter((cl) => cl.team === team && inRange(cl.k, c.P.mtd))
    const byProject = new Map<string, { project: string; unit: number; harga: number }>()
    for (const cl of mine) {
      const bp = byProject.get(cl.project) ?? { project: cl.project, unit: 0, harga: 0 }
      byProject.set(cl.project, { ...bp, unit: bp.unit + 1, harga: bp.harga + cl.harga })
    }
    return { team, realisasi: mine.reduce((a, cl) => a + cl.harga, 0), unit: mine.length, byProject: [...byProject.values()] }
  })
  // Lead picker for Gold Chest: leads of the M1 teams that are still in play.
  const picker = c.leads.filter((l) => M1_TEAMS.includes(l.team) && l.status !== "Cold" && l.status !== "Unqualified")
    .map((l) => ({ id: l.id, nama: l.nama, sales: l.sales, team: l.team, project: l.project, status: l.status }))
  return { rows, omset, teams: M1_TEAMS, picker }
}

/** Everything the /tracker page shows, computed once on the server. */
export function buildTracker(input: TrackerInput) {
  const c = buildCtx(input)
  const sales = buildSales(c)
  const m1 = buildM1(c, sales)
  const m1Names = new Set(m1.picker.map((p) => norm(p.nama)))
  return {
    ref: c.ref,
    P: c.P,
    g1: buildG1(c),
    sales,
    projects: buildProjects(sales),
    m1,
    // Closings feed the Gold Chest stage check; only names that can match are sent.
    closings: c.closings.filter((cl) => M1_TEAMS.includes(cl.team) || m1Names.has(norm(cl.customer)) || m1Names.has(norm(cl.lead)))
      .map(({ k, status, customer, lead, sales: s }) => ({ k, status, customer, lead, sales: s })),
  }
}
export type TrackerData = ReturnType<typeof buildTracker>

/** Active leads per source as of an archived date: archived status + current activity log. */
export function activeAsOf(archive: Row[], activity: Row[], asOf: string): Record<GroupId, number> {
  const from = addDays(asOf, -(ACTIVE_WINDOW_DAYS - 1))
  const touched = new Set(activity.filter((a) => { const k = dkey(a["Completion Date"]); return k >= from && k <= asOf }).map((a) => a["Lead ID"]))
  const out = groupsOf(() => 0)
  for (const r of archive) {
    if (!ACTIVE_STATUS.includes(r["Status"]) || r["Di Leads Nurture"] === "Ya" || !touched.has(r["Lead ID"])) continue
    out[classify(r["Medium"], r["Source"]).group]++
  }
  return out
}

// ---------- Gold Chest stage (runs in the browser) ----------
export type GoldStage = "potensi" | "terbukti" | "closing"
export function goldStage(
  item: { leadId: string; nama: string; week: string },
  picker: { id: string; status: string }[],
  closings: { k: string; status: string; customer: string; lead: string }[],
): GoldStage {
  const name = norm(item.nama)
  const hits = name ? closings.filter((c) => c.k >= item.week && (norm(c.customer) === name || norm(c.lead) === name)) : []
  if (hits.some((c) => c.status !== "Pre - SKUP")) return "closing"
  const lead = picker.find((p) => p.id === item.leadId)
  if (hits.length || lead?.status === "Booked" || lead?.status === "Hold Unit") return "terbukti"
  return "potensi"
}
