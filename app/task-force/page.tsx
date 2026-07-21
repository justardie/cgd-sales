"use client"
import React, { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, CANONICAL_CARA_BAYAR, fmtDDMMYYYY } from "@/lib/utils"
import { HUNTER_GROUPS, buildSpOptions } from "@/lib/hunters"
import { Plus, X, Search, FileText, Pencil, MessageSquare, Send, Trash2 } from "lucide-react"

interface KonsumenRow {
  id: string
  user_id?: string
  sales_hunter: string
  sales_person: string | null
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

interface TFNote {
  id: string
  lead_id: string
  content: string
  author_name: string
  created_at: string
}

const STATUSES = [
  { value: "warm",            label: "Warm",          color: "bg-yellow-500/20 text-yellow-400" },
  { value: "hot",             label: "Hot",           color: "bg-orange-500/20 text-orange-400" },
  { value: "tidak_potensial", label: "Tdk Potensial", color: "bg-slate-500/20 text-slate-400"   },
]

const FILTER_OPTIONS = [
  { value: "all",             label: "Semua" },
  { value: "aktif",           label: "Aktif" },
  { value: "warm",            label: "Warm" },
  { value: "hot",             label: "Hot" },
  { value: "tidak_potensial", label: "Tdk Potensial" },
]

const statusBadge = (s: string) =>
  STATUSES.find(x => x.value === s) || { label: s || "—", color: "bg-slate-500/20 text-slate-400" }

function fmtRp(raw: string): string {
  if (!raw) return ""
  const n = Number(raw.replace(/\D/g, ""))
  return isNaN(n) ? "" : n.toLocaleString("id-ID")
}
function parseRp(val: string): string { return val.replace(/\D/g, "") }

function RupiahInput({ value, onChange, placeholder, required, className, style }: {
  value: string; onChange: (raw: string) => void
  placeholder?: string; required?: boolean
  className?: string; style?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input type="text" inputMode="numeric"
      value={focused ? value : fmtRp(value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onChange={e => onChange(parseRp(e.target.value))}
      placeholder={placeholder} required={required} className={className} style={style} />
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

/** Format note timestamp as DD-MM-YYYY */
function fmtNoteTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`
}

function NotesModal({ lead, user, onClose }: {
  lead: KonsumenRow
  user: { id: string; name: string } | null
  onClose: () => void
}) {
  const { showToast } = useToast()
  const [notes, setNotes]       = useState<TFNote[]>([])
  const [loading, setLoading]   = useState(true)
  const [text, setText]         = useState("")
  const [sending, setSending]   = useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  const loadNotes = useCallback(async () => {
    const { data } = await supabase
      .from("task_force_notes")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: true })
    setNotes((data || []) as TFNote[])
    setLoading(false)
  }, [lead.id])

  useEffect(() => { queueMicrotask(() => void loadNotes()) }, [loadNotes])

  // Scroll to bottom when notes load/change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [notes])

  async function handleSend() {
    if (!text.trim() || !user) {
      showToast("Catatan tidak boleh kosong", "error")
      return
    }
    setSending(true)
    const { error } = await supabase.from("task_force_notes").insert({
      lead_id:     lead.id,
      content:     text.trim(),
      author_name: user.name,
    })
    setSending(false)
    if (error) {
      showToast(`Gagal menyimpan catatan: ${error.message}`, "error")
      return
    }
    setText("")
    loadNotes()
    showToast("Catatan berhasil disimpan", "success")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl+Enter / Cmd+Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      handleSend()
    }
  }

  const badge = (lead.status === "hot") ? "bg-orange-500/20 text-orange-400"
    : (lead.status === "warm") ? "bg-yellow-500/20 text-yellow-400"
    : "bg-slate-500/20 text-slate-400"
  const statusLabel = lead.status === "hot" ? "Hot" : lead.status === "warm" ? "Warm" : "Tdk Potensial"

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full sm:max-w-lg flex flex-col rounded-t-2xl sm:rounded-xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "92dvh" }}>

        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white truncate">{lead.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${badge}`}>{statusLabel}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {[lead.project, lead.sales_hunter].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white shrink-0 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* Notes timeline — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {loading ? (
            <p className="text-xs text-slate-600 text-center py-6">Memuat...</p>
          ) : notes.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare size={28} className="mx-auto text-slate-700 mb-2" />
              <p className="text-xs text-slate-600">Belum ada catatan</p>
              <p className="text-xs text-slate-700 mt-1">Tambahkan action plan pertama di bawah</p>
            </div>
          ) : notes.map(n => (
            <div key={n.id} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-blue-400">{n.author_name}</span>
                <span className="text-xs text-slate-600">{fmtNoteTime(n.created_at)}</span>
              </div>
              <div className="rounded-lg rounded-tl-sm px-3 py-2 text-sm text-white whitespace-pre-wrap leading-relaxed"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                {n.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input area — sticky at bottom */}
        <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tulis catatan / action plan..."
              rows={2}
              className="flex-1 text-sm px-3 py-2 rounded-xl text-white outline-none resize-none leading-relaxed"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sending}
              className="shrink-0 p-2.5 rounded-xl text-white transition disabled:opacity-40 bg-blue-600 hover:bg-blue-500 active:scale-95"
              title="Kirim (Ctrl+Enter)">
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-slate-700 mt-1.5 text-right">Ctrl+Enter untuk kirim</p>
        </div>
      </div>
    </div>
  )
}

const emptyForm = {
  sales_hunter: "", sales_person: "", name: "", project: "", unit: "",
  potensi_closing: "", sumber_leads: "", cara_bayar: "", visit_date: "",
  sudah_booking_fee: "false", status: "warm", notes: "",
}

export default function TaskForcePage() {
  const { user, isAdmin } = useAuth()
  const { showToast } = useToast()
  const role = user?.role ?? ""
  const canSeeAll = isAdmin || role === "task_force"

  const [rows, setRows] = useState<KonsumenRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<KonsumenRow | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [activeSps, setActiveSps] = useState<Record<string, string[]>>({})
  const [dbProjects, setDbProjects] = useState<string[]>([])
  const [dbCaraBayar, setDbCaraBayar] = useState<string[]>([])
  const [sortCol, setSortCol] = useState("")
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc")
  const [formError, setFormError] = useState("")
  const [notesLead, setNotesLead] = useState<KonsumenRow | null>(null)
  const [notesCounts, setNotesCounts] = useState<Record<string, number>>({})
  const [deleteTarget, setDeleteTarget] = useState<KonsumenRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) return
    const [{ data }, spsRes, projRes, cbRes, notesCountRes] = await Promise.all([
      supabase.from("task_force_leads").select("*")
        .in("status", ["warm", "hot", "tidak_potensial"]).order("created_at", { ascending: false }),
      supabase.from("users").select("name,hunter_name").in("role", ["sales_person", "telemarketing"]).neq("status", "resigned"),
      supabase.from("task_force_leads").select("project").not("project", "is", null),
      supabase.from("task_force_leads").select("cara_bayar").not("cara_bayar", "is", null),
      supabase.from("task_force_notes").select("lead_id"),
    ])
    const uniqueProjects = Array.from(
      new Set((projRes.data || []).map((r: { project: string | null }) => r.project).filter(Boolean) as string[])
    ).sort()
    setDbProjects(uniqueProjects)
    const dbCb = (cbRes.data || []).map((r: { cara_bayar: string | null }) => r.cara_bayar).filter(Boolean) as string[]
    const extraCb = dbCb.filter(v => v !== "KPR Bank" && !(CANONICAL_CARA_BAYAR as readonly string[]).includes(v))
    setDbCaraBayar([...CANONICAL_CARA_BAYAR, ...Array.from(new Set(extraCb)).sort()])
    const all = (data || []) as KonsumenRow[]
    if (canSeeAll) {
      setRows(all)
    } else {
      const name = (user.name || "").toLowerCase()
      setRows(all.filter(r => r.user_id === user.id || (r.sales_hunter || "").toLowerCase() === name))
    }
    const spsMap: Record<string, string[]> = {}
    for (const sp of (spsRes.data || [])) {
      if (!sp.hunter_name) continue
      if (!spsMap[sp.hunter_name]) spsMap[sp.hunter_name] = []
      spsMap[sp.hunter_name].push(sp.name)
    }
    setActiveSps(spsMap)
    // Build notes count map: lead_id → count
    const countsMap: Record<string, number> = {}
    for (const n of (notesCountRes.data || []) as { lead_id: string }[]) {
      countsMap[n.lead_id] = (countsMap[n.lead_id] || 0) + 1
    }
    setNotesCounts(countsMap)
    setLoading(false)
  }, [canSeeAll, user])

  useEffect(() => { queueMicrotask(() => void fetchData()) }, [fetchData])

  function openNew() {
    setEditing(null)
    setForm({ ...emptyForm, sales_hunter: canSeeAll ? "" : (user?.name || "") })
    setFormError("")
    setShowModal(true)
  }

  function openEdit(r: KonsumenRow) {
    setEditing(r)
    setForm({
      sales_hunter: r.sales_hunter || "", sales_person: r.sales_person || "",
      name: r.name || "", project: r.project || "", unit: r.unit || "",
      potensi_closing: r.potensi_closing?.toString() || "",
      sumber_leads: r.sumber_leads || "", cara_bayar: r.cara_bayar || "",
      visit_date: r.visit_date || "",
      sudah_booking_fee: String(r.sudah_booking_fee ?? false),
      status: r.status || "warm", notes: r.notes || "",
    })
    setFormError("")
    setShowModal(true)
  }

  function validateForm(): string {
    const hunterCheck = canSeeAll ? form.sales_hunter : "ok"
    const checks: [string, string][] = [
      [hunterCheck, "Hunter"], [form.name, "Nama Leads"],
      [form.project, "Proyek"], [form.sumber_leads, "Sumber Leads"],
    ]
    const missing = checks.filter(([v]) => !v?.trim()).map(([, label]) => label)
    if (missing.length > 0) return "Wajib diisi: " + missing.join(", ")
    return ""
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const error = validateForm()
    setFormError(error)
    if (error) {
      showToast(error, "error")
      return
    }
    setSaving(true)
    const payload = {
      name: form.name,
      sales_hunter: canSeeAll ? form.sales_hunter : user!.name,
      sales_person: form.sales_person || null,
      project: form.project || null, unit: form.unit || null,
      potensi_closing: form.potensi_closing ? Number(form.potensi_closing) : null,
      sumber_leads: form.sumber_leads || null, cara_bayar: form.cara_bayar || null,
      visit_date: form.visit_date || null, sudah_visit: !!form.visit_date,
      sudah_booking_fee: form.sudah_booking_fee === "true",
      status: form.status, notes: form.notes || null,
      user_id: user!.id,
    }
    const { error: saveError } = editing
      ? await supabase.from("task_force_leads").update(payload).eq("id", editing.id)
      : await supabase.from("task_force_leads").insert(payload)
    setSaving(false)
    if (saveError) {
      showToast(`Gagal menyimpan data: ${saveError.message}`, "error")
      return
    }
    setShowModal(false)
    fetchData()
    showToast(editing ? "Data berhasil diperbarui" : "Data berhasil ditambahkan", "success")
  }

  const filtered = rows.filter(r => {
    const matchSearch = !search ||
      (r.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.project || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.sales_hunter || "").toLowerCase().includes(search.toLowerCase())
    const matchStatus =
      filterStatus === "all" ? true :
      filterStatus === "aktif" ? r.status !== "tidak_potensial" :
      r.status === filterStatus
    return matchSearch && matchStatus
  })

  function toggleSort(col: string) {
    if (sortCol === col) { setSortDir(d => d === "asc" ? "desc" : "asc") }
    else { setSortCol(col); setSortDir("asc") }
  }

  const displayed = [...filtered].sort((a, b) => {
    if (!sortCol) return 0
    let av: string | number = "", bv: string | number = ""
    if      (sortCol === "hunter")  { av = a.sales_hunter || ""; bv = b.sales_hunter || "" }
    else if (sortCol === "leads")   { av = a.name || ""; bv = b.name || "" }
    else if (sortCol === "project") { av = a.project || ""; bv = b.project || "" }
    else if (sortCol === "status")  { av = a.status || ""; bv = b.status || "" }
    else if (sortCol === "nilai")   { av = Number(a.potensi_closing) || 0; bv = Number(b.potensi_closing) || 0 }
    if (typeof av === "number") return sortDir === "asc" ? av - (bv as number) : (bv as number) - av
    return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
  })

  const activeRows = rows.filter(r => r.status !== "tidak_potensial")
  const stats = {
    total: activeRows.length,
    hot: activeRows.filter(r => r.status === "hot").length,
    totalValue: activeRows.reduce((s, r) => s + (Number(r.potensi_closing) || 0), 0),
  }

  const hunterKey = canSeeAll ? form.sales_hunter : (user?.name || "")
  const spBase = activeSps[hunterKey] || []
  const hunterGroup = HUNTER_GROUPS.find(g => g.dbName === hunterKey || g.name === hunterKey)
  const spOptions = buildSpOptions(hunterGroup, spBase)

  function canDelete(r: KonsumenRow): boolean {
    if (isAdmin) return true
    return r.user_id === user?.id || (r.sales_hunter || "").toLowerCase() === (user?.name || "").toLowerCase()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from("task_force_leads").delete().eq("id", deleteTarget.id)
    setDeleting(false)
    if (error) {
      showToast(`Gagal menghapus data: ${error.message}`, "error")
      return
    }
    setDeleteTarget(null)
    fetchData()
    showToast("Data berhasil dihapus", "success")
  }

  async function handleSharePDF() {
    const data = displayed
    const printDate = fmtDDMMYYYY(new Date().toISOString())
    const esc = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")

    // Fetch all notes for displayed leads
    const leadIds = data.map(r => r.id)
    const notesByLead: Record<string, TFNote[]> = {}
    if (leadIds.length > 0) {
      const { data: allNotes } = await supabase
        .from("task_force_notes")
        .select("*")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: true })
      for (const n of (allNotes || []) as TFNote[]) {
        if (!notesByLead[n.lead_id]) notesByLead[n.lead_id] = []
        notesByLead[n.lead_id].push(n)
      }
    }

    const rows2 = data.map(r => {
      const statusLabel: Record<string,string> = { warm:"Warm", hot:"Hot", tidak_potensial:"Tdk Potensial" }
      const nilai = r.status !== "tidak_potensial" && r.potensi_closing
        ? "Rp " + Number(r.potensi_closing).toLocaleString("id-ID") : "—"
      const modalNotes = (notesByLead[r.id] || [])
        .map(n => `<span style="color:#666;font-size:9px">${n.author_name} · ${fmtNoteTime(n.created_at)}</span><br>${esc(n.content)}`)
        .join("<hr style='margin:4px 0;border-color:#eee'>")
      const parts: string[] = []
      if (r.notes) parts.push(`<b style="font-size:9px;color:#444">Catatan:</b><br>${esc(r.notes)}`)
      if (modalNotes) parts.push(`<b style="font-size:9px;color:#444">Action Plan:</b><br>${modalNotes}`)
      const catatanCell = parts.join("<hr style='margin:5px 0;border-color:#ddd'>") || "—"
      return `<tr><td>${esc(r.sales_hunter||"—")}</td><td>${esc(r.sales_person||"—")}</td><td><b>${esc(r.name||"—")}</b></td><td>${esc(r.project||"—")}</td><td>${esc(r.unit||"—")}</td><td>${statusLabel[r.status]||esc(r.status||"—")}</td><td style="text-align:right">${nilai}</td><td>${esc(r.cara_bayar||"—")}</td><td style="text-align:center">${r.sudah_visit?"Y":"N"}</td><td style="text-align:center">${r.sudah_booking_fee?"Y":"N"}</td><td style="min-width:160px;white-space:pre-wrap;line-height:1.5">${catatanCell}</td></tr>`
    }).join("")
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Task Force Report</title><style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}table{width:100%;border-collapse:collapse}th{background:#eee;padding:6px 8px;font-size:10px;border:1px solid #ccc}td{padding:5px 8px;border:1px solid #ddd;vertical-align:top}tr:nth-child(even){background:#f9f9f9}</style></head><body><h2>Task Force Report — CGD Sales</h2><p style="color:#666;font-size:10px">Dicetak: ${printDate} · ${data.length} data</p><table><thead><tr><th>Hunter</th><th>Sales</th><th>Nama Leads</th><th>Project</th><th>Unit</th><th>Status</th><th>Nilai</th><th>Cara Bayar</th><th>Visit</th><th>BF</th><th>Catatan</th></tr></thead><tbody>${rows2}</tbody></table></body></html>`
    const w = window.open("","_blank")
    if (!w) {
      showToast("Popup diblokir browser — izinkan popup untuk mencetak PDF", "error")
      return
    }
    w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),600)
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Task Force</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {stats.total} leads aktif · {stats.hot} hot · {formatRupiah(stats.totalValue)}
            </p>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
            <Plus size={14} /> Tambah Leads
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Leads", val: stats.total,                   color: "text-blue-400"   },
            { label: "Hot",         val: stats.hot,                      color: "text-orange-400" },
            { label: "Est. Nilai",  val: formatRupiah(stats.totalValue), color: "text-green-400"  },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs text-slate-500 mb-1">{s.label}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari leads / proyek / hunter..."
              className="pl-8 pr-3 py-2 text-sm rounded-lg text-white outline-none w-64"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {FILTER_OPTIONS.map(s => (
              <button key={s.value} onClick={() => setFilterStatus(s.value)}
                className={`text-xs px-3 py-1.5 rounded-lg transition ${filterStatus === s.value ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                style={filterStatus !== s.value ? { background: "var(--surface)", border: "1px solid var(--border)" } : {}}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">{filtered.length} hasil</span>
            <button onClick={handleSharePDF}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              <FileText size={13} /> PDF
            </button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  {([
                    { key: "hunter",  label: "Hunter",        align: "left",   sortable: true  },
                    { key: "sales",   label: "Sales",         align: "left",   sortable: false },
                    { key: "leads",   label: "Nama Leads",    align: "left",   sortable: true  },
                    { key: "project", label: "Project",       align: "left",   sortable: true  },
                    { key: "unit",    label: "Unit",          align: "left",   sortable: false },
                    { key: "status",  label: "Status",        align: "center", sortable: true  },
                    { key: "nilai",   label: "Nilai Potensi", align: "right",  sortable: true  },
                    { key: "cara",    label: "Cara Bayar",    align: "center", sortable: false },
                    { key: "visit",   label: "Visit",         align: "center", sortable: false },
                    { key: "bf",      label: "BF",            align: "center", sortable: false },
                    { key: "catatan", label: "Catatan",       align: "left",   sortable: false },
                    { key: "aksi",    label: "",              align: "center", sortable: false },
                  ] as { key: string; label: string; align: string; sortable: boolean }[]).map(col => (
                    <th key={col.key}
                      className={`px-3 py-3 text-xs font-medium whitespace-nowrap ${col.sortable ? "cursor-pointer select-none hover:opacity-80" : ""}`}
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
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-slate-600 text-xs">Tidak ada data</td></tr>
                ) : displayed.map(r => {
                  const isTidakPotensial = r.status === "tidak_potensial"
                  const badge = statusBadge(r.status)
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}
                      className={`hover:bg-white/[0.02] ${isTidakPotensial ? "opacity-50" : ""}`}>
                      <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">{r.sales_hunter || "—"}</td>
                      <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">{r.sales_person || "—"}</td>
                      <td className="px-3 py-3 font-medium text-white text-xs">{r.name || "—"}</td>
                      <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">{r.project || "—"}</td>
                      <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">{r.unit || "—"}</td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                      </td>
                      <td className="px-3 py-3 text-right text-slate-300 text-xs whitespace-nowrap">
                        {!isTidakPotensial && r.potensi_closing ? formatRupiah(Number(r.potensi_closing)) : "—"}
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-slate-400 whitespace-nowrap">{r.cara_bayar || "—"}</td>
                      <td className="px-3 py-3 text-center whitespace-nowrap"><YNBadge value={r.sudah_visit} /></td>
                      <td className="px-3 py-3 text-center whitespace-nowrap"><YNBadge value={r.sudah_booking_fee} /></td>
                      <td className="px-3 py-3 text-xs text-slate-500 max-w-[140px] truncate">{r.notes || "—"}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => openEdit(r)} className="text-blue-400 hover:text-blue-300 transition" title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setNotesLead(r)}
                            className="relative text-slate-400 hover:text-green-400 transition" title="Catatan / Action Plan">
                            <MessageSquare size={14} />
                            {(notesCounts[r.id] || 0) > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-green-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                                {notesCounts[r.id] > 9 ? "9+" : notesCounts[r.id]}
                              </span>
                            )}
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
                  )
                })}
              </tbody>
              {!loading && filtered.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border-medium)", background: "var(--surface2)" }}>
                    <td colSpan={6} className="px-3 py-3 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {filtered.filter(r => r.status !== "tidak_potensial").length} leads aktif
                      {filtered.filter(r => r.status === "tidak_potensial").length > 0 &&
                        <span className="text-slate-600 ml-1">· {filtered.filter(r => r.status === "tidak_potensial").length} tdk potensial</span>
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
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">
              {editing ? "Edit Task Force" : "Tambah Task Force"}
            </h3>
            <form onSubmit={handleSave} noValidate className="space-y-3">
              {formError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs font-medium"
                  style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}>
                  <span className="mt-0.5 shrink-0">⚠</span><span>{formError}</span>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Hunter <span className="text-red-400">*</span></label>
                {canSeeAll ? (
                  <select value={form.sales_hunter} required
                    onChange={e => setForm(f => ({ ...f, sales_hunter: e.target.value, sales_person: "" }))}
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
                <label className="text-xs text-slate-500 block mb-1">Sales Person</label>
                {spOptions.length > 0 ? (
                  <select value={form.sales_person}
                    onChange={e => setForm(f => ({ ...f, sales_person: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Pilih SP —</option>
                    {spOptions.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                  </select>
                ) : (
                  <input type="text" value={form.sales_person}
                    onChange={e => setForm(f => ({ ...f, sales_person: e.target.value }))}
                    placeholder="Nama sales person (opsional)"
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                )}
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Nama Leads <span className="text-red-400">*</span></label>
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
                  <label className="text-xs text-slate-500 block mb-1">Klaster / Unit</label>
                  <input type="text" value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="Type 45, Kav 8A"
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Potensi Closing (Rp)</label>
                <RupiahInput value={form.potensi_closing}
                  onChange={raw => setForm(f => ({ ...f, potensi_closing: raw }))}
                  placeholder="Contoh: 500.000.000"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
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
                  <label className="text-xs text-slate-500 block mb-1">Cara Bayar</label>
                  <select value={form.cara_bayar}
                    onChange={e => setForm(f => ({ ...f, cara_bayar: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Pilih —</option>
                    {dbCaraBayar.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{ overflow: "hidden", minWidth: 0 }}>
                  <label className="text-xs text-slate-500 block mb-1">Tanggal Visit</label>
                  <input type="date" value={form.visit_date}
                    onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
                    className="w-full min-w-0 text-sm px-3 py-2 rounded-lg text-white outline-none appearance-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)", colorScheme: "dark", boxSizing: "border-box", WebkitAppearance: "none", display: "block" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Sudah Booking Fee?</label>
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
              <div>
                <label className="text-xs text-slate-500 block mb-1">Catatan</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none resize-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
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
            </form>
          </div>
        </Modal>
      )}

      {notesLead && (
        <NotesModal
          lead={notesLead}
          user={user}
          onClose={() => { setNotesLead(null); fetchData() }}
        />
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
              <h3 className="text-sm font-semibold text-white">Hapus Data Task Force?</h3>
            </div>
            <p className="text-xs text-slate-400 mb-1">Data berikut akan dihapus permanen:</p>
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
