"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import DashboardShell from "@/components/DashboardShell"
import { supabase } from "@/lib/supabase"
import { formatRupiah, PROJECT_NAMES } from "@/lib/utils"
import {
  buildEmptyUnitSpecialForm,
  isUnitSpecialCategory,
  type UnitSpecialCategory,
  UNIT_SPECIAL_CATEGORIES,
  UNIT_SPECIAL_STATUS_OPTIONS,
  type UnitSpecialForm,
  type UnitSpecialStatus,
} from "@/lib/unit-special"
import { Edit3, Plus, Trash2, X } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"

interface UnitSpecialRow {
  id: string
  category: UnitSpecialCategory
  project: string
  cluster: string
  unit_no: string
  lt_lb: string
  payment_method: string
  sale_price: number
  notes: string
  status: UnitSpecialStatus
  created_at: string
}

function parseNumber(value: string) {
  return Number(value.replace(/[^\d]/g, "")) || 0
}

function priceInput(value: string) {
  const numeric = value.replace(/[^\d]/g, "")
  return numeric ? Number(numeric).toLocaleString("id-ID") : ""
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.72)" }}>
      <div className="w-full max-w-2xl rounded-xl relative max-h-[90vh] overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  )
}

export default function UnitSpecialPage() {
  const { showToast } = useToast()
  const [activeCategory, setActiveCategory] = useState<UnitSpecialCategory>("unit_buyback")
  const [rows, setRows] = useState<UnitSpecialRow[]>([])
  const [projects, setProjects] = useState<string[]>([...PROJECT_NAMES])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<UnitSpecialRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UnitSpecialRow | null>(null)
  const [form, setForm] = useState<UnitSpecialForm>(buildEmptyUnitSpecialForm("unit_buyback"))

  const filteredRows = useMemo(
    () => rows.filter((row) => row.category === activeCategory),
    [activeCategory, rows]
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [unitRes, pipelineProjectsRes, closingProjectsRes] = await Promise.all([
      supabase.from("unit_special").select("*").order("created_at", { ascending: false }),
      supabase.from("konsumen").select("project").not("project", "is", null),
      supabase.from("closings").select("project").not("project", "is", null),
    ])

    if (unitRes.error) {
      showToast(`Gagal memuat Unit Special: ${unitRes.error.message}`, "error")
      setRows([])
    } else {
      setRows((unitRes.data || []).filter((row) => isUnitSpecialCategory(row.category)) as UnitSpecialRow[])
    }

    const dbProjects = [
      ...(pipelineProjectsRes.data || []).map((row: { project: string | null }) => row.project),
      ...(closingProjectsRes.data || []).map((row: { project: string | null }) => row.project),
    ].filter(Boolean) as string[]
    setProjects(Array.from(new Set([...PROJECT_NAMES, ...dbProjects])).sort())
    setLoading(false)
  }, [showToast])

  useEffect(() => { queueMicrotask(() => void fetchData()) }, [fetchData])

  function openNew(category = activeCategory) {
    setEditing(null)
    setForm(buildEmptyUnitSpecialForm(category))
    setShowModal(true)
  }

  function openEdit(row: UnitSpecialRow) {
    setEditing(row)
    setForm({
      category: row.category,
      project: row.project,
      cluster: row.cluster,
      unit_no: row.unit_no,
      lt_lb: row.lt_lb,
      payment_method: row.payment_method,
      sale_price: row.sale_price ? row.sale_price.toLocaleString("id-ID") : "",
      notes: row.notes,
      status: row.status,
    })
    setShowModal(true)
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!form.project || !form.unit_no) {
      showToast("Project dan No. Unit wajib diisi", "error")
      return
    }

    setSaving(true)
    const payload = {
      category: form.category,
      project: form.project.trim(),
      cluster: form.cluster.trim(),
      unit_no: form.unit_no.trim(),
      lt_lb: form.lt_lb.trim(),
      payment_method: form.payment_method.trim(),
      sale_price: parseNumber(form.sale_price),
      notes: form.notes.trim(),
      status: form.status,
    }
    const result = editing
      ? await supabase.from("unit_special").update(payload).eq("id", editing.id)
      : await supabase.from("unit_special").insert(payload)
    setSaving(false)

    if (result.error) {
      showToast(`Gagal menyimpan: ${result.error.message}`, "error")
      return
    }
    showToast(editing ? "Unit berhasil diperbarui" : "Unit berhasil ditambahkan", "success")
    setShowModal(false)
    setEditing(null)
    setForm(buildEmptyUnitSpecialForm(activeCategory))
    await fetchData()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    const { error } = await supabase.from("unit_special").delete().eq("id", deleteTarget.id)
    setSaving(false)
    if (error) {
      showToast(`Gagal menghapus: ${error.message}`, "error")
      return
    }
    showToast("Unit berhasil dihapus", "success")
    setDeleteTarget(null)
    await fetchData()
  }

  return (
    <DashboardShell>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-white">Unit Special</h1>
            <p className="text-sm text-slate-500 mt-0.5">Unit Buyback, Unit Investor, dan Stock Sudah SPK</p>
          </div>
          <button onClick={() => openNew()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
            <Plus size={16} /> Tambah Unit
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {UNIT_SPECIAL_CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setActiveCategory(category.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${activeCategory === category.value ? "text-white" : "text-slate-400 hover:text-white"}`}
              style={{ background: activeCategory === category.value ? "rgba(59,130,246,0.22)" : "var(--surface2)", border: "1px solid var(--border)" }}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface2)" }}>
                <tr className="text-slate-400 text-left">
                  {["No.", "Project", "Cluster", "No. Unit", "LT/LB", "Cara Bayar", "Harga Jual", "Keterangan", "Status", "Aksi"].map((head) => (
                    <th key={head} className="px-4 py-3 font-semibold whitespace-nowrap">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Memuat data...</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Belum ada data.</td></tr>
                ) : filteredRows.map((row, index) => (
                  <tr key={row.id} className="border-t border-slate-800/70">
                    <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3 text-white font-medium">{row.project}</td>
                    <td className="px-4 py-3 text-slate-300">{row.cluster || "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{row.unit_no}</td>
                    <td className="px-4 py-3 text-slate-300">{row.lt_lb || "—"}</td>
                    <td className="px-4 py-3 text-slate-300">{row.payment_method || "—"}</td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{formatRupiah(row.sale_price || 0)}</td>
                    <td className="px-4 py-3 text-slate-400 min-w-[180px]">{row.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${row.status === "Open" ? "bg-green-500/15 text-green-400" : "bg-slate-500/15 text-slate-300"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(row)} className="p-2 rounded-lg text-slate-400 hover:text-white transition" style={{ background: "var(--surface2)" }} title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(row)} className="p-2 rounded-lg text-red-400 hover:text-red-300 transition" style={{ background: "var(--surface2)" }} title="Hapus">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <Modal onClose={() => { setShowModal(false); setEditing(null); setForm(buildEmptyUnitSpecialForm(activeCategory)) }}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">{editing ? "Edit Unit Special" : "Tambah Unit Special"}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Sub Menu">
                  <select value={form.category} onChange={(e) => setForm((current) => ({ ...current, category: e.target.value as UnitSpecialCategory }))} className="field-input">
                    {UNIT_SPECIAL_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                  </select>
                </Field>
                <Field label="Project" required>
                  <select value={form.project} required onChange={(e) => setForm((current) => ({ ...current, project: e.target.value }))} className="field-input">
                    <option value="">— Pilih Project —</option>
                    {projects.map((project) => <option key={project} value={project}>{project}</option>)}
                  </select>
                </Field>
                <Field label="Cluster"><input value={form.cluster} onChange={(e) => setForm((current) => ({ ...current, cluster: e.target.value }))} className="field-input" /></Field>
                <Field label="No. Unit" required><input value={form.unit_no} required onChange={(e) => setForm((current) => ({ ...current, unit_no: e.target.value }))} className="field-input" /></Field>
                <Field label="LT/LB"><input value={form.lt_lb} onChange={(e) => setForm((current) => ({ ...current, lt_lb: e.target.value }))} className="field-input" placeholder="Contoh: 90/45" /></Field>
                <Field label="Cara Bayar"><input value={form.payment_method} onChange={(e) => setForm((current) => ({ ...current, payment_method: e.target.value }))} className="field-input" placeholder="Cash / KPR / Inhouse" /></Field>
                <Field label="Harga Jual"><input value={form.sale_price} onChange={(e) => setForm((current) => ({ ...current, sale_price: priceInput(e.target.value) }))} className="field-input" placeholder="0" /></Field>
                <Field label="Status">
                  <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as UnitSpecialStatus }))} className="field-input">
                    {UNIT_SPECIAL_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Keterangan">
                <textarea value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} className="field-input min-h-[80px]" />
              </Field>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setEditing(null); setForm(buildEmptyUnitSpecialForm(activeCategory)) }} className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>Batal</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)}>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 size={18} className="text-red-400" />
              <h3 className="text-sm font-semibold text-white">Hapus Unit?</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">Data <span className="text-white font-medium">{deleteTarget.project} · {deleteTarget.unit_no}</span> akan dihapus permanen.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={saving} className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>Batal</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition">
                {saving ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardShell>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-500 block mb-1">{label}{required && <span className="text-red-400"> *</span>}</span>
      {children}
    </label>
  )
}
