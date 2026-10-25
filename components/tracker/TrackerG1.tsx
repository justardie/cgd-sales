"use client"
import { useState, type ReactNode } from "react"
import { GROUPS, addDays, type GroupId, type TrackerData, type Vol } from "@/lib/tracker-metrics"
import { Defs, Delta, Grp, Table, dLabel, groupLabel, n, pct, rLabel, type Col } from "./ui"

type Q = "q1" | "q2" | "q3" | "q4" | "q5"
type Period = "wk" | "mtd"
export interface ArchiveResult { date: string; exact: boolean; counts: Record<GroupId, number> }

const VOL_DEFS: [string, string][] = [
  ["Leads baru", "Lead dengan tanggal dibuat (Created On) di periode itu. Sumber: leads_tgl_dibuat_created_on.csv, folder Terbaru."],
  ["4 sumber", "Dipetakan dari Medium dan Source CRM. DIGITAL MARKETING dan CONVENTIONAL masuk DGM Marcomm. Canvassing, Pameran, Open Booth masuk Offline. Iklan Pribadi Sales, ECommerce (medium sales), Landing Page masuk DGM Sales. Bank, Member by Sales (EMS), BGB, Referral (sales partner), Agent, Scan Iphone, Cross Selling masuk Channel lain."],
  ["* Minggu lalu / Bulan lalu", "Periode yang sama panjangnya, supaya adil: Senin sampai hari yang sama minggu lalu, dan tanggal 1 sampai tanggal yang sama bulan lalu."],
]
const VOL_KEYS = { "Minggu ini": "wk", "Minggu lalu*": "wkPrev", "MTD": "mtd", "Bulan lalu*": "pmtd" } as const
const sum = <T,>(o: Record<string, T>, f: (v: T) => number) => Object.values(o).reduce((a, v) => a + f(v), 0)

export default function TrackerG1({ data, loadArchive }: { data: TrackerData; loadArchive: () => Promise<ArchiveResult> }) {
  const [open, setOpen] = useState<Q>("q1")
  const [period, setPeriod] = useState<Period>("mtd")
  const g = data.g1, P = data.P
  const coh = g.cohort[period]
  const perLabel = period === "wk" ? "minggu ini" : "MTD"
  const tot = { wk: sum(g.vol, (v) => v.wk), prev: sum(g.vol, (v) => v.wkPrev), mtd: sum(g.vol, (v) => v.mtd) }
  const c = { baru: sum(coh, (x) => x.baru), sam: sum(coh, (x) => x.tersambung), akt: sum(coh, (x) => x.aktif), vis: sum(coh, (x) => x.visit), hot: sum(coh, (x) => x.hot) }
  const up = GROUPS.filter((x) => g.vol[x.id].wk > g.vol[x.id].wkPrev).length
  const down = GROUPS.filter((x) => g.vol[x.id].wk < g.vol[x.id].wkPrev).length
  const gapTotal = data.projects.reduce((a, p) => a + p.gap, 0)

  const bars = (get: (id: GroupId) => number) => {
    const max = Math.max(1, ...GROUPS.map((x) => get(x.id)))
    return (
      <div className="trk-mini">
        {GROUPS.map((x) => (
          <div key={x.id} className="trk-mini-row has-bar">
            <span className={`trk-sw trk-sw-${x.id}`} /><span className="trk-mini-l">{x.label}</span>
            <span className="trk-mini-b"><span className={`fill trk-sw-${x.id}`} style={{ width: `${Math.round((get(x.id) / max) * 100)}%` }} /></span>
            <span className="trk-mini-v">{n(get(x.id))}</span>
          </div>
        ))}
      </div>
    )
  }
  const step = (label: string, v: number, base: number) => (
    <span className="trk-f-step"><span className="trk-f-bar"><span className="trk-f-fill" style={{ width: `${Math.round((v / (base || 1)) * 100)}%` }} /></span><span>{label} {n(v)}</span></span>
  )
  const card = (id: Q, q: string, big: string, sub: ReactNode, extra: ReactNode) => (
    <button type="button" className={`trk-card${open === id ? " open" : ""}`} aria-expanded={open === id} onClick={() => setOpen(id)}>
      <span className="trk-q"><b>{id.toUpperCase()}</b> {q}</span>
      <span className="trk-big">{big}</span>
      <span className="trk-sub">{sub}</span>
      {extra}
    </button>
  )

  return (
    <div className="trk-view">
      <div className="trk-view-head">
        <div>
          <h2>G1 · Leads Generation</h2>
          <p className="trk-lede">Pasokan leads dari 4 sumber. Minggu ini {rLabel(P.wk)}, dibanding periode yang sama minggu lalu ({rLabel(P.wkPrev)}). MTD {rLabel(P.mtd)}.</p>
        </div>
        <div className="trk-head-tools">
          <span className="trk-tool-l">Leads baru Q3–Q4</span>
          <div className="trk-seg" role="group" aria-label="Periode leads baru untuk Q3 dan Q4">
            {([["wk", "Minggu ini"], ["mtd", "MTD"]] as const).map(([k, l]) => (
              <button key={k} type="button" aria-pressed={period === k} onClick={() => setPeriod(k)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="trk-cards">
        {card("q1", "Leads baru per sumber", n(tot.mtd), <>MTD · minggu ini <b>{n(tot.wk)}</b></>, bars((id) => g.vol[id].mtd))}
        {card("q2", "Naik dan turun vs minggu lalu", `${up} naik · ${down} turun`, <>Total minggu ini <Delta now={tot.wk} prev={tot.prev} /></>,
          <div className="trk-mini">{GROUPS.map((x) => <div key={x.id} className="trk-mini-row"><span className={`trk-sw trk-sw-${x.id}`} /><span className="trk-mini-l">{x.label}</span><Delta now={g.vol[x.id].wk} prev={g.vol[x.id].wkPrev} /></div>)}</div>)}
        {card("q3", "Tersambung ke sales dan jadi leads aktif", pct(c.sam, c.baru), <>tersambung · <b>{n(c.akt)}</b> aktif dari {n(c.baru)} leads baru {perLabel}</>,
          <div className="trk-funnel">{step("Baru", c.baru, c.baru)}{step("Tersambung", c.sam, c.baru)}{step("Aktif", c.akt, c.baru)}</div>)}
        {card("q4", "Lanjut ke visit dan potensi closing", `${n(c.vis)} visit`, <><b>{n(c.hot)}</b> hot dari leads baru {perLabel}</>,
          <div className="trk-funnel">{step("Baru", c.baru, c.baru)}{step("Visit", c.vis, c.baru)}{step("Hot", c.hot, c.baru)}</div>)}
        {card("q5", "Gap terhadap 10 leads aktif per sales", `${n(gapTotal)} leads`, <>kurang di semua proyek · terbesar <b>{data.projects[0]?.project ?? "–"}</b></>,
          <div className="trk-mini">{data.projects.slice(0, 4).map((p) => <div key={p.project} className="trk-mini-row wide"><span className="trk-mini-l">{p.project}</span><span className={`trk-mini-v ${p.gap ? "trk-neg" : "trk-pos"}`}>{p.gap ? `−${n(p.gap)}` : "cukup"}</span></div>)}</div>)}
      </div>

      <section className="trk-detail" aria-live="polite">
        {open === "q1" && <Q1 data={data} />}
        {open === "q2" && <Q2 data={data} />}
        {open === "q3" && <Q3 data={data} period={period} loadArchive={loadArchive} />}
        {open === "q4" && <Q4 data={data} period={period} />}
        {open === "q5" && <Q5 data={data} />}
      </section>
    </div>
  )
}

interface VolRow { key: string; label: ReactNode; v: Vol; top?: boolean; g?: GroupId; d?: number }
const volCols: Col<VolRow>[] = [
  { label: "Sumber", cell: (r) => r.label },
  { label: "Minggu ini", num: true, cell: (r) => n(r.v.wk) },
  { label: "Minggu lalu*", num: true, cell: (r) => n(r.v.wkPrev) },
  { label: "Perubahan", num: true, cell: (r) => <Delta now={r.v.wk} prev={r.v.wkPrev} /> },
  { label: "MTD", num: true, cell: (r) => n(r.v.mtd) },
  { label: "Bulan lalu*", num: true, cell: (r) => n(r.v.pmtd) },
]

function Q1({ data }: { data: TrackerData }) {
  const rows: VolRow[] = []
  for (const gr of GROUPS) {
    const v = data.g1.vol[gr.id]
    rows.push({ key: gr.id, label: <Grp id={gr.id} />, v, top: true })
    Object.entries(v.subs).sort((a, b) => b[1].mtd - a[1].mtd).forEach(([s, x]) => {
      if (x.mtd || x.wk || x.wkPrev || x.pmtd) rows.push({ key: `${gr.id}-${s}`, label: <span className="trk-subsrc">{s}</span>, v: x })
    })
  }
  const t = Object.values(data.g1.vol).reduce((a, v) => ({ wk: a.wk + v.wk, wkPrev: a.wkPrev + v.wkPrev, mtd: a.mtd + v.mtd, pmtd: a.pmtd + v.pmtd }), { wk: 0, wkPrev: 0, mtd: 0, pmtd: 0 })
  return (
    <div>
      <h3>Q1 · Leads baru minggu ini dan MTD, per sumber</h3>
      <Table cols={volCols} rows={rows} rowKey={(r) => r.key} rowClass={(r) => (r.top ? "row-group" : "")}
        foot={(col) => col.label === "Sumber" ? "Total" : col.label === "Perubahan" ? <Delta now={t.wk} prev={t.wkPrev} /> : n(t[VOL_KEYS[col.label as keyof typeof VOL_KEYS]])} />
      <Defs items={VOL_DEFS} />
    </div>
  )
}

function Q2({ data }: { data: TrackerData }) {
  const rows: VolRow[] = []
  for (const gr of GROUPS) {
    Object.entries(data.g1.vol[gr.id].subs).forEach(([s, x]) => {
      if (x.wk || x.wkPrev) rows.push({ key: `${gr.id}-${s}`, label: s, v: x, g: gr.id, d: x.wk - x.wkPrev })
    })
  }
  rows.sort((a, b) => (a.d ?? 0) - (b.d ?? 0))
  const leak = rows.filter((r) => (r.d ?? 0) < 0)
  const cols: Col<VolRow>[] = [
    { label: "Sumber CRM", cell: (r) => <Grp id={r.g!} label={String(r.label)} /> },
    { label: "Kelompok", cell: (r) => groupLabel(r.g!) },
    ...volCols.slice(1, 4),
  ]
  return (
    <div>
      <h3>Q2 · Sumber yang naik dan turun dibanding minggu lalu</h3>
      <p className="trk-note">{leak.length ? `Turun paling dalam: ${leak.slice(0, 3).map((r) => `${r.label} (${r.d})`).join(", ")}. Sumber yang turun dua minggu berturut-turut layak dicek sebagai kebocoran.` : "Tidak ada sumber yang turun minggu ini."}</p>
      <Table cols={cols} rows={rows} rowKey={(r) => r.key} rowClass={(r) => ((r.d ?? 0) < 0 ? "row-down" : "")} />
      <Defs items={VOL_DEFS} />
    </div>
  )
}

function cohortRows(data: TrackerData, period: Period) {
  const c = data.g1.cohort[period]
  const rows = GROUPS.map((gr) => ({ id: gr.id, ...c[gr.id], pool: data.g1.pool[gr.id] }))
  const t = rows.reduce((a, r) => ({ baru: a.baru + r.baru, tersambung: a.tersambung + r.tersambung, aktif: a.aktif + r.aktif, visit: a.visit + r.visit, hot: a.hot + r.hot, pa: a.pa + r.pool.aktif, ph: a.ph + r.pool.hot }),
    { baru: 0, tersambung: 0, aktif: 0, visit: 0, hot: 0, pa: 0, ph: 0 })
  return { rows, t }
}
type CRow = ReturnType<typeof cohortRows>["rows"][number]

function Q3({ data, period, loadArchive }: { data: TrackerData; period: Period; loadArchive: () => Promise<ArchiveResult> }) {
  const { rows, t } = cohortRows(data, period)
  const per = period === "wk" ? "minggu ini" : "MTD"
  const baruLabel = `Leads baru ${per}`
  const cols: Col<CRow>[] = [
    { label: "Sumber", cell: (r) => <Grp id={r.id} /> },
    { label: baruLabel, num: true, cell: (r) => n(r.baru) },
    { label: "Tersambung", num: true, cell: (r) => n(r.tersambung) },
    { label: "% tersambung", num: true, cell: (r) => pct(r.tersambung, r.baru) },
    { label: "Jadi aktif", num: true, cell: (r) => n(r.aktif) },
    { label: "% aktif", num: true, cell: (r) => pct(r.aktif, r.baru) },
    { label: "Pool aktif saat ini", num: true, cell: (r) => n(r.pool.aktif) },
  ]
  const foot: Record<string, string> = { Sumber: "Total", [baruLabel]: n(t.baru), Tersambung: n(t.tersambung), "% tersambung": pct(t.tersambung, t.baru), "Jadi aktif": n(t.aktif), "% aktif": pct(t.aktif, t.baru), "Pool aktif saat ini": n(t.pa) }
  return (
    <div>
      <h3>Q3 · Leads baru yang tersambung ke sales dan menjadi leads aktif</h3>
      <p className="trk-note trk-warnnote"><strong>{n(data.g1.unassigned.mtd)} leads baru MTD belum punya sales</strong> (total {n(data.g1.unassigned.all)} sejak 1 Agustus). Status ini perlu dikonfirmasi ke SI: belum dibagi, atau data sales tidak ikut ter-export.</p>
      <Table cols={cols} rows={rows} rowKey={(r) => r.id} foot={(col) => foot[col.label] ?? ""} />
      <ArchiveBlock data={data} loadArchive={loadArchive} />
      <Defs items={[
        ["Tersambung", "Lead punya nama Salesperson di CRM."],
        ["Leads aktif", `Status Prospect, Warm, Visit, Hot, atau Hold Unit; tidak di Leads Nurture; dan ada aktivitas tercatat di CIS dalam 7 hari terakhir (${rLabel([addDays(data.ref, -6), data.ref])}). Aktivitas dari activity_csv.csv.`],
        ["Pool aktif saat ini", "Semua leads aktif hari ini, termasuk leads lama, dari leads_last_updated_on.csv."],
      ]} />
    </div>
  )
}

function ArchiveBlock({ data, loadArchive }: { data: TrackerData; loadArchive: () => Promise<ArchiveResult> }) {
  const [state, setState] = useState<{ busy: boolean; res: ArchiveResult | null; err: string }>({ busy: false, res: null, err: "" })
  const run = async () => {
    setState({ busy: true, res: null, err: "" })
    try { setState({ busy: false, res: await loadArchive(), err: "" }) }
    catch (e) { setState({ busy: false, res: null, err: e instanceof Error ? e.message : "Arsip belum bisa dimuat." }) }
  }
  const a = state.res
  if (!a) return (
    <div className="trk-archive">
      <button type="button" className="trk-btn ghost" disabled={state.busy} onClick={run}>{state.busy ? "Memuat arsip…" : "Bandingkan pool aktif dengan 7 hari lalu"}</button>
      <span className="trk-hint">{state.err || "Memakai snapshot leads di folder Arsip. File arsip besar, jadi dimuat hanya saat diminta."}</span>
    </div>
  )
  return (
    <div className="trk-archive">
      <p className="trk-note">Pool aktif per {dLabel(a.date)} (arsip{a.exact ? "" : ", arsip terdekat yang ada"}) dibanding hari ini:</p>
      <Table rows={GROUPS} rowKey={(r) => r.id} cols={[
        { label: "Sumber", cell: (r) => <Grp id={r.id} /> },
        { label: dLabel(a.date), num: true, cell: (r) => n(a.counts[r.id]) },
        { label: "Hari ini", num: true, cell: (r) => n(data.g1.pool[r.id].aktif) },
        { label: "Perubahan", num: true, cell: (r) => <Delta now={data.g1.pool[r.id].aktif} prev={a.counts[r.id]} /> },
      ]} />
    </div>
  )
}

function Q4({ data, period }: { data: TrackerData; period: Period }) {
  const { rows, t } = cohortRows(data, period)
  const baruLabel = `Leads baru ${period === "wk" ? "minggu ini" : "MTD"}`
  const cols: Col<CRow>[] = [
    { label: "Sumber", cell: (r) => <Grp id={r.id} /> },
    { label: baruLabel, num: true, cell: (r) => n(r.baru) },
    { label: "Sampai visit", num: true, cell: (r) => n(r.visit) },
    { label: "% visit", num: true, cell: (r) => pct(r.visit, r.baru) },
    { label: "Sampai hot", num: true, cell: (r) => n(r.hot) },
    { label: "% hot", num: true, cell: (r) => pct(r.hot, r.baru) },
    { label: "Hot saat ini (semua leads)", num: true, cell: (r) => n(r.pool.hot) },
  ]
  const foot: Record<string, string> = { Sumber: "Total", [baruLabel]: n(t.baru), "Sampai visit": n(t.visit), "% visit": pct(t.visit, t.baru), "Sampai hot": n(t.hot), "% hot": pct(t.hot, t.baru), "Hot saat ini (semua leads)": n(t.ph) }
  return (
    <div>
      <h3>Q4 · Leads baru yang lanjut ke visit dan potensi closing</h3>
      <Table cols={cols} rows={rows} rowKey={(r) => r.id} foot={(col) => foot[col.label] ?? ""} />
      <Defs items={[
        ["Sampai visit", "Status lead sekarang Visit, Hot, Hold Unit, atau Booked."],
        ["Sampai hot", "Status lead sekarang Hot, Hold Unit, atau Booked. Hot = potensi closing di level G1."],
        ["Catatan", "Potensi closing di menu M1 memakai daftar Gold Chest dari SL, bukan status Hot."],
      ]} />
    </div>
  )
}

type GapRow = { key: string; top: boolean; label: ReactNode; sales?: number; aktif: number; std: string; kurang: number }
function Q5({ data }: { data: TrackerData }) {
  const rows: GapRow[] = []
  for (const p of data.projects) {
    rows.push({ key: p.project, top: true, label: <strong>{p.project}</strong>, sales: p.sales, aktif: p.aktif, std: n(p.std), kurang: p.gap })
    ;[...p.under].sort((a, b) => a.aktif - b.aktif).forEach((u) => rows.push({ key: `${p.project}-${u.sales}`, top: false, label: <span className="trk-subsrc">{u.sales} · {u.team}</span>, aktif: u.aktif, std: "10", kurang: u.kurang }))
  }
  return (
    <div>
      <h3>Q5 · Gap per proyek terhadap standar 10 leads aktif per sales</h3>
      <Table rows={rows} rowKey={(r) => r.key} rowClass={(r) => (r.top ? "row-group" : "")} cols={[
        { label: "Proyek / sales", cell: (r) => r.label },
        { label: "Sales", num: true, cell: (r) => (r.top ? n(r.sales ?? 0) : "") },
        { label: "Leads aktif", num: true, cell: (r) => n(r.aktif) },
        { label: "Standar", num: true, cell: (r) => r.std },
        { label: "Kurang", num: true, cell: (r) => (r.kurang ? <span className="trk-neg">−{n(r.kurang)}</span> : <span className="trk-pos">cukup</span>) },
      ]} />
      <Defs items={[
        ["Kurang", "Dihitung per sales: 10 dikurangi leads aktifnya, minimal 0. Sales yang lebih dari 10 tidak menutup kekurangan sales lain."],
        ["Proyek sales", "Proyek tempat sebagian besar leads aktif sales itu berada."],
        ["Leads aktif", "Definisi sama dengan Q3."],
      ]} />
    </div>
  )
}
