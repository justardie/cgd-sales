"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as XLSX from "xlsx"
import DashboardShell from "@/components/DashboardShell"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import { supabase } from "@/lib/supabase"
import { buildReportHtml, calculateVisitSummary, getMonthRange, monthsInRange, parsePivotSheet, type MonthlyReview, type ReportSnapshot, type SalesVisit } from "@/lib/weekly-report"
import { formatRupiah } from "@/lib/utils"
import { Download, FileSpreadsheet, Trash2 } from "lucide-react"

interface StoredReport { id: string; hunter_name: string; period_start: string; period_end: string; status: "final"; snapshot: ReportSnapshot | null; updated_at: string }
const localMonth = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
const reviewMessage = "Isi What's Good, What's Bad, dan What's Next sebelum finalisasi."
const loadMessage = "Tunggu data laporan selesai dimuat."

export default function MonthlyReportPage() {
  const { user, isAdmin } = useAuth()
  const { showToast } = useToast()
  const [reportMonth, setReportMonth] = useState(localMonth(new Date()))
  const { start: periodStart, end: periodEnd } = useMemo(() => getMonthRange(reportMonth), [reportMonth])
  const [profile, setProfile] = useState({ monthly_target: 0, win_or_die_target: 0, visit_target: 0, project_coverage: [] as string[] })
  const [team, setTeam] = useState<string[]>([])
  const [visits, setVisits] = useState({ hunterVisits: 0, sales: [] as SalesVisit[] })
  const [pivotFilename, setPivotFilename] = useState("")
  const [monthlyReview, setMonthlyReview] = useState<MonthlyReview>({ good: "", bad: "", next: "" })
  const [closings, setClosings] = useState<ReportSnapshot["closings"]>([])
  const [pipelines, setPipelines] = useState<ReportSnapshot["pipelines"]>([])
  const [reports, setReports] = useState<StoredReport[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [operationalPeriod, setOperationalPeriod] = useState("")
  const operationalRequest = useRef(0)
  const pivotRequest = useRef(0)
  const operationalReady = operationalPeriod === `${periodStart}:${periodEnd}`

  const loadReports = useCallback(async () => {
    if (!user) return
    let query = supabase.from("weekly_reports").select("id,hunter_name,period_start,period_end,status,snapshot,updated_at").eq("status", "final").eq("report_type", "monthly").order("updated_at", { ascending: false })
    if (!isAdmin) query = query.eq("user_id", user.id)
    const { data, error } = await query
    if (error) {
      const errorMessage = "Data laporan gagal dimuat. Coba lagi."
      setMessage(errorMessage); showToast(errorMessage, "error")
      return
    }
    setReports((data || []) as StoredReport[])
  }, [user, isAdmin, showToast])

  const loadOperationalData = useCallback(async () => {
    const requestId = ++operationalRequest.current
    if (!user || isAdmin || user.role !== "hunter") return
    const [profileRes, teamRes, closingRes, pipelineRes] = await Promise.all([
      supabase.from("users").select("monthly_target,win_or_die_target,visit_target,project_coverage").eq("id", user.id).single(),
      supabase.from("users").select("name").eq("status", "active").in("role", ["sales_person", "telemarketing"]).eq("hunter_name", user.name),
      supabase.from("konsumen").select("sales_person,name,project,unit,nilai_hjr,visit_date,closing_date").eq("status", "closing").eq("sales_hunter", user.name).gte("closing_date", periodStart).lte("closing_date", periodEnd),
      supabase.from("konsumen").select("sales_person,name,project,unit,potensi_closing,visit_date,sudah_booking_fee").eq("status", "hot").eq("sales_hunter", user.name).or("board.eq.pipeline,board.is.null"),
    ])
    if (requestId !== operationalRequest.current) return
    if (profileRes.error || teamRes.error || closingRes.error || pipelineRes.error) {
      const errorMessage = "Data laporan gagal dimuat. Coba lagi."
      setMessage(errorMessage); showToast(errorMessage, "error")
      return
    }
    if (profileRes.data) setProfile({ monthly_target: profileRes.data.monthly_target || 0, win_or_die_target: profileRes.data.win_or_die_target || 0, visit_target: profileRes.data.visit_target || 0, project_coverage: profileRes.data.project_coverage || [] })
    setTeam((teamRes.data || []).map(x => x.name))
    setClosings((closingRes.data || []).map(x => ({ salesPerson: x.sales_person || user.name, customer: x.name, project: x.project, unit: x.unit, value: x.nilai_hjr || 0, visitDate: x.visit_date, closingDate: x.closing_date })))
    setPipelines((pipelineRes.data || []).map(x => ({ salesPerson: x.sales_person || user.name, customer: x.name, project: x.project, unit: x.unit, value: x.potensi_closing || 0, visitDate: x.visit_date, bookingFee: x.sudah_booking_fee })))
    setOperationalPeriod(`${periodStart}:${periodEnd}`)
  }, [user, isAdmin, periodStart, periodEnd, showToast])

  useEffect(() => { queueMicrotask(() => { void loadReports(); void loadOperationalData() }) }, [loadReports, loadOperationalData])
  const snapshot = useMemo<ReportSnapshot>(() => ({ hunterName: user?.name || "", reportDate: periodEnd, periodStart, periodEnd, coverage: profile.project_coverage, monthlyTarget: profile.monthly_target, winOrDieTarget: profile.win_or_die_target, visitTarget: profile.visit_target, closings, pipelines, hunterVisits: visits.hunterVisits, salesVisits: visits.sales, activities: [], monthlyReview }), [user, periodStart, periodEnd, profile, closings, pipelines, visits, monthlyReview])

  function changeReportMonth(value: string) { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return; ++operationalRequest.current; ++pivotRequest.current; setOperationalPeriod(""); setVisits({ hunterVisits: 0, sales: [] }); setPivotFilename(""); setClosings([]); setPipelines([]); setMonthlyReview({ good: "", bad: "", next: "" }); setReportMonth(value) }

  function download(data: ReportSnapshot) {
    const blob = new Blob([buildReportHtml(data, "monthly")], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob); const a = document.createElement("a")
    a.href = url; a.download = `Monthly Report - ${data.hunterName} - ${data.periodStart.slice(0, 7)}.html`; a.click(); URL.revokeObjectURL(url)
  }

  async function parsePivot(file: File) {
    if (!operationalReady) {
      setMessage(loadMessage); showToast(loadMessage, "error")
      return
    }
    const requestId = ++pivotRequest.current
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" })
      const sheetName = workbook.SheetNames.find(name => name.trim().toLowerCase() === "activities analysis") || workbook.SheetNames[0]
      const raw = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets[sheetName], { header: 1, defval: 0 })
      const summary = calculateVisitSummary(parsePivotSheet(raw, monthsInRange(periodStart, periodEnd), true), team)
      if (requestId !== pivotRequest.current) return
      setVisits(summary); setPivotFilename(file.name)
      const notice = summary.missingNames.length ? `Pivot dibaca, tetapi nama ini tidak ditemukan: ${summary.missingNames.join(", ")}` : "Pivot berhasil dibaca; semua nama tim cocok."
      setMessage(notice); showToast(notice, summary.missingNames.length ? "error" : "success")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "File Pivot tidak dapat dibaca."
      setMessage(errorMessage); showToast(errorMessage, "error")
    }
  }

  async function finalizeReport() {
    if (!user) return
    if (!operationalReady) {
      setMessage(loadMessage); showToast(loadMessage, "error")
      return
    }
    if (!pivotFilename) {
      setMessage("Unggah Pivot Activities sebelum finalisasi.")
      showToast("Unggah Pivot Activities sebelum finalisasi.", "error")
      return
    }
    if (!monthlyReview.good.trim() || !monthlyReview.bad.trim() || !monthlyReview.next.trim()) {
      setMessage(reviewMessage)
      showToast(reviewMessage, "error")
      return
    }
    setBusy(true)
    const payload = { user_id: user.id, hunter_name: user.name, report_type: "monthly", period_start: periodStart, period_end: periodEnd, status: "final", activities: [], visit_data: visits, pivot_filename: pivotFilename, snapshot, finalized_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    const { error } = await supabase.from("weekly_reports").upsert(payload, { onConflict: "user_id,report_type,period_start,period_end" })
    setBusy(false)
    if (error) {
      setMessage(`Gagal menyimpan: ${error.message}`)
      showToast(`Gagal menyimpan: ${error.message}`, "error")
      return
    }
    setMessage("Laporan difinalisasi dan diunduh.")
    showToast("Laporan berhasil difinalisasi dan diunduh", "success")
    download(snapshot)
    await loadReports()
  }

  async function deleteReport(id: string) {
    if (!window.confirm("Hapus report ini? Tindakan ini tidak dapat dibatalkan.")) return
    const { error } = await supabase.from("weekly_reports").delete().eq("id", id)
    if (error) {
      setMessage(`Gagal menghapus report: ${error.message}`)
      showToast(`Gagal menghapus report: ${error.message}`, "error")
      return
    }
    setMessage("Report berhasil dihapus.")
    showToast("Report berhasil dihapus", "success")
    await loadReports()
  }

  return <DashboardShell><div className="space-y-6">
    <div><h1 className="text-xl font-bold text-white">MONTHLY REPORT</h1><p className="text-sm text-slate-500">Monthly Sales Report · MASCOL Division</p></div>
    {isAdmin ? <ReportHistory reports={reports} onDownload={download} onDelete={deleteReport} /> : user?.role !== "hunter" ? <div className="card">MONTHLY REPORT hanya tersedia untuk Sales Hunter.</div> : <>
      <section className="rounded-xl border p-5 space-y-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}><div className="grid md:grid-cols-4 gap-3"><Field label="Sales Hunter" value={user.name} disabled /><Field label="Bulan Laporan" value={reportMonth} type="month" onChange={changeReportMonth} /><Field label="Periode Otomatis" value={`${periodStart} – ${periodEnd}`} disabled /><Field label="Coverage" value={profile.project_coverage.join(", ") || "Belum diatur"} disabled /></div></section>
      <div className="grid md:grid-cols-4 gap-3">{[["Closing Bulanan", closings.length.toString()], ["Omset Bulanan", formatRupiah(closings.reduce((sum, closing) => sum + closing.value, 0))], ["Pipeline Hot", pipelines.length.toString()], ["Potensi Pipeline", formatRupiah(pipelines.reduce((sum, pipeline) => sum + pipeline.value, 0))]].map(([label, value]) => <div key={label} className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}><div className="text-xs text-slate-500">{label}</div><b className="text-white block mt-1">{value}</b></div>)}</div>
      <section className="rounded-xl border p-5 space-y-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}><h2 className="font-semibold text-white">Pencapaian Visit Tim</h2><label className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white text-sm ${operationalReady ? "cursor-pointer bg-emerald-600" : "cursor-not-allowed bg-slate-500"}`}><FileSpreadsheet size={16} /> Upload Pivot Activities<input type="file" accept=".xlsx,.xls" className="hidden" disabled={!operationalReady} onChange={event => { const file = event.target.files?.[0]; if (file) void parsePivot(file) }} /></label>{pivotFilename && <span className="ml-3 text-xs text-emerald-400">{pivotFilename}</span>}<div className="text-sm text-slate-300">Visit Hunter: <b>{visits.hunterVisits}</b> · {visits.sales.map(sale => `${sale.name}: ${sale.visits}`).join(" · ") || "Belum ada data"}</div></section>
      <section className="rounded-xl border p-5 space-y-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}><h2 className="font-semibold text-white">Monthly Review</h2>{([ ["good", "What's Good"], ["bad", "What's Bad"], ["next", "What's Next"] ] as const).map(([field, label]) => <label key={field} className="block text-sm text-slate-300">{label}<textarea className="input-dark mt-1 w-full" rows={3} value={monthlyReview[field]} onChange={event => setMonthlyReview(value => ({ ...value, [field]: event.target.value }))} /></label>)}</section>
      {message && <p className="text-sm text-amber-300">{message}</p>}<div className="flex gap-3"><button disabled={busy} onClick={() => void finalizeReport()} className="btn-primary flex items-center gap-2"><Download size={16} /> Finalisasi &amp; Download</button></div>
      <ReportHistory reports={reports} onDownload={download} onDelete={deleteReport} />
    </>}
  </div></DashboardShell>
}

function Field({ label, value, onChange, type = "text", disabled = false }: { label: string; value: string; onChange?: (value: string) => void; type?: string; disabled?: boolean }) { return <label className="text-xs text-slate-500">{label}<input className={`input-dark mt-1 w-full ${type === "date" ? "report-date-input" : ""}`} type={type} disabled={disabled} value={value} onChange={event => onChange?.(event.target.value)} /></label> }
function ReportHistory({ reports, onDownload, onDelete }: { reports: StoredReport[]; onDownload: (snapshot: ReportSnapshot) => void; onDelete: (id: string) => void }) { return <section className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}><h2 className="font-semibold text-white mb-3">Riwayat Report</h2>{reports.length === 0 ? <p className="text-sm text-slate-500">Belum ada report.</p> : <div className="space-y-2">{reports.map(report => <div key={report.id} className="flex items-center justify-between border-b py-2" style={{ borderColor: "var(--border)" }}><div className="text-sm text-slate-300"><b>{report.hunter_name}</b> · {report.period_start} – {report.period_end}</div><div className="flex items-center gap-3">{report.snapshot && <button className="text-emerald-400" title="Download report" onClick={() => onDownload(report.snapshot!)}><Download size={17} /></button>}<button className="text-red-400 hover:text-red-300" title="Delete report" onClick={() => onDelete(report.id)}><Trash2 size={17} /></button></div></div>)}</div>}</section> }
