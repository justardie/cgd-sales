"use client"
import { useMemo, useState } from "react"
import { GROUPS, type SalesRow, type TrackerData } from "@/lib/tracker-metrics"
import { PENYEBAB, type ZeroNote } from "@/lib/tracker-store"
import { Defs, Meter, Pill, Table, n, rLabel, type Col } from "./ui"

interface Props {
  data: TrackerData
  notes: ZeroNote[]
  onSaveNote: (month: string, sales: string, penyebab: string[], tindakan: string) => Promise<void>
}

export default function TrackerSales({ data, notes, onSaveNote }: Props) {
  const [team, setTeam] = useState("")
  const [only0, setOnly0] = useState(false)
  const [open, setOpen] = useState("")
  const month = data.ref.slice(0, 7)
  const noteFor = (sales: string) => notes.find((x) => x.month === month && x.sales_name === sales)
  const teams = useMemo(() => [...new Set(data.sales.map((s) => s.team || "Tanpa tim"))].sort(), [data.sales])
  const rows = data.sales.filter((s) => (!team || (s.team || "Tanpa tim") === team) && (!only0 || s.closeMtd === 0))
  const zero = data.sales.filter((s) => s.kind === "sales" && s.closeMtd === 0).length
  const salesCount = data.sales.filter((s) => s.kind === "sales").length

  const cols: Col<SalesRow>[] = [
    { label: "Sales", cell: (r) => <span className="trk-who"><b>{r.sales}</b>{r.kind === "agent" && <Pill kind="muted">Agent/partner/lainnya</Pill>}</span> },
    { label: "Tim", cell: (r) => r.team || "Tanpa tim" },
    ...GROUPS.map((g): Col<SalesRow> => ({ label: g.label, num: true, cell: (r) => (r.baru[g.id] ? n(r.baru[g.id]) : <span className="trk-zero">0</span>) })),
    { label: "Leads aktif", num: true, cell: (r) => (r.kind === "sales" ? <Meter value={r.aktif} target={10} /> : "–") },
    { label: "Visit MTD", num: true, cell: (r) => n(r.visitMtd) },
    { label: "Hot", num: true, cell: (r) => n(r.hot) },
    { label: "Closing minggu ini", num: true, cell: (r) => n(r.closeWk) },
    { label: "Closing MTD", num: true, cell: (r) => (r.closeMtd ? <b>{n(r.closeMtd)}</b> : <span className="trk-neg">0</span>) },
    { label: "Status", cell: (r) => <StatusCell row={r} note={noteFor(r.sales)} /> },
  ]

  return (
    <div className="trk-view">
      <div className="trk-view-head">
        <div>
          <h2>Tracker A · per sales</h2>
          <p className="trk-lede">Leads baru MTD dari 4 sumber, leads aktif terhadap standar 10, visit, hot, dan closing. {n(zero)} dari {n(salesCount)} sales belum closing bulan ini. Klik baris untuk mengisi penyebab dan tindakan.</p>
        </div>
      </div>
      <div className="trk-filters">
        <label htmlFor="trk-f-team">Tim</label>
        <select id="trk-f-team" value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="">Semua tim</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="trk-check"><input id="trk-f-zero" type="checkbox" checked={only0} onChange={(e) => setOnly0(e.target.checked)} />Hanya yang closing MTD nol</label>
      </div>
      <Table cols={cols} rows={rows} rowKey={(r) => r.sales}
        rowClass={(r) => `${r.status === "nol" ? "row-zero" : ""}${open === r.sales ? " row-open" : ""}`}
        onRow={(r) => setOpen(open === r.sales ? "" : r.sales)}
        after={(r) => (open === r.sales ? <NoteEditor key={r.sales} sales={r.sales} month={month} saved={noteFor(r.sales)} onSave={onSaveNote} /> : null)} />
      <Defs items={[
        ["Kolom 4 sumber", `Leads baru MTD (${rLabel(data.P.mtd)}) milik sales itu, per sumber. Pemetaan sama dengan G1.`],
        ["Leads aktif", "Definisi sama dengan G1 Q3. Standar 10 per sales."],
        ["Visit MTD", "Aktivitas tatap muka bulan ini: Visit Konsumen, Visit Lokasi, Accompanied Visit."],
        ["Hot", "Leads sales itu yang statusnya Hot saat ini."],
        ["Closing", "SO berstatus Closing, BAST Done, atau Pre-SKUP berdasarkan Closing Date, tanpa yang dibatalkan dan tanpa PROCUREMENT MRD. Sumber: penjualan_master_so.csv."],
        ["Agent/partner/lainnya", "Nama di SO yang tidak memegang leads di CRM, misalnya kantor agen properti. Closing-nya tetap dihitung ke tim tercatat."],
        ["Status", "Merah: closing MTD nol. Kuning: sudah closing tapi leads aktif di bawah 10. Hijau: aman."],
      ]} />
    </div>
  )
}

function StatusCell({ row, note }: { row: SalesRow; note?: ZeroNote }) {
  const pill = row.status === "nol" ? <Pill kind="bad">Closing nol</Pill> : row.status === "kurang" ? <Pill kind="warn">Leads &lt; 10</Pill> : <Pill kind="ok">Aman</Pill>
  if (!note?.penyebab.length) return pill
  return <span className="trk-who">{pill}<small>{note.penyebab.join(", ")}{note.tindakan ? ` → ${note.tindakan}` : ""}</small></span>
}

function NoteEditor({ sales, month, saved, onSave }: { sales: string; month: string; saved?: ZeroNote; onSave: Props["onSaveNote"] }) {
  const [penyebab, setPenyebab] = useState<string[]>(saved?.penyebab ?? [])
  const [tindakan, setTindakan] = useState(saved?.tindakan ?? "")
  const [busy, setBusy] = useState(false)
  const id = `trk-tindakan-${sales.replace(/\W+/g, "-")}`
  const toggle = (p: string) => setPenyebab((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))
  return (
    <div className="trk-editor" onClick={(e) => e.stopPropagation()}>
      <div className="trk-ed-col">
        <span className="trk-ed-l">Penyebab ({sales}, {month})</span>
        <div className="trk-chips" role="group" aria-label="Penyebab">
          {PENYEBAB.map((p) => <button key={p} type="button" className={`trk-chip${penyebab.includes(p) ? " on" : ""}`} aria-pressed={penyebab.includes(p)} onClick={() => toggle(p)}>{p}</button>)}
        </div>
      </div>
      <div className="trk-ed-col grow">
        <label className="trk-ed-l" htmlFor={id}>Tindakan</label>
        <textarea id={id} rows={2} placeholder="Tindakan minggu ini, siapa, kapan" value={tindakan} onChange={(e) => setTindakan(e.target.value)} />
      </div>
      <div className="trk-ed-act">
        <button type="button" className="trk-btn" disabled={busy} onClick={async () => { setBusy(true); try { await onSave(month, sales, penyebab, tindakan.trim()) } catch { /* the page shows the error; keep the draft */ } finally { setBusy(false) } }}>
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
        {saved?.updated_at && <small>Terakhir disimpan {saved.updated_at.slice(0, 10)}</small>}
      </div>
    </div>
  )
}
