"use client"
import { useCallback, useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import SalesFilterBar from "@/components/SalesFilterBar"
import { formatRupiah, CANONICAL_CARA_BAYAR } from "@/lib/utils"
import { HUNTER_GROUPS, buildSpOptions } from "@/lib/hunters"
import { formatSalesPerson, matchesPipelineStatus, type PipelineStatusFilter } from "@/lib/sales-dashboard-rules"
import { formatPipelineExport, type PipelineProgressExport } from "@/lib/pipeline-export"
import { Plus, X, Pencil, CheckCircle2, Trash2, Send, BookOpen, ChevronDown, FileDown } from "lucide-react"

interface KonsumenRow {
  id: string
  user_id?: string
  sales_hunter: string
  sales_person: string | null
  agent_name: string | null
  name: string
  project: string | null
  unit: string | null
  potensi_closing: number
  sumber_leads: string | null
  cara_bayar: string | null
  visit_date: string | null
  sudah_visit: boolean
  sudah_booking_fee: boolean
  status: string
  notes: string | null
  created_at?: string
}

const STATUSES = [
  { value: "warm",            label: "Warm",          color: "bg-yellow-500/20 text-yellow-400" },
  { value: "hot",             label: "Hot",           color: "bg-orange-500/20 text-orange-400" },
  { value: "tidak_potensial", label: "Tdk Potensial", color: "bg-slate-500/20 text-slate-400" },
]

// "Aktif" = Warm + Hot combined (no Tidak Potensial)
const PIPELINE_STATUS_OPTIONS = [
  { value: "all",             label: "Semua" },
  { value: "active",          label: "Aktif" },
  { value: "warm",            label: "Warm" },
  { value: "hot",             label: "Hot" },
  { value: "tidak_potensial", label: "Tdk Potensial" },
]

const statusBadge = (s: string) =>
  STATUSES.find(x => x.value === s) || { label: s || "—", color: "bg-slate-500/20 text-slate-400" }

/** Format raw digit string → "1.234.567" (Indonesian thousand separators, no decimals) */
function fmtRp(raw: string): string {
  if (!raw) return ""
  const n = Number(raw.replace(/\D/g, ""))
  return isNaN(n) ? "" : n.toLocaleString("id-ID")
}
/** Strip everything except digits from a user-typed rupiah string */
function parseRp(val: string): string {
  return val.replace(/\D/g, "")
}

/** Rupiah input: shows raw digits while focused (no cursor jump), formatted on blur */
function RupiahInput({ value, onChange, placeholder, required, className, style }: {
  value: string; onChange: (raw: string) => void
  placeholder?: string; required?: boolean
  className?: string; style?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="text"
      inputMode="numeric"
      value={focused ? value : fmtRp(value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={e => onChange(parseRp(e.target.value))}
      placeholder={placeholder}
      required={required}
      className={className}
      style={style}
    />
  )
}

function YNBadge({ value }: { value: boolean }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${value ? "bg-green-500/20 text-green-400" : "bg-slate-500/15 text-slate-500"}`}>
      {value ? "Y" : "N"}
    </span>
  )
}

function SortIcon({ col, sortCol, sortDir }: { col: string; sortCol: string; sortDir: "asc"|"desc" }) {
  if (sortCol !== col) return <span className="ml-0.5 opacity-25" style={{ fontSize: 9 }}>↕</span>
  return <span className="ml-0.5" style={{ fontSize: 9, color: "var(--accent)" }}>{sortDir === "asc" ? "↑" : "↓"}</span>
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg rounded-xl relative max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  )
}

interface PipelineNote {
  id: string
  konsumen_id: string
  content: string
  kendala: string | null
  next_action: string | null
  target_closing: string | null
  author_name: string
  created_by: string | null
  created_at: string
}

function PipelineNotes({ konsumenId, user, legacyNote, onSaved }: { konsumenId: string; user: { id: string; name: string } | null; legacyNote?: string; onSaved: (progress: PipelineProgressExport) => void }) {
  const [notes, setNotes]         = useState<PipelineNote[]>([])
  const [loading, setLoading]     = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [progress, setProgress]   = useState({ kendala: "", nextAction: "", targetClosing: "" })
  const [sending, setSending]     = useState(false)
  const bottomRef                 = useRef<HTMLDivElement>(null)

  const loadNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("pipeline_notes")
      .select("*")
      .eq("konsumen_id", konsumenId)
      .order("created_at", { ascending: true })
    if (error) {
      // Table might not exist yet — fall back to legacy note only
      setTableExists(false)
      setNotes([])
    } else {
      setTableExists(true)
      setNotes((data || []) as PipelineNote[])
    }
    setLoading(false)
  }, [konsumenId])

  useEffect(() => { queueMicrotask(() => void loadNotes()) }, [loadNotes])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [notes])

  async function handleSend() {
    if (!progress.kendala.trim() || !progress.nextAction.trim() || !progress.targetClosing || !user) return
    setSending(true)
    const content = `Kendala: ${progress.kendala.trim()}\nNext Action: ${progress.nextAction.trim()}\nTarget Closing: ${progress.targetClosing}`
    const { error } = await supabase.from("pipeline_notes").insert({
      konsumen_id: konsumenId,
      content,
      kendala: progress.kendala.trim(),
      next_action: progress.nextAction.trim(),
      target_closing: progress.targetClosing,
      author_name: user.name,
      created_by:  user.id,
    })
    setSending(false)
    if (error) {
      alert(`Gagal menyimpan catatan: ${error.message}`)
      return
    }
    onSaved(progress)
    setProgress({ kendala: "", nextAction: "", targetClosing: "" })
    loadNotes()
  }

  function fmtNoteDate(iso: string): string {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
  }

  return (
    <div style={{ marginTop: "8px" }}>
      <label className="text-xs text-slate-500 block mb-2" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <BookOpen size={11} /> Catatan / Progress
      </label>

      {/* Timeline */}
      <div style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {loading ? (
          <div className="text-xs text-slate-500 text-center py-3">Memuat...</div>
        ) : (
          <>
            {/* Legacy note from konsumen.notes — shown when pipeline_notes is empty */}
            {legacyNote && legacyNote.trim() && notes.length === 0 && (
              <div className="rounded-lg px-3 py-2"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", opacity: 0.75 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px", gap: "8px" }}>
                  <span className="text-xs font-semibold text-slate-400">Catatan</span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", flexShrink: 0, fontStyle: "italic" }}>catatan lama</span>
                </div>
                <div className="text-sm text-slate-300" style={{ whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{legacyNote.trim()}</div>
              </div>
            )}
            {notes.length === 0 && (!legacyNote || !legacyNote.trim()) && (
              <div className="text-xs text-slate-600 text-center py-4 rounded-lg"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                {tableExists ? "Belum ada catatan. Tulis di bawah." : "Tulis catatan baru di bawah."}
              </div>
            )}
            {notes.map(n => (
              <div key={n.id} className="rounded-lg px-3 py-2"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px", gap: "8px" }}>
                  <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>{n.author_name}</span>
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", flexShrink: 0 }}>{fmtNoteDate(n.created_at)}</span>
                </div>
                {n.kendala || n.next_action || n.target_closing ? (
                  <div className="text-xs space-y-1 text-slate-300">
                    <div><b className="text-slate-400">Kendala:</b> {n.kendala || "—"}</div>
                    <div><b className="text-slate-400">Next Action:</b> {n.next_action || "—"}</div>
                    <div><b className="text-slate-400">Target Closing:</b> {n.target_closing || "—"}</div>
                  </div>
                ) : (
                  <div className="text-sm text-white" style={{ whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{n.content}</div>
                )}
              </div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {user && (
        <div className="space-y-2">
          <label className="text-xs text-slate-500 block mb-1">Kendala <span className="text-red-400">*</span></label>
          <textarea
            value={progress.kendala}
            onChange={e => setProgress(current => ({ ...current, kendala: e.target.value }))}
            placeholder="Kendala"
            rows={2}
            className="w-full text-sm text-white outline-none resize-none rounded-lg px-3 py-2"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          />
          <label className="text-xs text-slate-500 block mb-1">Next Action <span className="text-red-400">*</span></label>
          <textarea
            value={progress.nextAction}
            onChange={e => setProgress(current => ({ ...current, nextAction: e.target.value }))}
            placeholder="Next Action"
            rows={2}
            className="w-full text-sm text-white outline-none resize-none rounded-lg px-3 py-2"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          />
          <div className="flex gap-2 items-end">
            <label className="flex-1 text-xs text-slate-500">Target Closing <span className="text-red-400">*</span>
              <input type="date" value={progress.targetClosing}
                onChange={e => setProgress(current => ({ ...current, targetClosing: e.target.value }))}
                className="w-full mt-1 text-sm text-white outline-none rounded-lg px-3 py-2"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", colorScheme: "dark" }} />
            </label>
          <button
            onClick={handleSend}
            disabled={!progress.kendala.trim() || !progress.nextAction.trim() || !progress.targetClosing || sending}
            title="Simpan Progress"
            style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: "8px", border: "none",
              background: !progress.kendala.trim() || !progress.nextAction.trim() || !progress.targetClosing || sending ? "var(--surface3, #2a2a2a)" : "var(--accent)",
              color: !progress.kendala.trim() || !progress.nextAction.trim() || !progress.targetClosing || sending ? "#666" : "#fff",
              cursor: !progress.kendala.trim() || !progress.nextAction.trim() || !progress.targetClosing || sending ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Send size={14} />
          </button>
          </div>
        </div>
      )}
    </div>
  )
}

const emptyForm = {
  sales_hunter:      "",
  sales_person:      "",
  agent_name:        "",
  name:              "",
  project:           "",
  unit:              "",
  potensi_closing:   "",
  sumber_leads:      "",
  cara_bayar:        "",
  visit_date:        "",
  sudah_booking_fee: "false",
  status:            "warm",
  notes:             "",
}

export default function PipelinePage() {
  const { user, isAdmin } = useAuth()
  const isTf = user?.role === "task_force"
  const [rows, setRows] = useState<KonsumenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showClosingModal, setShowClosingModal] = useState(false)
  const [editing, setEditing] = useState<KonsumenRow | null>(null)
  const [closingTarget, setClosingTarget] = useState<KonsumenRow | null>(null)
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [filterHunter, setFilterHunter] = useState("")
  const [filterProject, setFilterProject] = useState("")
  const [filterCaraBayar, setFilterCaraBayar] = useState("")
  const [filterStatus, setFilterStatus] = useState<PipelineStatusFilter>("all")
  const [saving, setSaving] = useState(false)
  const [savingClosing, setSavingClosing] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [activeSps, setActiveSps] = useState<Record<string, string[]>>({})
  const [dbProjects, setDbProjects] = useState<string[]>([])
  const [latestNotes, setLatestNotes] = useState<Record<string, string>>({})
  const [latestProgress, setLatestProgress] = useState<Record<string, PipelineProgressExport>>({})
  const [dbCaraBayar, setDbCaraBayar] = useState<string[]>([])
  const [closingForm, setClosingForm] = useState({
    unit:         "",
    nilai_hjr:    "",
    cara_bayar:   "",
    closing_date: new Date().toISOString().slice(0, 10),
  })
  const [sortCol, setSortCol] = useState("")
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc")
  const [formError, setFormError] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<KonsumenRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openNew = useCallback(() => {
    setEditing(null)
    setForm({ ...emptyForm, sales_hunter: (isAdmin || isTf) ? "" : (user?.name || "") })
    setFormError("")
    setShowModal(true)
  }, [isAdmin, isTf, user?.name])

  // Auto-open add modal when navigated with ?add=1 (from FAB bottom nav)
  // Also listen for custom event when already on pipeline page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("add") === "1" && user && !loading) {
        queueMicrotask(openNew)
        // Clean the URL without reload
        window.history.replaceState({}, "", "/pipeline")
      }
    }
  }, [user, loading, openNew])

  useEffect(() => {
    const handler = () => openNew()
    window.addEventListener("pipeline:openNew", handler)
    return () => window.removeEventListener("pipeline:openNew", handler)
  }, [openNew])

  const fetchData = useCallback(async () => {
    const [{ data }, spsRes, projRes, cbRes] = await Promise.all([
      supabase.from("konsumen").select("*").in("status", ["warm", "hot", "tidak_potensial"]).or("board.eq.pipeline,board.is.null").order("created_at", { ascending: false }),
      supabase.from("users").select("name,hunter_name").in("role", ["sales_person", "telemarketing"]).neq("status", "resigned"),
      supabase.from("konsumen").select("project").not("project", "is", null),
      supabase.from("konsumen").select("cara_bayar").not("cara_bayar", "is", null),
    ])
    const uniqueProjects = Array.from(
      new Set((projRes.data || []).map((r: { project: string | null }) => r.project).filter(Boolean) as string[])
    ).sort()
    setDbProjects(uniqueProjects)

    // Canonical cara bayar — filter out KPR Bank (replaced by KPR Indent)
    const dbCb = (cbRes.data || []).map((r: { cara_bayar: string | null }) => r.cara_bayar).filter(Boolean) as string[]
    const extraCb = dbCb.filter(v => v !== "KPR Bank" && !(CANONICAL_CARA_BAYAR as readonly string[]).includes(v))
    setDbCaraBayar([...CANONICAL_CARA_BAYAR, ...Array.from(new Set(extraCb)).sort()])

    const all = (data || []) as KonsumenRow[]
    if (isAdmin || isTf) {
      setRows(all)
    } else {
      const name = (user!.name || "").toLowerCase()
      setRows(all.filter(r => r.user_id === user!.id || (r.sales_hunter || "").toLowerCase() === name))
    }
    const spsMap: Record<string, string[]> = {}
    for (const sp of (spsRes.data || [])) {
      if (!sp.hunter_name) continue
      if (!spsMap[sp.hunter_name]) spsMap[sp.hunter_name] = []
      spsMap[sp.hunter_name].push(sp.name)
    }
    setActiveSps(spsMap)

    // Fetch latest pipeline_note for each konsumen — chunked to avoid URL-length
    // limits when the pipeline has many rows (a single huge .in() fails silently)
    const ids = (data || []).map((r: { id: string }) => r.id)
    if (ids.length > 0) {
      const CHUNK_SIZE = 50
      const chunks: string[][] = []
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        chunks.push(ids.slice(i, i + CHUNK_SIZE))
      }
      const results = await Promise.all(chunks.map(chunk =>
        supabase
          .from("pipeline_notes")
          .select("konsumen_id, content, kendala, next_action, target_closing, created_at")
          .in("konsumen_id", chunk)
          .order("created_at", { ascending: false })
      ))
      const noteMap: Record<string, string> = {}
      const progressMap: Record<string, PipelineProgressExport> = {}
      for (const { data: pnData, error } of results) {
        if (error) continue
        for (const pn of (pnData || []) as { konsumen_id: string; content: string; kendala: string | null; next_action: string | null; target_closing: string | null }[]) {
          if (!noteMap[pn.konsumen_id]) {
            noteMap[pn.konsumen_id] = pn.content
            if (pn.kendala || pn.next_action || pn.target_closing) {
              progressMap[pn.konsumen_id] = {
                kendala: pn.kendala || "",
                nextAction: pn.next_action || "",
                targetClosing: pn.target_closing || "",
              }
            }
          }
        }
      }
      setLatestNotes(noteMap)
      setLatestProgress(progressMap)
    }

    setLoading(false)
  }, [isAdmin, isTf, user])

  useEffect(() => { if (user) queueMicrotask(() => void fetchData()) }, [fetchData, user])

  function openEdit(r: KonsumenRow) {
    setEditing(r)
    setForm({
      sales_hunter:      r.sales_hunter || "",
      sales_person:      r.sales_person || "",
      agent_name:        r.agent_name || "",
      name:              r.name || "",
      project:           r.project || "",
      unit:              r.unit || "",
      potensi_closing:   r.potensi_closing?.toString() || "",
      sumber_leads:      r.sumber_leads || "",
      cara_bayar:        r.cara_bayar || "",
      visit_date:        r.visit_date || "",
      sudah_booking_fee: String(r.sudah_booking_fee ?? false),
      status:            r.status || "warm",
      notes:             r.notes || "",
    })
    setFormError("")
    setShowModal(true)
  }

  function openClosingConfirm(r: KonsumenRow) {
    setClosingTarget(r)
    setClosingForm({
      unit:         r.unit || "",
      nilai_hjr:    r.potensi_closing?.toString() || "",
      cara_bayar:   r.cara_bayar || "",
      closing_date: new Date().toISOString().slice(0, 10),
    })
    setShowClosingModal(true)
  }

  async function handleClosingConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!closingTarget || !closingForm.nilai_hjr || Number(closingForm.nilai_hjr) <= 0) return
    setSavingClosing(true)
    const d = new Date(closingForm.closing_date)
    await supabase.from("konsumen").update({
      status:        "closing",
      unit:          closingForm.unit || null,
      nilai_hjr:     Number(closingForm.nilai_hjr),
      cara_bayar:    closingForm.cara_bayar || null,
      closing_date:  closingForm.closing_date,
      closing_month: d.getMonth() + 1,
      closing_year:  d.getFullYear(),
    }).eq("id", closingTarget.id)
    setSavingClosing(false)
    setShowClosingModal(false)
    setClosingTarget(null)
    fetchData()
  }

  function handleSalesPersonChange(nextSalesPerson: string) {
    setForm((current) => ({
      ...current,
      sales_person: nextSalesPerson,
      agent_name: nextSalesPerson === "Agent" ? current.agent_name : "",
    }))
  }

  function validateForm(): boolean {
    if (form.sales_person === "Agent" && !form.agent_name.trim()) {
      setFormError("Nama Agent wajib diisi")
      return false
    }
    const checks: [string, string][] = [
      [(isAdmin || isTf) ? form.sales_hunter : "ok", "Hunter"],
      [form.sales_person, "Sales Person"],
      [form.name, "Nama Konsumen"],
      [form.project, "Proyek"],
      [form.unit, "Klaster / Unit"],
      [form.potensi_closing, "Potensi Closing"],
      [form.sumber_leads, "Sumber Leads"],
      [form.cara_bayar, "Cara Bayar"],
      [form.visit_date, "Tanggal Visit"],
    ]
    const missing = checks.filter(([v]) => !v?.trim()).map(([, label]) => label)
    if (missing.length > 0) {
      setFormError(`Wajib diisi: ${missing.join(", ")}`)
      return false
    }
    setFormError("")
    return true
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm()) return
    setSaving(true)
    const payload = {
      name:              form.name,
      sales_hunter:      (isAdmin || isTf) ? form.sales_hunter : user!.name,
      sales_person:      form.sales_person || null,
      agent_name:        form.sales_person === "Agent" ? form.agent_name.trim() : null,
      project:           form.project || null,
      unit:              form.unit || null,
      potensi_closing:   form.potensi_closing ? Number(form.potensi_closing) : null,
      sumber_leads:      form.sumber_leads || null,
      cara_bayar:        form.cara_bayar || null,
      visit_date:        form.visit_date || null,
      sudah_visit:       !!form.visit_date,
      sudah_booking_fee: form.sudah_booking_fee === "true",
      status:            form.status,
      notes:             form.notes || null,
      user_id:           user!.id,
      board:             "pipeline",
    }
    if (editing) {
      await supabase.from("konsumen").update(payload).eq("id", editing.id)
    } else {
      await supabase.from("konsumen").insert(payload)
    }
    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  function canDelete(r: KonsumenRow): boolean {
    if (isAdmin || isTf) return true
    return r.user_id === user?.id || (r.sales_hunter || "").toLowerCase() === (user?.name || "").toLowerCase()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await supabase.from("konsumen").delete().eq("id", deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    fetchData()
  }

  const filtered = rows.filter(r => {
    const query = search.trim().toLowerCase()
    const matchSearch = !query || [
      r.name,
      r.sales_hunter,
      r.sales_person,
      r.agent_name,
      r.project,
      r.unit,
      latestNotes[r.id],
      r.notes,
    ].some(value => (value || "").toLowerCase().includes(query))
    return matchSearch
      && (!filterHunter || r.sales_hunter === filterHunter)
      && (!filterProject || r.project === filterProject)
      && (!filterCaraBayar || r.cara_bayar === filterCaraBayar)
      && matchesPipelineStatus(r.status, filterStatus)
  })

  function toggleSort(col: string) {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortCol(col)
      setSortDir("asc")
    }
  }

  const displayed = [...filtered].sort((a, b) => {
    // Tidak potensial always last
    const aTp = a.status === "tidak_potensial" ? 1 : 0
    const bTp = b.status === "tidak_potensial" ? 1 : 0
    if (aTp !== bTp) return aTp - bTp

    if (!sortCol) return 0
    let av: string | number = "", bv: string | number = ""
    if      (sortCol === "hunter")   { av = a.sales_hunter || ""; bv = b.sales_hunter || "" }
    else if (sortCol === "konsumen") { av = a.name || ""; bv = b.name || "" }
    else if (sortCol === "project")  { av = a.project || ""; bv = b.project || "" }
    else if (sortCol === "status")   { av = a.status || ""; bv = b.status || "" }
    else if (sortCol === "nilai")    { av = Number(a.potensi_closing) || 0; bv = Number(b.potensi_closing) || 0 }
    else if (sortCol === "visit")    { av = a.visit_date || ""; bv = b.visit_date || "" }
    if (typeof av === "number") return sortDir === "asc" ? av - (bv as number) : (bv as number) - av
    return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
  })

  const activeDisplayed = displayed.filter(row => row.status !== "tidak_potensial")
  const inactiveRows = displayed.filter(row => row.status === "tidak_potensial")
  const visibleRows = showInactive ? [...activeDisplayed, ...inactiveRows] : activeDisplayed

  const activeRows = rows.filter(r => r.status !== "tidak_potensial")
  const stats = {
    total:      activeRows.length,
    hot:        activeRows.filter(r => r.status === "hot").length,
    totalValue: activeRows.reduce((s, r) => s + (Number(r.potensi_closing) || 0), 0),
  }
  const hunterFilterOptions = Array.from(new Set(rows.map(row => row.sales_hunter).filter(Boolean))).sort()
  const projectFilterOptions = Array.from(new Set(rows.map(row => row.project).filter((value): value is string => Boolean(value)))).sort()

  function handleExportActive() {
    const text = formatPipelineExport(filtered.map(row => ({
      id: row.id,
      salesPerson: formatSalesPerson(row.sales_person, row.agent_name),
      prospect: row.name,
      visited: row.sudah_visit,
      project: row.project,
      unit: row.unit,
      status: row.status,
    })), latestProgress)
    if (!text) {
      alert("Tidak ada pipeline aktif pada filter saat ini.")
      return
    }
    const url = URL.createObjectURL(new Blob([`\uFEFF${text}`], { type: "text/plain;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `Pipeline Aktif - ${new Date().toISOString().slice(0, 10)}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const hunterKey = (isAdmin || isTf) ? form.sales_hunter : (user?.name || "")
  const spBase = activeSps[hunterKey] || []
  const hunterGroup = HUNTER_GROUPS.find(g => g.dbName === hunterKey || g.name === hunterKey)
  const spOptions = buildSpOptions(hunterGroup, spBase)

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Pipeline</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {stats.total} prospek · {stats.hot} hot · {formatRupiah(stats.totalValue)}
            </p>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
            <Plus size={14} /> Tambah Pipeline
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Prospek", val: stats.total,                   color: "text-blue-400" },
            { label: "Hot",           val: stats.hot,                      color: "text-orange-400" },
            { label: "Est. Nilai",    val: formatRupiah(stats.totalValue), color: "text-green-400" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs text-slate-500 mb-1">{s.label}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1">
            <SalesFilterBar
              search={search}
              onSearchChange={setSearch}
              hunter={filterHunter}
              onHunterChange={setFilterHunter}
              hunterOptions={hunterFilterOptions.map(hunter => ({ value: hunter, label: hunter }))}
              project={filterProject}
              onProjectChange={setFilterProject}
              projectOptions={projectFilterOptions.map(project => ({ value: project, label: project }))}
              caraBayar={filterCaraBayar}
              onCaraBayarChange={setFilterCaraBayar}
              caraBayarOptions={dbCaraBayar.map(option => ({ value: option, label: option }))}
              status={filterStatus}
              onStatusChange={(value) => setFilterStatus(value as PipelineStatusFilter)}
              statusOptions={PIPELINE_STATUS_OPTIONS}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{filtered.length} hasil</span>
            <button type="button" onClick={handleExportActive}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-blue-300 hover:text-white transition"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <FileDown size={14} /> Export Aktif (.txt)
            </button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  {([
                    { key: "hunter",   label: "Hunter / Sales", align: "left",  sortable: true,  colClass: ""                   },
                    { key: "konsumen", label: "Konsumen",      align: "left",   sortable: true,  colClass: ""                   },
                    { key: "project",  label: "Project / Unit", align: "left",  sortable: true,  colClass: ""                   },
                    { key: "status",   label: "Status",        align: "center", sortable: true,  colClass: ""                   },
                    { key: "nilai",    label: "Nilai Potensi", align: "right",  sortable: true,  colClass: ""                   },
                    { key: "cara",     label: "Cara Bayar",    align: "center", sortable: false, colClass: ""                   },
                    { key: "visit",    label: "Visit",         align: "center", sortable: false, colClass: ""                   },
                    { key: "bf",       label: "BF",            align: "center", sortable: false, colClass: ""                   },
                    { key: "catatan",  label: "Catatan",       align: "left",   sortable: false, colClass: "hidden md:table-cell" },
                    { key: "aksi",     label: "",              align: "center", sortable: false, colClass: ""                   },
                  ] as { key: string; label: string; align: string; sortable: boolean; colClass: string }[]).map(col => (
                    <th key={col.key}
                      className={`px-3 py-3 text-xs font-medium whitespace-nowrap ${col.sortable ? "cursor-pointer select-none hover:opacity-80" : ""} ${col.colClass}`}
                      style={{ color: sortCol === col.key ? "var(--text-primary)" : "var(--text-muted)", textAlign: col.align as React.CSSProperties["textAlign"] }}
                      onClick={col.sortable ? () => toggleSort(col.key) : undefined}>
                      <span className={`inline-flex items-center ${col.align === "right" ? "justify-end w-full" : col.align === "center" ? "justify-center w-full" : ""}`}>
                        {col.label}
                        {col.sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat...</td></tr>
                ) : visibleRows.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-600 text-xs">Tidak ada data</td></tr>
                ) : visibleRows.map(r => {
                  const isTidakPotensial = r.status === "tidak_potensial"
                  const badge = statusBadge(r.status)
                  return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}
                    className={`hover:bg-white/[0.02] ${isTidakPotensial ? "opacity-50" : ""}`}>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div className="text-slate-300">{r.sales_hunter || "—"}</div>
                      <div className="text-slate-500 mt-0.5">{formatSalesPerson(r.sales_person, r.agent_name)}</div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="font-medium text-white">{r.name || "—"}</div>
                      {(latestNotes[r.id] || r.notes) && (
                        <div className="text-slate-500 mt-1 whitespace-pre-wrap md:hidden" style={{ fontSize: "10px", lineHeight: "1.4" }}>
                          {latestNotes[r.id] || r.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div className="text-slate-300">{r.project || "—"}</div>
                      <div className="text-slate-500 mt-0.5">{r.unit || "—"}</div>
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-300 text-xs whitespace-nowrap">
                      {!isTidakPotensial && r.potensi_closing ? formatRupiah(Number(r.potensi_closing)) : "—"}
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-slate-400 whitespace-nowrap">
                      {r.cara_bayar || "—"}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <YNBadge value={r.sudah_visit} />
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <YNBadge value={r.sudah_booking_fee} />
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400 min-w-[220px] whitespace-pre-wrap hidden md:table-cell">
                      {latestNotes[r.id] || r.notes || "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={() => openEdit(r)}
                          className="text-blue-400 hover:text-blue-300 transition" title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => openClosingConfirm(r)}
                          className="text-green-400 hover:text-green-300 transition" title="Closing">
                          <CheckCircle2 size={13} />
                        </button>
                        {canDelete(r) && (
                          <button onClick={() => setDeleteTarget(r)}
                            className="text-red-500 hover:text-red-400 transition" title="Hapus">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
              {!loading && visibleRows.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border-medium)", background: "var(--surface2)" }}>
                    <td colSpan={4} className="px-3 py-3 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {filtered.filter(r => r.status !== "tidak_potensial").length} prospek aktif
                      {filtered.filter(r => r.status === "tidak_potensial").length > 0 &&
                        <span className="text-slate-600 ml-1">
                          · {filtered.filter(r => r.status === "tidak_potensial").length} tdk potensial
                        </span>
                      }
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-bold whitespace-nowrap" style={{ color: "var(--accent)" }}>
                      {formatRupiah(filtered.filter(r => r.status !== "tidak_potensial").reduce((s, r) => s + (Number(r.potensi_closing) || 0), 0))}
                    </td>
                    <td colSpan={5} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        {inactiveRows.length > 0 && (
          <button
            type="button"
            onClick={() => setShowInactive(open => !open)}
            aria-expanded={showInactive}
            aria-label="Tampilkan Tidak Potensial"
            className="w-full rounded-xl px-4 py-3 flex items-center justify-between text-sm transition"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <span>{showInactive ? "Sembunyikan" : "Tampilkan"} Tidak Potensial ({inactiveRows.length})</span>
            <ChevronDown size={15} style={{ transform: showInactive ? "rotate(180deg)" : undefined, transition: "transform .2s" }} />
          </button>
        )}
      </div>

      {/* Closing Confirmation Modal */}
      {showClosingModal && closingTarget && (
        <Modal onClose={() => setShowClosingModal(false)}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-semibold">Closing!</span>
              <h3 className="text-sm font-semibold text-white">Konfirmasi Closing</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              <span className="text-white font-medium">{closingTarget.name}</span>
              {closingTarget.project ? ` · ${closingTarget.project}` : ""}
            </p>
            <form onSubmit={handleClosingConfirm} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Klaster / Unit</label>
                <input type="text" value={closingForm.unit}
                  onChange={e => setClosingForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="Contoh: Kavling 8A, Type 45"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Nilai HJR (Rp) <span className="text-red-400">*</span></label>
                <RupiahInput
                  value={closingForm.nilai_hjr}
                  onChange={raw => setClosingForm(f => ({ ...f, nilai_hjr: raw }))}
                  placeholder="Contoh: 500.000.000"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Cara Bayar</label>
                <select value={closingForm.cara_bayar}
                  onChange={e => setClosingForm(f => ({ ...f, cara_bayar: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <option value="">— Pilih —</option>
                  {dbCaraBayar.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ overflow: "hidden" }}>
                <label className="text-xs text-slate-500 block mb-1">Tanggal Closing <span className="text-red-400">*</span></label>
                <input type="date" value={closingForm.closing_date} required
                  onChange={e => setClosingForm(f => ({ ...f, closing_date: e.target.value }))}
                  className="w-full min-w-0 text-sm px-3 py-2 rounded-lg text-white outline-none appearance-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)", colorScheme: "dark", boxSizing: "border-box", WebkitAppearance: "none", display: "block" }} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowClosingModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>Batal</button>
                <button type="submit" disabled={savingClosing}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition"
                  style={{ background: "#E84500" }}>
                  {savingClosing ? "Menyimpan..." : "Konfirmasi Closing"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              {editing ? "Edit Pipeline" : "Tambah Pipeline"}
            </h3>
            <form onSubmit={handleSave} noValidate className="space-y-3">
              {formError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs font-medium"
                  style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}>
                  <span className="mt-0.5 shrink-0">⚠</span>
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Hunter <span className="text-red-400">*</span></label>
                {(isAdmin || isTf) ? (
                  <select value={form.sales_hunter} required
                    onChange={e => setForm(f => ({ ...f, sales_hunter: e.target.value, sales_person: "", agent_name: "" }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Pilih Hunter —</option>
                    {HUNTER_GROUPS.map(g => <option key={g.dbName} value={g.dbName}>{g.name}</option>)}
                  </select>
                ) : (
                  <div className="w-full text-sm px-3 py-2 rounded-lg text-slate-400"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    {user?.name || "—"}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Sales Person <span className="text-red-400">*</span></label>
                {spOptions.length > 0 ? (
                  <select value={form.sales_person} required
                    onChange={e => handleSalesPersonChange(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Pilih SP —</option>
                    {spOptions.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                  </select>
                ) : (
                  <input type="text" value={form.sales_person} required
                    onChange={e => handleSalesPersonChange(e.target.value)}
                    placeholder="Nama sales person"
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                )}
              </div>
              {form.sales_person === "Agent" && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Nama Agent <span className="text-red-400">*</span></label>
                  <input
                    required
                    value={form.agent_name}
                    onChange={(event) => setForm((current) => ({ ...current, agent_name: event.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Nama Konsumen <span className="text-red-400">*</span></label>
                <input type="text" value={form.name} required
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Proyek <span className="text-red-400">*</span></label>
                  <select value={form.project}
                    onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Pilih —</option>
                    {dbProjects.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Klaster / Unit <span className="text-red-400">*</span></label>
                  <input type="text" value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="Type 45, Kav 8A"
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Potensi Closing (Rp) <span className="text-red-400">*</span></label>
                <RupiahInput
                  value={form.potensi_closing}
                  onChange={raw => setForm(f => ({ ...f, potensi_closing: raw }))}
                  placeholder="Contoh: 500.000.000"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Sumber Leads <span className="text-red-400">*</span></label>
                <input type="text" value={form.sumber_leads} required
                  onChange={e => setForm(f => ({ ...f, sumber_leads: e.target.value }))}
                  placeholder="Contoh: Referral, Digital, Walk-in"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Cara Bayar <span className="text-red-400">*</span></label>
                  <select value={form.cara_bayar}
                    onChange={e => setForm(f => ({ ...f, cara_bayar: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Pilih —</option>
                    {dbCaraBayar.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ overflow: "hidden", minWidth: 0 }}>
                  <label className="text-xs text-slate-500 block mb-1">Tanggal Visit <span className="text-red-400">*</span></label>
                  <input type="date" value={form.visit_date}
                    onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
                    className="w-full min-w-0 text-sm px-3 py-2 rounded-lg text-white outline-none appearance-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", colorScheme: "dark", boxSizing: "border-box", WebkitAppearance: "none", display: "block" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Sudah Booking Fee? <span className="text-red-400">*</span></label>
                  <select value={form.sudah_booking_fee}
                    onChange={e => setForm(f => ({ ...f, sudah_booking_fee: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="false">Belum (N)</option>
                    <option value="true">Sudah (Y)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Status <span className="text-red-400">*</span></label>
                  <select value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>Batal</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
              {editing && (
                <div>
                  <PipelineNotes
                    konsumenId={editing.id}
                    user={user ? { id: user.id, name: user.name } : null}
                    legacyNote={editing.notes || ""}
                    onSaved={progress => {
                      setLatestProgress(current => ({ ...current, [editing.id]: progress }))
                      setLatestNotes(current => ({
                        ...current,
                        [editing.id]: `Kendala: ${progress.kendala}\nNext Action: ${progress.nextAction}\nTarget Closing: ${progress.targetClosing}`,
                      }))
                    }}
                  />
                </div>
              )}
            </form>
          </div>
        </Modal>
      )}
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="w-full max-w-sm rounded-xl p-5"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(239,68,68,0.15)" }}>
                <Trash2 size={15} className="text-red-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Hapus Data Pipeline?</h3>
            </div>
            <p className="text-xs text-slate-400 mb-1">
              Data berikut akan dihapus permanen:
            </p>
            <div className="rounded-lg px-3 py-2 mb-4 text-xs"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <span className="text-white font-medium">{deleteTarget.name}</span>
              {deleteTarget.project && <span className="text-slate-500"> · {deleteTarget.project}</span>}
              {deleteTarget.sales_hunter && <span className="text-slate-500"> · {deleteTarget.sales_hunter}</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                Batal
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition">
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
