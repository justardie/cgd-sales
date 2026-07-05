"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import DashboardShell from "@/components/DashboardShell"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { buildReportHtml, calculateVisitSummary, getMtdRange, getPreviousWeekPeriod, monthsInRange, parsePivotSheet, type ReportActivity, type ReportSnapshot, type SalesVisit } from "@/lib/weekly-report"
import { formatRupiah } from "@/lib/utils"
import { Download, FileSpreadsheet, Plus, Trash2 } from "lucide-react"

interface StoredReport { id: string; hunter_name: string; period_start: string; period_end: string; status: "final"; snapshot: ReportSnapshot|null; updated_at: string }
const iso = (date: Date) => date.toISOString().slice(0, 10)
const emptyActivity = (): ReportActivity => ({ activity: "", target: "" })

export default function ReportPage() {
  const { user, isAdmin } = useAuth()
  const [reportDate, setReportDate] = useState(iso(new Date()))
  const { start: periodStart, end: periodEnd } = useMemo(() => getPreviousWeekPeriod(reportDate), [reportDate])
  const [profile, setProfile] = useState({ monthly_target: 0, win_or_die_target: 0, visit_target: 0, project_coverage: [] as string[] })
  const [team, setTeam] = useState<string[]>([])
  const [visits, setVisits] = useState({ hunterVisits: 0, sales: [] as SalesVisit[] })
  const [pivotFilename, setPivotFilename] = useState("")
  const [activities, setActivities] = useState<ReportActivity[]>([emptyActivity()])
  const [closings, setClosings] = useState<ReportSnapshot["closings"]>([])
  const [pipelines, setPipelines] = useState<ReportSnapshot["pipelines"]>([])
  const [reports, setReports] = useState<StoredReport[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  const loadReports = useCallback(async () => {
    if (!user) return
    let query = supabase.from("weekly_reports").select("id,hunter_name,period_start,period_end,status,snapshot,updated_at").eq("status", "final").order("updated_at", { ascending: false })
    if (!isAdmin) query = query.eq("user_id", user.id)
    const { data } = await query
    setReports((data || []) as StoredReport[])
  }, [user, isAdmin])

  const loadOperationalData = useCallback(async () => {
    if (!user || isAdmin || user.role !== "hunter") return
    const mtd = getMtdRange(periodEnd)
    const [profileRes, teamRes, closingRes, pipelineRes] = await Promise.all([
      supabase.from("users").select("monthly_target,win_or_die_target,visit_target,project_coverage").eq("id", user.id).single(),
      supabase.from("users").select("name").eq("status", "active").in("role", ["sales_person", "telemarketing"]).eq("hunter_name", user.name),
      supabase.from("konsumen").select("sales_person,name,project,unit,nilai_hjr,visit_date,closing_date").eq("status", "closing").eq("sales_hunter", user.name).gte("closing_date", mtd.start).lte("closing_date", mtd.end),
      supabase.from("konsumen").select("sales_person,name,project,unit,potensi_closing,visit_date,sudah_booking_fee").eq("status", "hot").eq("sales_hunter", user.name).or("board.eq.pipeline,board.is.null"),
    ])
    if (profileRes.data) setProfile({ monthly_target: profileRes.data.monthly_target || 0, win_or_die_target: profileRes.data.win_or_die_target || 0, visit_target: profileRes.data.visit_target || 0, project_coverage: profileRes.data.project_coverage || [] })
    setTeam((teamRes.data || []).map(x => x.name))
    setClosings((closingRes.data || []).map(x => ({ salesPerson: x.sales_person || user.name, customer: x.name, project: x.project, unit: x.unit, value: x.nilai_hjr || 0, visitDate: x.visit_date, closingDate: x.closing_date })))
    setPipelines((pipelineRes.data || []).map(x => ({ salesPerson: x.sales_person || user.name, customer: x.name, project: x.project, unit: x.unit, value: x.potensi_closing || 0, visitDate: x.visit_date, bookingFee: x.sudah_booking_fee })))
  }, [user, isAdmin, periodEnd])

  useEffect(() => { queueMicrotask(() => { void loadReports(); void loadOperationalData() }) }, [loadReports, loadOperationalData])
  const snapshot = useMemo<ReportSnapshot>(() => ({ hunterName: user?.name || "", reportDate, periodStart, periodEnd, coverage: profile.project_coverage, monthlyTarget: profile.monthly_target, winOrDieTarget: profile.win_or_die_target, visitTarget: profile.visit_target, closings, pipelines, hunterVisits: visits.hunterVisits, salesVisits: visits.sales, activities: activities.filter(x => x.activity.trim() || x.target.trim()) }), [user, reportDate, periodStart, periodEnd, profile, closings, pipelines, visits, activities])

  function download(data: ReportSnapshot) {
    const blob = new Blob([buildReportHtml(data)], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob); const a = document.createElement("a")
    a.href = url; a.download = `Weekly Report - ${data.hunterName} - ${data.periodStart}.html`; a.click(); URL.revokeObjectURL(url)
  }

  async function parsePivot(file: File) {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" })
      const sheetName = workbook.SheetNames.find(name => name.trim().toLowerCase() === "activities analysis") || workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const raw = XLSX.utils.sheet_to_json<(string|number)[]>(sheet, { header: 1, defval: 0 })
      const rows = parsePivotSheet(raw, monthsInRange(periodStart, periodEnd))
      const summary = calculateVisitSummary(rows, team)
      setVisits(summary); setPivotFilename(file.name); setMessage(summary.missingNames.length ? `Pivot dibaca, tetapi nama ini tidak ditemukan: ${summary.missingNames.join(", ")}` : "Pivot berhasil dibaca; semua nama tim cocok.")
    } catch (error) { setMessage(error instanceof Error ? error.message : "File Pivot tidak dapat dibaca.") }
  }

  async function finalizeReport() {
    if (!user) return
    if (reports.some(r => r.period_start === periodStart && r.period_end === periodEnd)) { setMessage("Report periode ini sudah final dan tidak dapat diubah."); return }
    if (!pivotFilename) { setMessage("Unggah Pivot Activities sebelum finalisasi."); return }
    if (snapshot.activities.length === 0) { setMessage("Isi minimal satu rencana aktivitas."); return }
    setBusy(true)
    const payload = { user_id: user.id, hunter_name: user.name, period_start: periodStart, period_end: periodEnd, status: "final", activities: snapshot.activities, visit_data: visits, pivot_filename: pivotFilename, snapshot, finalized_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    const { error } = await supabase.from("weekly_reports").upsert(payload, { onConflict: "user_id,period_start,period_end" })
    setBusy(false)
    if (error) { setMessage(`Gagal menyimpan: ${error.message}`); return }
    setMessage("Laporan difinalisasi dan diunduh.")
    download(snapshot)
    await loadReports()
  }

  async function deleteReport(id: string) {
    if (!window.confirm("Hapus report ini? Tindakan ini tidak dapat dibatalkan.")) return
    const { error } = await supabase.from("weekly_reports").delete().eq("id", id)
    if (error) { setMessage(`Gagal menghapus report: ${error.message}`); return }
    setMessage("Report berhasil dihapus.")
    await loadReports()
  }

  return <DashboardShell><div className="space-y-6">
    <div><h1 className="text-xl font-bold text-white">REPORT</h1><p className="text-sm text-slate-500">Weekly Sales Report · MASCOL Division</p></div>
    {isAdmin ? <ReportHistory reports={reports} onDownload={download} onDelete={deleteReport} /> : user?.role !== "hunter" ? <div className="card">REPORT hanya tersedia untuk Sales Hunter.</div> : <>
      <section className="rounded-xl border p-5 space-y-4" style={{background:"var(--surface)",borderColor:"var(--border)"}}>
        <div className="grid md:grid-cols-4 gap-3"><Field label="Sales Hunter" value={user.name} disabled/><Field label="Tanggal Laporan" value={reportDate} type="date" onChange={setReportDate}/><Field label="Periode Otomatis (Senin–Minggu)" value={`${periodStart} – ${periodEnd}`} disabled/><Field label="Coverage" value={profile.project_coverage.join(", ") || "Belum diatur"} disabled/></div>
      </section>
      <div className="grid md:grid-cols-4 gap-3">{[["Closing MTD",closings.length.toString()],["Omset MTD",formatRupiah(closings.reduce((s,x)=>s+x.value,0))],["Pipeline Hot",pipelines.length.toString()],["Potensi Pipeline",formatRupiah(pipelines.reduce((s,x)=>s+x.value,0))]].map(([a,b])=><div key={a} className="rounded-xl border p-4" style={{background:"var(--surface)",borderColor:"var(--border)"}}><div className="text-xs text-slate-500">{a}</div><b className="text-white block mt-1">{b}</b></div>)}</div>
      <section className="rounded-xl border p-5 space-y-3" style={{background:"var(--surface)",borderColor:"var(--border)"}}><h2 className="font-semibold text-white">Pencapaian Visit Tim</h2><label className="inline-flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer bg-emerald-600 text-white text-sm"><FileSpreadsheet size={16}/> Upload Pivot Activities<input type="file" accept=".xlsx,.xls" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void parsePivot(f)}}/></label>{pivotFilename&&<span className="ml-3 text-xs text-emerald-400">{pivotFilename}</span>}<div className="text-sm text-slate-300">Visit Hunter: <b>{visits.hunterVisits}</b> · {visits.sales.map(x=>`${x.name}: ${x.visits}`).join(" · ") || "Belum ada data"}</div></section>
      <section className="rounded-xl border p-5 space-y-3" style={{background:"var(--surface)",borderColor:"var(--border)"}}><div className="flex justify-between"><h2 className="font-semibold text-white">Rencana Aktivitas Minggu Depan</h2><button className="text-sm text-emerald-400 flex gap-1" onClick={()=>setActivities(x=>[...x,emptyActivity()])}><Plus size={16}/> Tambah</button></div>{activities.map((row,i)=><div key={i} className="grid md:grid-cols-[1fr_1fr_auto] gap-2"><input className="input-dark" placeholder="Aktivitas" value={row.activity} onChange={e=>setActivities(x=>x.map((v,j)=>j===i?{...v,activity:e.target.value}:v))}/><input className="input-dark" placeholder="Target / hasil yang diharapkan" value={row.target} onChange={e=>setActivities(x=>x.map((v,j)=>j===i?{...v,target:e.target.value}:v))}/><button className="text-red-400 px-2" onClick={()=>setActivities(x=>x.length===1?[emptyActivity()]:x.filter((_,j)=>j!==i))}><Trash2 size={17}/></button></div>)}</section>
      {message&&<p className="text-sm text-amber-300">{message}</p>}<div className="flex gap-3"><button disabled={busy} onClick={()=>void finalizeReport()} className="btn-primary flex items-center gap-2"><Download size={16}/> Finalisasi &amp; Download</button></div>
      <ReportHistory reports={reports} onDownload={download} onDelete={deleteReport}/>
    </>}
  </div></DashboardShell>
}

function Field({label,value,onChange,type="text",disabled=false}:{label:string;value:string;onChange?:(v:string)=>void;type?:string;disabled?:boolean}) { return <label className="text-xs text-slate-500">{label}<input className={`input-dark mt-1 w-full ${type === "date" ? "report-date-input" : ""}`} type={type} disabled={disabled} value={value} onChange={e=>onChange?.(e.target.value)}/></label> }
function ReportHistory({reports,onDownload,onDelete}:{reports:StoredReport[];onDownload:(s:ReportSnapshot)=>void;onDelete:(id:string)=>void}) { return <section className="rounded-xl border p-5" style={{background:"var(--surface)",borderColor:"var(--border)"}}><h2 className="font-semibold text-white mb-3">Riwayat Report</h2>{reports.length===0?<p className="text-sm text-slate-500">Belum ada report.</p>:<div className="space-y-2">{reports.map(r=><div key={r.id} className="flex items-center justify-between border-b py-2" style={{borderColor:"var(--border)"}}><div className="text-sm text-slate-300"><b>{r.hunter_name}</b> · {r.period_start} – {r.period_end}</div><div className="flex items-center gap-3">{r.snapshot&&<button className="text-emerald-400" title="Download report" onClick={()=>onDownload(r.snapshot!)}><Download size={17}/></button>}<button className="text-red-400 hover:text-red-300" title="Delete report" onClick={()=>onDelete(r.id)}><Trash2 size={17}/></button></div></div>)}</div>}</section> }
