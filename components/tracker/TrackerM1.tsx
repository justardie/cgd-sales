"use client"
import { useMemo, useState, type FormEvent } from "react"
import { STD, addDays, goldStage, weekStart, type GoldStage, type TrackerData } from "@/lib/tracker-metrics"
import type { GoldItem } from "@/lib/tracker-store"
import { Defs, Meter, Pill, Table, dLabel, n, rupiahM, shortTeam } from "./ui"

interface Props {
  data: TrackerData
  gold: GoldItem[]
  targets: Record<string, number>
  onAddGold: (item: Omit<GoldItem, "id">) => Promise<void>
  onDeleteGold: (id: string) => Promise<void>
  onSaveTarget: (team: string, value: number) => Promise<void>
}

const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
const STAGE: Record<GoldStage, ["muted" | "warn" | "ok", string]> = { potensi: ["muted", "Potensi"], terbukti: ["warn", "Terbukti"], closing: ["ok", "Closing"] }

export default function TrackerM1({ data, gold, targets, onAddGold, onDeleteGold, onSaveTarget }: Props) {
  const thisWeek = weekStart(todayKey())
  const [week, setWeek] = useState(thisWeek)
  const rows = data.m1.rows
  const weekGold = gold.filter((g) => g.week_start === week)
  const staged = weekGold.map((g) => ({ g, stage: goldStage({ leadId: g.lead_id, nama: g.lead_name, week: g.week_start }, data.m1.picker, data.closings) }))
  const goldBySales = new Map<string, number>()
  weekGold.forEach((g) => goldBySales.set(g.sales_name, (goldBySales.get(g.sales_name) ?? 0) + 1))
  const tAktif = rows.reduce((a, r) => a + Math.min(r.aktif, STD.activePerSales), 0)
  const tWk = rows.reduce((a, r) => a + r.pWk, 0), tMtd = rows.reduce((a, r) => a + r.pMtd, 0)
  const omsetReal = data.m1.omset.reduce((a, o) => a + o.realisasi, 0)
  const omsetTarget = data.m1.teams.reduce((a, t) => a + (targets[t] ?? 0), 0)
  const nSales = rows.length

  return (
    <div className="trk-view">
      <div className="trk-view-head"><div>
        <h2>M1 · ME CH + CT</h2>
        <p className="trk-lede">Tim SL Rosmaida dan SL Andriansyah Pulungan, {nSales} sales. Lead measure per sales, Gold Chest dari SL, dan omset terhadap target.</p>
      </div></div>

      <div className="trk-cards">
        <Kpi label="Sales dengan ≥10 leads aktif" big={`${rows.filter((r) => r.aktif >= STD.activePerSales).length} / ${nSales}`} sub={`Leads aktif terhitung (maks 10 per sales): ${n(tAktif)} dari ${n(nSales * STD.activePerSales)}`} />
        <Kpi label="Prospecting tatap muka minggu ini" big={`${n(tWk)} / ${n(nSales * STD.prospectWeek)}`} sub={`Bulan ini ${n(tMtd)} / ${n(nSales * STD.prospectMonth)}`} />
        <Kpi gold label={`Gold Chest minggu ${dLabel(week)}`} big={`${n(weekGold.length)} / ${n(nSales * STD.goldPerWeek)}`} sub={`Terbukti ${staged.filter((x) => x.stage !== "potensi").length} · Closing ${staged.filter((x) => x.stage === "closing").length}`} />
        <Kpi label="Omset MTD" big={rupiahM(omsetReal)} sub={omsetTarget ? `Target ${rupiahM(omsetTarget)} · gap ${rupiahM(Math.max(0, omsetTarget - omsetReal))}` : "Target belum diisi"} />
      </div>

      <section className="trk-block">
        <h3>Lead measure per sales</h3>
        <Table rows={rows} rowKey={(r) => r.sales} cols={[
          { label: "Sales", cell: (r) => <b>{r.sales}</b> },
          { label: "Tim", cell: (r) => shortTeam(r.team) },
          { label: "Leads aktif (10)", num: true, cell: (r) => <Meter value={r.aktif} target={STD.activePerSales} /> },
          { label: `Prospecting ${dLabel(data.ref)} (2)`, num: true, cell: (r) => <Meter value={r.pToday} target={STD.prospectDay} /> },
          { label: "Minggu ini (10)", num: true, cell: (r) => <Meter value={r.pWk} target={STD.prospectWeek} /> },
          { label: "Bulan ini (40)", num: true, cell: (r) => <Meter value={r.pMtd} target={STD.prospectMonth} /> },
          { label: "Gold Chest (3)", num: true, cell: (r) => <Meter value={goldBySales.get(r.sales) ?? 0} target={STD.goldPerWeek} /> },
        ]} />
      </section>

      <GoldChest data={data} week={week} setWeek={setWeek} weeks={[...new Set([thisWeek, ...gold.map((g) => g.week_start)])].sort().reverse()} staged={staged} onAdd={onAddGold} onDelete={onDeleteGold} />
      <OmsetBlock data={data} targets={targets} onSave={onSaveTarget} />

      <Defs items={[
        ["Leads aktif", "Definisi sama dengan G1 Q3: kontak ≤7 hari, tercatat di CIS. Standar 10 per sales."],
        ["Prospecting", "Bertemu langsung dengan konsumen: Visit Konsumen, Visit Lokasi, Accompanied Visit. Call, chat, telemarketing, pameran, dan canvasing tidak dihitung. Standar 2 per hari, 10 per minggu, 40 per bulan. Hari = tanggal data terakhir."],
        ["Gold Chest", "3 lead per sales per minggu (Senin–Minggu) yang disetor SL dan diisi admin."],
        ["Terbukti", "Lead Gold Chest yang sudah Booked atau Hold Unit di CRM, atau punya SO Pre-SKUP setelah minggu itu dimulai."],
        ["Closing", "Lead Gold Chest yang punya SO Closing atau BAST Done. Dicocokkan lewat nama customer atau nama lead di SO."],
        ["Omset", "Jumlah Harga Jual Resmi dari SO Closing, BAST Done, dan Pre-SKUP bulan ini yang tercatat di tim SL tersebut."],
      ]} />
    </div>
  )
}

function Kpi({ label, big, sub, gold }: { label: string; big: string; sub: string; gold?: boolean }) {
  return <div className={`trk-card static${gold ? " gold" : ""}`}><span className="trk-q">{label}</span><span className="trk-big">{big}</span><span className="trk-sub">{sub}</span></div>
}

const EMPTY = { lead: "", kendala: "", minat: "", kebutuhan: "", target: "" }
function GoldChest({ data, week, setWeek, weeks, staged, onAdd, onDelete }: {
  data: TrackerData; week: string; setWeek: (w: string) => void; weeks: string[]
  staged: { g: GoldItem; stage: GoldStage }[]; onAdd: Props["onAddGold"]; onDelete: Props["onDeleteGold"]
}) {
  const [f, setF] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const options = useMemo(() => data.m1.picker.slice(0, 4000), [data.m1.picker])
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF((cur) => ({ ...cur, [k]: e.target.value }))
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const id = f.lead.split("·")[0].trim()
    const lead = data.m1.picker.find((l) => l.id === id)
    if (!lead) { setErr("Pilih lead dari daftar (CH atau CT)."); return }
    setBusy(true); setErr("")
    try {
      await onAdd({ week_start: week, lead_id: id, lead_name: lead.nama, sales_name: lead.sales, team: lead.team, project: lead.project, kendala: f.kendala.trim(), minat: f.minat.trim(), kebutuhan: f.kebutuhan.trim(), target_closing: f.target || null })
      setF(EMPTY)
    } catch (ex) { setErr(ex instanceof Error ? ex.message : "Gagal menyimpan.") } finally { setBusy(false) }
  }
  return (
    <section className="trk-block trk-gold-block">
      <div className="trk-block-head">
        <h3>Gold Chest · potensi closing</h3>
        <div className="trk-fld inline">
          <label htmlFor="trk-gc-week">Minggu</label>
          <select id="trk-gc-week" value={week} onChange={(e) => setWeek(e.target.value)}>
            {weeks.map((w) => <option key={w} value={w}>Minggu {dLabel(w)} – {dLabel(addDays(w, 6))}</option>)}
          </select>
        </div>
      </div>
      <form className="trk-gc-form" onSubmit={submit}>
        <div className="trk-fld wide"><label htmlFor="trk-gc-lead">Lead</label><input id="trk-gc-lead" list="trk-gc-leads" placeholder="Ketik nama atau ID lead" value={f.lead} onChange={set("lead")} /></div>
        <div className="trk-fld"><label htmlFor="trk-gc-kendala">Kendala</label><textarea id="trk-gc-kendala" rows={2} value={f.kendala} onChange={set("kendala")} /></div>
        <div className="trk-fld"><label htmlFor="trk-gc-minat">Minat</label><textarea id="trk-gc-minat" rows={2} value={f.minat} onChange={set("minat")} /></div>
        <div className="trk-fld"><label htmlFor="trk-gc-kebutuhan">Kebutuhan</label><textarea id="trk-gc-kebutuhan" rows={2} value={f.kebutuhan} onChange={set("kebutuhan")} /></div>
        <div className="trk-fld"><label htmlFor="trk-gc-target">Target closing</label><input id="trk-gc-target" type="date" value={f.target} onChange={set("target")} /></div>
        <div className="trk-fld act"><button type="submit" className="trk-btn gold" disabled={busy}>{busy ? "Menyimpan…" : "Tandai potensi closing"}</button></div>
        {err && <p className="trk-err">{err}</p>}
      </form>
      <datalist id="trk-gc-leads">{options.map((l) => <option key={l.id} value={`${l.id} · ${l.nama} · ${l.sales} · ${l.status}`} />)}</datalist>
      {staged.length ? (
        <Table rows={staged} rowKey={(x) => x.g.id} cols={[
          { label: "Lead", cell: (x) => <span className="trk-who"><b>{x.g.lead_name}</b><small>{x.g.lead_id} · {x.g.project}</small></span> },
          { label: "Sales", cell: (x) => <span className="trk-who">{x.g.sales_name}<small>{shortTeam(x.g.team)}</small></span> },
          { label: "Kendala", cell: (x) => x.g.kendala || "–" },
          { label: "Minat", cell: (x) => x.g.minat || "–" },
          { label: "Kebutuhan", cell: (x) => x.g.kebutuhan || "–" },
          { label: "Target", cell: (x) => (x.g.target_closing ? dLabel(x.g.target_closing) : "–") },
          { label: "Tahap", cell: (x) => <Pill kind={STAGE[x.stage][0]}>{STAGE[x.stage][1]}</Pill> },
          { label: "", cell: (x) => <button type="button" className="trk-btn ghost sm" onClick={() => { onDelete(x.g.id).catch(() => { /* the page shows the error */ }) }}>Hapus</button> },
        ]} />
      ) : <p className="trk-empty-note">Belum ada lead di Gold Chest minggu ini. Isi dari setoran SL: 3 lead per sales yang berpotensi closing minggu ini.</p>}
    </section>
  )
}

function OmsetBlock({ data, targets, onSave }: { data: TrackerData; targets: Record<string, number>; onSave: Props["onSaveTarget"] }) {
  const [edit, setEdit] = useState<Record<string, string>>({})
  const rows = data.m1.omset.map((o) => ({ ...o, target: targets[o.team] ?? 0 }))
  const prod = rows.flatMap((r) => r.byProject.map((p) => ({ team: r.team, ...p })))
  return (
    <section className="trk-block">
      <h3>Omset {data.ref.slice(0, 7)} · target vs realisasi vs gap</h3>
      <Table rows={rows} rowKey={(r) => r.team} cols={[
        { label: "Tim", cell: (r) => shortTeam(r.team) },
        { label: "Target / bulan", cell: (r) => {
          const val = edit[r.team] ?? (r.target ? String(r.target / 1e9) : "")
          return (
            <span className="trk-tgt">Rp
              <input type="number" step="0.1" min="0" className="trk-num-in" aria-label={`Target ${r.team} dalam miliar`} value={val} onChange={(e) => setEdit((c) => ({ ...c, [r.team]: e.target.value }))} />M
              <button type="button" className="trk-btn ghost sm" onClick={async () => {
                const v = parseFloat(val.replace(",", "."))
                if (!(v >= 0)) return
                try { await onSave(r.team, v * 1e9) } catch { return }
                setEdit((cur) => Object.fromEntries(Object.entries(cur).filter(([k]) => k !== r.team)))
              }}>Simpan</button>
            </span>
          )
        } },
        { label: "Realisasi MTD", num: true, cell: (r) => rupiahM(r.realisasi) },
        { label: "Unit", num: true, cell: (r) => n(r.unit) },
        { label: "Gap", num: true, cell: (r) => (r.target ? <span className={r.realisasi >= r.target ? "trk-pos" : "trk-neg"}>{rupiahM(r.target - r.realisasi)}</span> : "–") },
        { label: "Capaian", num: true, cell: (r) => (r.target ? <Meter value={Math.round((r.realisasi / r.target) * 100)} target={100} /> : "–") },
      ]} />
      {prod.length > 0 && <Table rows={prod} rowKey={(x) => `${x.team}-${x.project}`} cols={[
        { label: "Produk (proyek)", cell: (x) => x.project },
        { label: "Tim", cell: (x) => shortTeam(x.team) },
        { label: "Unit", num: true, cell: (x) => n(x.unit) },
        { label: "Realisasi", num: true, cell: (x) => rupiahM(x.harga) },
      ]} />}
    </section>
  )
}
