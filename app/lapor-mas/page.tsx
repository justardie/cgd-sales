"use client"
import { useCallback, useEffect, useState } from "react"
import { supabaseLapor } from "@/lib/supabase-lapor"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import DashboardShell from "@/components/DashboardShell"
import NextImage from "next/image"
import { X, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react"
import { fmtDDMMYYYY } from "@/lib/utils"

interface Laporan {
  id: number
  created_at: string
  jenis: string
  proyek: string
  isi: string
  status: string
  foto_urls: string[]
}

const JENIS_LABELS: Record<string, { label: string; color: string }> = {
  curhat:   { label: "Curhat",   color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  kendala:  { label: "Kendala",  color: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  lapangan: { label: "Lapangan", color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  internal: { label: "Internal", color: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  baru:    { label: "Baru",    dot: "bg-red-400" },
  proses:  { label: "Proses",  dot: "bg-yellow-400" },
  selesai: { label: "Selesai", dot: "bg-green-400" },
}

function DetailModal({ laporan, onClose, onStatusChange }: {
  laporan: Laporan
  onClose: () => void
  onStatusChange: (id: number, status: string) => void
}) {
  const jenis = JENIS_LABELS[laporan.jenis] || { label: laporan.jenis, color: "bg-slate-500/15 text-slate-300 border-slate-500/30" }
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  async function updateStatus(newStatus: string) {
    setSaving(true)
    const { error } = await supabaseLapor.from("laporan").update({ status: newStatus }).eq("id", laporan.id)
    setSaving(false)
    if (error) {
      showToast(`Gagal mengubah status: ${error.message}`, "error")
      return
    }
    onStatusChange(laporan.id, newStatus)
    showToast("Status laporan berhasil diperbarui", "success")
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="w-full max-w-lg rounded-xl flex flex-col max-h-[85vh] relative"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        {/* Sticky header */}
        <div className="flex-shrink-0 px-5 pt-4 pb-3 pr-10" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${jenis.color}`}>{jenis.label}</span>
            <span className="text-xs text-slate-500">{laporan.proyek}</span>
            <span className="text-xs text-slate-600 ml-auto">
              {fmtDDMMYYYY(laporan.created_at)} {new Date(laporan.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="absolute top-3.5 right-4 text-slate-500 hover:text-white z-10">
          <X size={16} />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed mb-4 p-3 rounded-lg"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            {laporan.isi}
          </div>

          {laporan.foto_urls?.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <ImageIcon size={12} /> {laporan.foto_urls.length} foto
              </div>
              <div className="flex flex-wrap gap-2">
                {laporan.foto_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <NextImage src={url} alt={`foto-${i + 1}`} width={80} height={80} unoptimized
                      className="w-20 h-20 object-cover rounded-lg border"
                      style={{ borderColor: "var(--border)" }} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer: status buttons */}
        <div className="flex-shrink-0 flex items-center gap-2 px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="text-xs text-slate-500">Status:</span>
          {["baru", "proses", "selesai"].map(s => (
            <button key={s} disabled={saving || laporan.status === s}
              onClick={() => updateStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
                laporan.status === s
                  ? s === "baru" ? "bg-red-500/20 text-red-300 border-red-500/40"
                    : s === "proses" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
                    : "bg-green-500/20 text-green-300 border-green-500/40"
                  : "text-slate-500 border-slate-700 hover:text-white hover:border-slate-500"
              } disabled:cursor-default`}>
              {STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LaporMasPage() {
  const { isAdmin } = useAuth()
  const [data, setData] = useState<Laporan[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterJenis, setFilterJenis] = useState("all")
  const [filterProyek, setFilterProyek] = useState("all")
  const [selected, setSelected] = useState<Laporan | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const fetchData = useCallback(async () => {
    const { data: rows } = await supabaseLapor
      .from("laporan")
      .select("id,created_at,jenis,proyek,isi,status,foto_urls")
      .order("created_at", { ascending: false })
    setData((rows || []) as Laporan[])
    setLoading(false)
  }, [])

  useEffect(() => { if (isAdmin) queueMicrotask(() => void fetchData()) }, [fetchData, isAdmin])

  function handleStatusChange(id: number, newStatus: string) {
    setData(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: newStatus } : null)
  }

  function toggleExpand(id: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!isAdmin) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
          Halaman ini hanya dapat diakses oleh Admin.
        </div>
      </DashboardShell>
    )
  }

  const allProyek = Array.from(new Set(data.map(r => r.proyek))).sort()

  const filtered = data.filter(r => {
    const matchStatus = filterStatus === "all" || r.status === filterStatus
    const matchJenis = filterJenis === "all" || r.jenis === filterJenis
    const matchProyek = filterProyek === "all" || r.proyek === filterProyek
    return matchStatus && matchJenis && matchProyek
  })

  const counts = {
    all: data.length,
    baru: data.filter(r => r.status === "baru").length,
    proses: data.filter(r => r.status === "proses").length,
    selesai: data.filter(r => r.status === "selesai").length,
  }

  return (
    <DashboardShell>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">Lapor Mas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Keluhan &amp; laporan dari sales team — {data.length} total</p>
        </div>

        {/* Status summary cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { key: "all",    label: "Semua",   count: counts.all,    bg: "var(--surface)",        border: "var(--border)" },
            { key: "baru",   label: "Baru",    count: counts.baru,   bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.3)" },
            { key: "proses", label: "Proses",  count: counts.proses, bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.3)" },
            { key: "selesai",label: "Selesai", count: counts.selesai,bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.3)" },
          ].map(c => (
            <button key={c.key} onClick={() => setFilterStatus(c.key)}
              className="rounded-xl p-3 text-left transition"
              style={{
                background: filterStatus === c.key ? c.bg : "var(--surface)",
                border: `1px solid ${filterStatus === c.key ? c.border : "var(--border)"}`,
                opacity: filterStatus !== "all" && filterStatus !== c.key ? 0.6 : 1,
              }}>
              <div className="text-xs text-slate-500 mb-0.5">{c.label}</div>
              <div className="text-2xl font-bold text-white">{c.count}</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-300 outline-none"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <option value="all">Semua Jenis</option>
            {Object.entries(JENIS_LABELS).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          <select value={filterProyek} onChange={e => setFilterProyek(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg text-slate-300 outline-none"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
            <option value="all">Semua Proyek</option>
            {allProyek.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <span className="text-xs text-slate-600 self-center ml-1">{filtered.length} laporan</span>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-slate-600 text-sm">Memuat data Lapor Mas...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-600 text-sm">Tidak ada laporan yang cocok</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(r => {
              const jenis = JENIS_LABELS[r.jenis] || { label: r.jenis, color: "bg-slate-500/15 text-slate-300 border-slate-500/30" }
              const statusCfg = STATUS_CONFIG[r.status] || { label: r.status, dot: "bg-slate-400" }
              const isExp = expanded.has(r.id)
              const isLong = r.isi?.length > 200

              return (
                <div key={r.id} className="rounded-xl p-4"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-start gap-3">
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${statusCfg.dot}`} />

                    <div className="flex-1 min-w-0">
                      {/* Meta row */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${jenis.color}`}>{jenis.label}</span>
                        <span className="text-xs text-slate-400">{r.proyek}</span>
                        {r.foto_urls?.length > 0 && (
                          <span className="text-xs text-slate-600 flex items-center gap-0.5">
                            <ImageIcon size={11} /> {r.foto_urls.length}
                          </span>
                        )}
                        <span className="text-xs text-slate-600 ml-auto">
                          {fmtDDMMYYYY(r.created_at)}
                        </span>
                      </div>

                      {/* Content preview */}
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {isLong && !isExp ? r.isi.slice(0, 200) + "…" : r.isi}
                      </p>

                      {/* Actions row */}
                      <div className="flex items-center gap-3 mt-2">
                        {isLong && (
                          <button onClick={() => toggleExpand(r.id)}
                            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-0.5 transition">
                            {isExp ? <><ChevronUp size={12} /> Sembunyikan</> : <><ChevronDown size={12} /> Baca selengkapnya</>}
                          </button>
                        )}
                        <button onClick={() => setSelected(r)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition ml-auto">
                          Detail &amp; Ubah Status
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <DetailModal
          laporan={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </DashboardShell>
  )
}
