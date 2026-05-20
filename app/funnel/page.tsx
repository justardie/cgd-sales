"use client"
import { useEffect, useState, useCallback } from "react"
import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Lead, LeadStatus, LEAD_STATUS_CONFIG } from "@/types"
import { Upload, X, ChevronDown } from "lucide-react"

const PROJECTS = ["CH", "SCC", "CT", "MRD"]

interface TmUser { id: string; name: string; hunter_name: string }

// ── Result badge ──────────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  slate: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
  red:   { bg: "rgba(248,113,113,0.15)", text: "#f87171" },
  amber: { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  green: { bg: "rgba(74,222,128,0.15)",  text: "#4ade80" },
  blue:  { bg: "rgba(147,197,253,0.15)", text: "#93c5fd" },
}
function ResultBadge({ status }: { status: LeadStatus }) {
  const cfg = LEAD_STATUS_CONFIG[status]
  const c = COLOR_MAP[cfg.color] ?? COLOR_MAP["slate"]
  return (
    <span style={{ background: c.bg, color: c.text, padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, whiteSpace: "nowrap" }}>
      {cfg.result}
    </span>
  )
}

// ── Upload modal ──────────────────────────────────────────────────────────────
function UploadModal({ tmUsers, onClose, onUploaded }: { tmUsers: TmUser[]; onClose: () => void; onUploaded: () => void }) {
  const { user } = useAuth()
  const now = new Date()
  const [assignedTo, setAssignedTo] = useState("")
  const [project, setProject]       = useState("CH")
  const [period, setPeriod]         = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [rows, setRows]             = useState<{ name: string; phone: string }[]>([])
  const [saving, setSaving]         = useState(false)

  const sel: React.CSSProperties = {
    width: "100%", background: "var(--surface2)",
    border: "1px solid var(--border-medium)", borderRadius: "10px",
    padding: "9px 12px", color: "var(--text-primary)", fontSize: "13px", outline: "none",
  }
  const lbl: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "6px",
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: "array" })
      const raw = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]], { defval: "" })
      setRows(raw.map((r) => {
        const nk = Object.keys(r).find((k) => /nama/i.test(k)) ?? ""
        const pk = Object.keys(r).find((k) => /telp|telepon|hp|phone|no\./i.test(k)) ?? ""
        return { name: String(r[nk] ?? "").trim(), phone: String(r[pk] ?? "").trim() }
      }).filter((r) => r.name))
    }
    reader.readAsArrayBuffer(file)
  }

  const handleSave = async () => {
    if (!assignedTo || rows.length === 0) return
    setSaving(true)
    await supabase.from("leads").insert(rows.map((r) => ({
      assigned_to: assignedTo, name: r.name, phone: r.phone,
      project, period, status: "new", uploaded_by: user?.id ?? null,
    })))
    setSaving(false); onUploaded(); onClose()
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
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} style={sel}>
              <option value="">— Pilih TM —</option>
              {tmUsers.map((tm) => <option key={tm.id} value={tm.id}>{tm.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={lbl}>Proyek</label>
              <select value={project} onChange={(e) => setProject(e.target.value)} style={sel}>
                {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Periode</label>
              <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
                style={{ ...sel, colorScheme: "dark" }} />
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
            border: "none", borderRadius: "10px", padding: "11px",
            fontSize: "13px", fontWeight: 600,
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
  const isDgm    = role === "dgm"
  const isTm     = role === "telemarketing" || (user?.has_tm_access ?? false)
  const isHunter = role === "hunter"

  const now = new Date()
  const [period, setPeriod]     = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [leads, setLeads]       = useState<Lead[]>([])
  const [tmUsers, setTmUsers]   = useState<TmUser[]>([])
  const [filterTm, setFilterTm] = useState("")
  const [showUpload, setShowUpload] = useState(false)
  const [loading, setLoading]   = useState(true)

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

  const updateStatus = async (id: string, status: LeadStatus) => {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l))
    await supabase.from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
  }

  const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px 24px", boxShadow: "var(--shadow-sm)" }
  const lbl: React.CSSProperties  = { fontSize: "11px", fontWeight: 600 as const, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }
  const canEdit = isTm || isDgm

  const kpis = [
    { label: "Total",           val: leads.length,                                              color: "var(--text-primary)" },
    { label: "Belum Dihubungi", val: leads.filter((l) => l.status === "new").length,             color: "#94a3b8" },
    { label: "Follow Up",       val: leads.filter((l) => l.status === "bisa_dihub_tidak_angkat").length, color: "#fbbf24" },
    { label: "Segera Visit",    val: leads.filter((l) => l.status === "angkat_tertarik").length,  color: "#4ade80" },
    { label: "Cold",            val: leads.filter((l) => l.status === "angkat_tidak_tertarik").length, color: "#93c5fd" },
    { label: "Unqualified",     val: leads.filter((l) => l.status === "tidak_aktif").length,      color: "#f87171" },
  ]

  return (
    <div>
      {showUpload && <UploadModal tmUsers={tmUsers} onClose={() => setShowUpload(false)} onUploaded={fetchLeads} />}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>Funneling Leads Nurture</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
            {isTm ? "Leads yang di-assign kepadamu" : "Daftar leads telemarketing"}
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "10px", marginBottom: "20px" }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...card, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: k.color }}>{k.val}</div>
            <div style={{ ...lbl, marginTop: "4px" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {(["#", "Nama Lead", "No Telepon", (isDgm || isHunter) ? "Sales TM" : null, "Proyek", "Status Panggilan", "Result", "Update"].filter(Boolean) as string[]).map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", ...lbl, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>Memuat data...</td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                  {isTm ? "Belum ada leads yang di-assign untukmu periode ini." : "Belum ada leads untuk periode & filter ini."}
                </td></tr>
              ) : leads.map((lead, idx) => {
                const tmName = tmUsers.find((t) => t.id === lead.assigned_to)?.name ?? "—"
                return (
                  <tr key={lead.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "11px 16px", color: "var(--text-muted)", width: "40px" }}>{idx + 1}</td>
                    <td style={{ padding: "11px 16px", color: "var(--text-primary)", fontWeight: 500 }}>{lead.name}</td>
                    <td style={{ padding: "11px 16px", color: "var(--text-secondary)", fontFamily: "monospace", fontSize: "12px" }}>{lead.phone}</td>
                    {(isDgm || isHunter) && <td style={{ padding: "11px 16px", color: "var(--text-secondary)", fontSize: "12px" }}>{tmName}</td>}
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600 }}>{lead.project || "—"}</span>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      {canEdit ? (
                        <select value={lead.status} onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                          style={{ background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: "8px", padding: "4px 8px", color: "var(--text-primary)", fontSize: "12px", outline: "none", cursor: "pointer" }}>
                          {(Object.keys(LEAD_STATUS_CONFIG) as LeadStatus[]).map((s) => (
                            <option key={s} value={s}>{LEAD_STATUS_CONFIG[s].label}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{LEAD_STATUS_CONFIG[lead.status]?.label ?? lead.status}</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 16px" }}><ResultBadge status={lead.status} /></td>
                    <td style={{ padding: "11px 16px", color: "var(--text-muted)", fontSize: "11px", whiteSpace: "nowrap" }}>
                      {new Date(lead.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
