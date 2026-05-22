"use client"
import { useEffect, useState, useCallback } from "react"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Lead, LeadStatus, LEAD_STATUS_CONFIG } from "@/types"
import { Upload, X, Phone, Clock, ChevronDown, Search, MessageCircle, Trash2 } from "lucide-react"
import DashboardShell from "@/components/DashboardShell"
import { fmtDDMMYYYY } from "@/lib/utils"

// Normalize phone: strip spaces, dashes, dots, leading + or 0 → starts with 62
function normalizePhone(raw: string): string {
  let p = String(raw ?? "").replace(/[\s\-.()+]/g, "")
  if (!p) return ""
  if (p.startsWith("62")) return p
  if (p.startsWith("0"))  return "62" + p.slice(1)
  return p
}

// TM name (lowercase keyword) → default project in DB
const TM_PROJECT_MAP: { match: string; project: string }[] = [
  { match: "adi chandra",        project: "SCC - Hillside"   },
  { match: "ferdinan",           project: "MRD CLH"          },
  { match: "fadjri",             project: "CH"               },
  { match: "maria oktavaini",    project: "MRD CRTU"         },
  { match: "nurlela",            project: "MRD CRBA+CBA"     },
  { match: "riduan",             project: "CH"               },
  { match: "riezkya",            project: "CT"               },
  { match: "rosa dwi",           project: "CH"               },
  { match: "shinta",             project: "CT"               },
]

function defaultProjectForTm(name: string): string {
  const lower = name.toLowerCase()
  const found = TM_PROJECT_MAP.find(m => lower.includes(m.match))
  return found ? found.project : ""
}

interface TmUser { id: string; name: string; hunter_name: string }

// ── Colour map ────────────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  slate:   { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
  red:     { bg: "rgba(248,113,113,0.15)", text: "#f87171" },
  amber:   { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  green:   { bg: "rgba(74,222,128,0.15)",  text: "#4ade80" },
  blue:    { bg: "rgba(147,197,253,0.15)", text: "#93c5fd" },
  purple:  { bg: "rgba(167,139,250,0.15)", text: "#a78bfa" },
  teal:    { bg: "rgba(45,212,191,0.15)",  text: "#2dd4bf" },
  emerald: { bg: "rgba(52,211,153,0.15)",  text: "#34d399" },
  gray:    { bg: "rgba(107,114,128,0.15)", text: "#9ca3af" },
}

// ── Status button groups (shown in the detail sheet) ──────────────────────────
const STATUS_GROUPS: { label: string; statuses: LeadStatus[] }[] = [
  { label: "Kontak Awal",     statuses: ["new", "tidak_aktif"] },
  { label: "Hasil Panggilan", statuses: ["bisa_dihub_tidak_angkat", "angkat_tidak_tertarik", "angkat_tertarik"] },
  { label: "Progress Visit",  statuses: ["visit_dijadwalkan", "sudah_visit"] },
  { label: "Final",           statuses: ["closing", "lost"] },
]

// ── Utilities ─────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2)  return "baru saja"
  if (mins < 60) return `${mins} mnt lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs} jam lalu`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "kemarin"
  return `${days} hari lalu`
}

function fmtDate(dateStr: string): string {
  return fmtDDMMYYYY(dateStr)
}

// ── Lead card ─────────────────────────────────────────────────────────────────
function LeadCard({ lead, tmName, onTap }: { lead: Lead; tmName?: string; onTap: () => void }) {
  const cfg = LEAD_STATUS_CONFIG[lead.status] ?? LEAD_STATUS_CONFIG["new"]
  const c   = COLOR_MAP[cfg.color] ?? COLOR_MAP["slate"]
  const updatedSinceUpload = lead.updated_at && lead.updated_at !== lead.created_at

  return (
    <div
      onClick={onTap}
      style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "16px 18px", cursor: "pointer", transition: "border-color 0.15s, background 0.15s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.borderColor = "var(--border-medium)" }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)";  e.currentTarget.style.borderColor = "var(--border)" }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name}</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "monospace" }}>{lead.phone}</div>
        </div>
        <span style={{ background: c.bg, color: c.text, padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
          {cfg.result}
        </span>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap", alignItems: "center" }}>
        {lead.project && (
          <span style={{ fontSize: "11px", background: "var(--accent-soft)", color: "var(--accent)", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
            {lead.project}
          </span>
        )}
        {tmName && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{tmName}</span>}
        <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
          <Clock size={10} /> {timeAgo(lead.created_at)}
        </span>
        {updatedSinceUpload && (
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>· upd {timeAgo(lead.updated_at)}</span>
        )}
      </div>

      {lead.notes && (
        <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-secondary)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          "{lead.notes}"
        </div>
      )}
    </div>
  )
}

// ── Detail bottom sheet ───────────────────────────────────────────────────────
function DetailSheet({ lead, canEdit, canDelete, onClose, onSaved, onDeleted }: {
  lead: Lead; canEdit: boolean; canDelete: boolean
  onClose: () => void; onSaved: (updated: Lead) => void; onDeleted: (id: string) => void
}) {
  const [status, setStatus]         = useState<LeadStatus>(lead.status)
  const [notes,  setNotes]          = useState(lead.notes || "")
  const [saving, setSaving]         = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const isDirty = status !== lead.status || notes !== (lead.notes || "")

  const handleSave = async () => {
    if (!isDirty) return
    setSaving(true)
    const now = new Date().toISOString()
    await supabase.from("leads").update({ status, notes, updated_at: now }).eq("id", lead.id)
    setSaving(false)
    onSaved({ ...lead, status, notes, updated_at: now })
    onClose()
  }

  const handleDelete = async () => {
    setDeleting(true)
    await supabase.from("leads").delete().eq("id", lead.id)
    setDeleting(false)
    onDeleted(lead.id)
    onClose()
  }

  const lbl: React.CSSProperties = {
    fontSize: "10px", fontWeight: 700, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "8px",
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "var(--surface2)", borderRadius: "24px 24px 0 0",
        padding: "0 20px 36px", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 -8px 48px rgba(0,0,0,0.5)",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 20px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-strong)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div>
            <div style={{ fontSize: "19px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "5px" }}>{lead.name}</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px", fontFamily: "monospace" }}>{lead.phone}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <a
                href={`tel:${lead.phone}`}
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(96,165,250,0.15)", color: "#60a5fa", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}
              >
                <Phone size={13} /> Call
              </a>
              <a
                href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(37,211,102,0.15)", color: "#25d366", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
            {canDelete && (
              <button
                onClick={() => setConfirmDel(true)}
                title="Hapus lead ini"
                style={{ background: "rgba(248,113,113,0.15)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Trash2 size={15} />
              </button>
            )}
            <button onClick={onClose} style={{ background: "var(--surface3)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap", alignItems: "center" }}>
          {lead.project && (
            <span style={{ fontSize: "11px", background: "var(--accent-soft)", color: "var(--accent)", padding: "2px 8px", borderRadius: "6px", fontWeight: 700 }}>
              {lead.project}
            </span>
          )}
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Upload: {fmtDate(lead.created_at)}</span>
          {lead.updated_at && lead.updated_at !== lead.created_at && (
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Update: {timeAgo(lead.updated_at)}</span>
          )}
        </div>

        {/* Status groups */}
        <div style={{ marginBottom: "22px" }}>
          <label style={lbl}>Update Status</label>
          {STATUS_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "7px", fontWeight: 600, letterSpacing: "0.04em" }}>
                {group.label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {group.statuses.map((s) => {
                  const cfg = LEAD_STATUS_CONFIG[s]
                  const c   = COLOR_MAP[cfg.color] ?? COLOR_MAP["slate"]
                  const isSelected = status === s
                  return (
                    <button
                      key={s}
                      onClick={() => canEdit && setStatus(s)}
                      disabled={!canEdit}
                      style={{
                        padding: "9px 14px", borderRadius: "12px", fontSize: "13px", fontWeight: 600,
                        border: `2px solid ${isSelected ? c.text : "var(--border)"}`,
                        background: isSelected ? c.bg : "var(--surface3)",
                        color: isSelected ? c.text : "var(--text-secondary)",
                        cursor: canEdit ? "pointer" : "default",
                        transition: "all 0.15s",
                      }}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div style={{ marginBottom: "22px" }}>
          <label style={lbl}>Catatan Hasil Follow Up</label>
          <textarea
            value={notes}
            onChange={(e) => canEdit && setNotes(e.target.value)}
            readOnly={!canEdit}
            placeholder={canEdit ? "Tulis hasil follow up, jadwal visit, dll..." : "Belum ada catatan"}
            rows={4}
            style={{
              width: "100%", background: "var(--surface)", border: "1px solid var(--border-medium)",
              borderRadius: "12px", padding: "11px 14px", color: "var(--text-primary)", fontSize: "14px",
              outline: "none", resize: "none", boxSizing: "border-box", lineHeight: "1.5",
              opacity: canEdit ? 1 : 0.7,
            }}
          />
        </div>

        {/* Delete confirmation panel */}
        {confirmDel && (
          <div style={{
            marginBottom: "16px", padding: "16px", borderRadius: "14px",
            background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
          }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#f87171", marginBottom: "6px" }}>
              Hapus lead ini?
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "14px" }}>
              <strong style={{ color: "var(--text-primary)" }}>{lead.name}</strong> akan dihapus permanen dan tidak bisa dikembalikan.
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setConfirmDel(false)}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, background: "var(--surface3)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ flex: 1, padding: "10px", borderRadius: "10px", fontSize: "13px", fontWeight: 700, background: "rgba(248,113,113,0.2)", border: "1px solid rgba(248,113,113,0.4)", color: "#f87171", cursor: deleting ? "not-allowed" : "pointer" }}
              >
                {deleting ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        )}

        {/* Save */}
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            style={{
              width: "100%", padding: "15px", borderRadius: "14px", fontSize: "15px", fontWeight: 700,
              background: saving || !isDirty
                ? "var(--surface3)"
                : "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
              color: saving || !isDirty ? "var(--text-muted)" : "#fff",
              border: "none", cursor: saving || !isDirty ? "not-allowed" : "pointer",
              boxShadow: saving || !isDirty ? "none" : "var(--shadow-accent)",
              transition: "all 0.2s",
            }}
          >
            {saving ? "Menyimpan..." : isDirty ? "Simpan Perubahan" : "Tidak Ada Perubahan"}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Upload modal (DGM only) ───────────────────────────────────────────────────
function UploadModal({ tmUsers, onClose, onUploaded }: { tmUsers: TmUser[]; onClose: () => void; onUploaded: () => void }) {
  const { user } = useAuth()
  const now = new Date()
  const [assignedTo, setAssignedTo] = useState("")
  const [project, setProject]       = useState("")
  const [period, setPeriod]         = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [rows, setRows]             = useState<{ name: string; phone: string }[]>([])
  const [saving, setSaving]         = useState(false)
  const [dbProjects, setDbProjects] = useState<string[]>([])

  // Fetch distinct project values from konsumen table once
  useEffect(() => {
    supabase.from("konsumen").select("project").not("project", "is", null)
      .then(({ data }) => {
        const unique = Array.from(new Set((data ?? []).map((r: { project: string }) => r.project).filter(Boolean) as string[])).sort()
        setDbProjects(unique)
        // Set default project if none selected yet
        if (!project && unique.length > 0) setProject(unique[0])
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-select project when TM changes
  const handleTmChange = (tmId: string) => {
    setAssignedTo(tmId)
    if (!tmId) return
    const tm = tmUsers.find(t => t.id === tmId)
    if (!tm) return
    const defaultProject = defaultProjectForTm(tm.name)
    if (defaultProject) setProject(defaultProject)
  }

  const sel: React.CSSProperties = {
    width: "100%", background: "var(--surface2)", border: "1px solid var(--border-medium)",
    borderRadius: "10px", padding: "9px 12px", color: "var(--text-primary)", fontSize: "13px", outline: "none",
  }
  const lbl: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px",
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb   = XLSX.read(ev.target?.result, { type: "array" })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      // Use raw 2-D array so we can scan for the actual header row
      // (some files have merged cells / title rows before the real headers)
      const grid = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][]

      // Find header row: first row (in rows 0-9) that contains "name" or "phone" keyword
      const isHeaderRow = (row: string[]) =>
        row.some(c => /leads[\s._-]?name|nama/i.test(String(c))) ||
        row.some(c => /telp|telepon|hp|phone/i.test(String(c)))

      const headerIdx = grid.slice(0, 10).findIndex(isHeaderRow)
      if (headerIdx === -1) {
        // Fallback: treat row 0 as header (standard simple files with Nama/Phone columns)
        const simple = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" })
        setRows(simple.map((r) => {
          const nk = Object.keys(r).find(k => /nama|name/i.test(k)) ?? Object.keys(r)[0] ?? ""
          const pk = Object.keys(r).find(k => /telp|telepon|hp|phone/i.test(k)) ?? Object.keys(r)[1] ?? ""
          return { name: String(r[nk] ?? "").trim(), phone: String(r[pk] ?? "").trim() }
        }).filter(r => r.name))
        return
      }

      const headers = grid[headerIdx]
      const nameCol  = headers.findIndex(h => /leads[\s._-]?name|nama/i.test(String(h)))
      const phoneCol = headers.findIndex(h => /telp|telepon|hp|phone|no\./i.test(String(h)))

      const parsed = grid.slice(headerIdx + 1).map(row => ({
        name:  String(row[nameCol]  ?? "").trim(),
        phone: String(row[phoneCol] ?? "").trim(),
      })).filter(r => r.name && r.name !== headers[nameCol])

      setRows(parsed)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleSave = async () => {
    if (!assignedTo || rows.length === 0) return
    setSaving(true)

    // 1. Fetch existing phone numbers for this TM + period from DB
    const { data: existing } = await supabase
      .from("leads")
      .select("phone")
      .eq("assigned_to", assignedTo)
      .eq("period", period)

    const existingPhones = new Set((existing ?? []).map((l: { phone: string }) => normalizePhone(l.phone)))

    // 2. Deduplicate within the file itself + against DB
    const seen = new Set<string>()
    const toInsert = rows.filter(r => {
      const norm = normalizePhone(r.phone)
      if (!norm) return true // no phone — allow
      if (existingPhones.has(norm)) return false // already in DB
      if (seen.has(norm)) return false // duplicate within file
      seen.add(norm)
      return true
    })

    const skipped = rows.length - toInsert.length

    if (toInsert.length > 0) {
      const BATCH = 200
      for (let b = 0; b < toInsert.length; b += BATCH) {
        await supabase.from("leads").insert(toInsert.slice(b, b + BATCH).map(r => ({
          assigned_to: assignedTo, name: r.name, phone: r.phone,
          project, period, status: "new", notes: "", uploaded_by: user?.id ?? null,
        })))
      }
    }

    setSaving(false)
    if (skipped > 0) alert(`✅ ${toInsert.length} leads diimport.\n⚠️ ${skipped} leads dilewati karena nomor telepon sudah ada.`)
    onUploaded(); onClose()
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ width: "100%", maxWidth: "460px", background: "var(--surface2)", border: "1px solid var(--border-medium)", borderRadius: "20px", padding: "28px", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
          <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>Upload Leads Nurture</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={lbl}>Sales Telemarketing</label>
            <select value={assignedTo} onChange={(e) => handleTmChange(e.target.value)} style={sel}>
              <option value="">— Pilih TM —</option>
              {tmUsers.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={lbl}>Proyek</label>
              <select value={project} onChange={(e) => setProject(e.target.value)} style={sel}>
                {dbProjects.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Periode</label>
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ ...sel, colorScheme: "dark" }} />
            </div>
          </div>
          <div>
            <label style={lbl}>File Excel <span style={{ fontWeight: 400, textTransform: "none" }}>(kolom: Nama, No Telepon)</span></label>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", background: "var(--surface)", border: "1px dashed var(--border-medium)", borderRadius: "10px", padding: "12px 16px", color: "var(--text-secondary)", fontSize: "13px" }}>
              <Upload size={16} />
              {rows.length > 0 ? `${rows.length} leads siap diupload` : "Klik untuk pilih file .xlsx"}
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
            </label>
          </div>
          {rows.length > 0 && (
            <div style={{ maxHeight: "130px", overflowY: "auto", background: "var(--surface)", borderRadius: "10px", border: "1px solid var(--border)" }}>
              <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "5px 10px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>Nama</th>
                  <th style={{ padding: "5px 10px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600 }}>No Telepon</th>
                </tr></thead>
                <tbody>
                  {rows.slice(0, 6).map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "5px 10px", color: "var(--text-primary)" }}>{r.name}</td>
                      <td style={{ padding: "5px 10px", color: "var(--text-secondary)" }}>{r.phone}</td>
                    </tr>
                  ))}
                  {rows.length > 6 && <tr><td colSpan={2} style={{ padding: "5px 10px", color: "var(--text-muted)", fontSize: "11px" }}>+{rows.length - 6} leads lainnya...</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={handleSave} disabled={saving || !assignedTo || rows.length === 0} style={{
            background: saving || !assignedTo || rows.length === 0
              ? "var(--surface3)" : "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
            color: saving || !assignedTo || rows.length === 0 ? "var(--text-muted)" : "#fff",
            border: "none", borderRadius: "10px", padding: "11px", fontSize: "13px", fontWeight: 600,
            cursor: saving || !assignedTo || rows.length === 0 ? "not-allowed" : "pointer",
            boxShadow: saving || !assignedTo || rows.length === 0 ? "none" : "var(--shadow-accent)",
          }}>
            {saving ? "Menyimpan..." : `Simpan ${rows.length} Leads`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FunnelPage() {
  const { user } = useAuth()
  const role     = user?.role ?? ""
  const isAdmin  = role === "admin"
  const isDgm    = role === "dgm" || role === "admin_dgm" || isAdmin
  const isTm     = role === "telemarketing" || (user?.has_tm_access ?? false)
  const isHunter = role === "hunter"
  const canEdit  = isTm || isDgm

  const now = new Date()
  const [period, setPeriod]       = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [leads, setLeads]         = useState<Lead[]>([])
  const [tmUsers, setTmUsers]     = useState<TmUser[]>([])
  const [filterTm, setFilterTm]   = useState("")
  const [search, setSearch]       = useState("")
  const [showUpload, setShowUpload] = useState(false)
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!user) return
    let q = supabase.from("users").select("id, name, hunter_name").eq("has_tm_access", true).eq("status", "active").order("name")
    if (isHunter) q = q.eq("hunter_name", user.name)
    q.then(({ data }) => { if (data) setTmUsers(data as TmUser[]) })
  }, [user, isHunter])

  const fetchLeads = useCallback(async () => {
    if (!user) return
    setLoading(true)
    let ids: string[] = []
    if (isTm) {
      ids = [user.id]
    } else if (isDgm) {
      const { data } = await supabase.from("users").select("id").eq("has_tm_access", true).eq("status", "active")
      ids = (data ?? []).map((u: { id: string }) => u.id)
    } else if (isHunter) {
      const { data } = await supabase.from("users").select("id").eq("has_tm_access", true).eq("hunter_name", user.name).eq("status", "active")
      ids = (data ?? []).map((u: { id: string }) => u.id)
    }
    if (ids.length === 0) { setLeads([]); setLoading(false); return }
    let q = supabase.from("leads").select("*").in("assigned_to", ids).eq("period", period).order("created_at", { ascending: false })
    if (filterTm) q = q.eq("assigned_to", filterTm)
    const { data } = await q
    setLeads((data ?? []) as Lead[])
    setLoading(false)
  }, [user, isTm, isDgm, isHunter, period, filterTm])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const handleSaved = (updated: Lead) => {
    setLeads((prev) => prev.map((l) => l.id === updated.id ? updated : l))
  }

  const handleDeleted = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }

  // Filtered leads for display
  const displayed = search.trim()
    ? leads.filter((l) =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.phone.includes(search)
      )
    : leads

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px 24px", boxShadow: "var(--shadow-sm)" }
  const lbl: React.CSSProperties  = { fontSize: "11px", fontWeight: 600 as const, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }

  const kpis = [
    { label: "Total",         val: leads.length, color: "var(--text-primary)" },
    { label: "Belum",         val: leads.filter((l) => l.status === "new").length, color: "#94a3b8" },
    { label: "Follow Up",     val: leads.filter((l) => l.status === "bisa_dihub_tidak_angkat").length, color: "#fbbf24" },
    { label: "Pipeline",      val: leads.filter((l) => ["angkat_tertarik","visit_dijadwalkan","sudah_visit"].includes(l.status)).length, color: "#a78bfa" },
    { label: "Closing",       val: leads.filter((l) => l.status === "closing").length, color: "#34d399" },
    { label: "Dead",          val: leads.filter((l) => ["angkat_tidak_tertarik","tidak_aktif","lost"].includes(l.status)).length, color: "#f87171" },
  ]

  return (
    <DashboardShell>
    <div>
      {showUpload && <UploadModal tmUsers={tmUsers} onClose={() => setShowUpload(false)} onUploaded={fetchLeads} />}
      {activeLead && (
        <DetailSheet
          lead={activeLead}
          canEdit={canEdit}
          canDelete={isDgm || isAdmin}
          onClose={() => setActiveLead(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Funneling Leads Nurture</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
            {isTm ? "Leads yang di-assign kepadamu · tap untuk update" : "Daftar leads telemarketing"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={{
            background: "var(--surface2)", border: "1px solid var(--border-medium)",
            borderRadius: "10px", padding: "7px 12px", color: "var(--text-primary)",
            fontSize: "12px", outline: "none", colorScheme: "dark",
          }} />
          {(isDgm || isHunter) && tmUsers.length > 0 && (
            <div style={{ position: "relative" }}>
              <select value={filterTm} onChange={(e) => setFilterTm(e.target.value)} style={{ background: "var(--surface2)", border: "1px solid var(--border-medium)", borderRadius: "10px", padding: "7px 30px 7px 12px", color: "var(--text-primary)", fontSize: "12px", outline: "none", appearance: "none" }}>
                <option value="">Semua TM</option>
                {tmUsers.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
            </div>
          )}
          {isDgm && (
            <button onClick={() => setShowUpload(true)} style={{ display: "flex", alignItems: "center", gap: "7px", background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))", color: "#fff", border: "none", borderRadius: "10px", padding: "8px 16px", fontSize: "12px", fontWeight: 600, cursor: "pointer", boxShadow: "var(--shadow-accent)" }}>
              <Upload size={14} /> Upload Leads
            </button>
          )}
        </div>
      </div>

      {/* KPI bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "10px", marginBottom: "20px" }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...card, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: k.color }}>{k.val}</div>
            <div style={{ ...lbl, marginTop: "4px" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "16px" }}>
        <Search size={14} style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau nomor telepon..."
          style={{
            width: "100%", boxSizing: "border-box",
            background: "var(--surface2)", border: "1px solid var(--border-medium)",
            borderRadius: "12px", padding: "9px 14px 9px 36px",
            color: "var(--text-primary)", fontSize: "13px", outline: "none",
          }}
        />
      </div>

      {/* Card list */}
      {loading ? (
        <div style={{ ...card, textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>Memuat data...</div>
      ) : displayed.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
          {search ? "Tidak ada lead yang cocok dengan pencarian." : isTm ? "Belum ada leads yang di-assign untukmu periode ini." : "Belum ada leads untuk periode & filter ini."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {displayed.map((lead) => {
            const tmName = (!isTm && tmUsers.length > 0) ? (tmUsers.find((t) => t.id === lead.assigned_to)?.name) : undefined
            return (
              <LeadCard
                key={lead.id}
                lead={lead}
                tmName={tmName}
                onTap={() => setActiveLead(lead)}
              />
            )
          })}
          {displayed.length > 0 && (
            <div style={{ textAlign: "center", padding: "12px", color: "var(--text-muted)", fontSize: "12px" }}>
              {displayed.length} leads ditampilkan
            </div>
          )}
        </div>
      )}
    </div>
    </DashboardShell>
  )
}
