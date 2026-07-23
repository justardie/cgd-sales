"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import DashboardShell from "@/components/DashboardShell"
import { supabase } from "@/lib/supabase"
import { formatRupiah, PROJECT_NAMES } from "@/lib/utils"
import {
  buildEmptyUnitSpecialForm,
  formatUnitSpecialPayments,
  isUnitSpecialCategory,
  type UnitSpecialCategory,
  UNIT_SPECIAL_CATEGORIES,
  UNIT_SPECIAL_PAYMENT_OPTIONS,
  UNIT_SPECIAL_STATUS_OPTIONS,
  type UnitSpecialForm,
  type UnitSpecialStatus,
} from "@/lib/unit-special"
import { ArrowUpDown, Edit3, FileDown, Plus, Save, Trash2, X } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

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

type SortKey = "project" | "cluster" | "unit_no" | "lt_lb" | "payment_method" | "sale_price" | "notes" | "status"

function parseNumber(value: string) {
  return Number(value.replace(/[^\d]/g, "")) || 0
}

function priceInput(value: string) {
  const numeric = value.replace(/[^\d]/g, "")
  return numeric ? Number(numeric).toLocaleString("id-ID") : ""
}

function parsePayments(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
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
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "project", dir: "asc" })
  const [bulkEditing, setBulkEditing] = useState(false)
  const [bulkRows, setBulkRows] = useState<Record<string, UnitSpecialForm>>({})

  const activeLabel = UNIT_SPECIAL_CATEGORIES.find((category) => category.value === activeCategory)?.label || "Unit Special"

  const filteredRows = useMemo(() => {
    const list = rows.filter((row) => row.category === activeCategory)
    return [...list].sort((a, b) => {
      const av = sort.key === "sale_price" ? a.sale_price : (a[sort.key] || "").toString().toLowerCase()
      const bv = sort.key === "sale_price" ? b.sale_price : (b[sort.key] || "").toString().toLowerCase()
      const result = av > bv ? 1 : av < bv ? -1 : 0
      return sort.dir === "asc" ? result : -result
    })
  }, [activeCategory, rows, sort])

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

  useEffect(() => {
    queueMicrotask(() => {
      setBulkEditing(false)
      setBulkRows({})
    })
  }, [activeCategory])

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

  function togglePayment(payment: string) {
    setForm((current) => {
      const selected = parsePayments(current.payment_method)
      const next = selected.includes(payment)
        ? selected.filter((item) => item !== payment)
        : [...selected, payment]
      return { ...current, payment_method: formatUnitSpecialPayments(next) }
    })
  }

  function selectAllPayments() {
    setForm((current) => ({ ...current, payment_method: formatUnitSpecialPayments([...UNIT_SPECIAL_PAYMENT_OPTIONS]) }))
  }

  function toggleSort(key: SortKey) {
    setSort((current) => current.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" })
  }

  function startBulkEdit() {
    setBulkRows(Object.fromEntries(filteredRows.map((row) => [row.id, {
      category: row.category,
      project: row.project,
      cluster: row.cluster,
      unit_no: row.unit_no,
      lt_lb: row.lt_lb,
      payment_method: row.payment_method,
      sale_price: row.sale_price ? row.sale_price.toLocaleString("id-ID") : "",
      notes: row.notes,
      status: row.status,
    }])))
    setBulkEditing(true)
  }

  function setBulkField(id: string, field: keyof UnitSpecialForm, value: string) {
    setBulkRows((current) => ({ ...current, [id]: { ...current[id], [field]: value } }))
  }

  async function handleBulkSave() {
    setSaving(true)
    const updates = filteredRows.map((row) => {
      const next = bulkRows[row.id]
      return supabase.from("unit_special").update({
        project: next.project.trim(),
        cluster: next.cluster.trim(),
        unit_no: next.unit_no.trim(),
        lt_lb: next.lt_lb.trim(),
        payment_method: next.payment_method.trim(),
        sale_price: parseNumber(next.sale_price),
        notes: next.notes.trim(),
        status: next.status,
      }).eq("id", row.id)
    })
    const results = await Promise.all(updates)
    setSaving(false)
    const error = results.find((result) => result.error)?.error
    if (error) {
      showToast(`Gagal simpan bulk: ${error.message}`, "error")
      return
    }
    showToast("Bulk edit berhasil disimpan", "success")
    setBulkEditing(false)
    setBulkRows({})
    await fetchData()
  }

  function exportPdf() {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const generated = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date())
    const hasPayment = filteredRows.some((row) => row.payment_method.trim())
    const head = hasPayment
      ? ["No.", "Project", "Cluster", "No. Unit", "LT/LB", "Cara Bayar", "Harga", "Ket.", "Status"]
      : ["No.", "Project", "Cluster", "No. Unit", "LT/LB", "Harga", "Ket.", "Status"]
    const body = filteredRows.map((row, index) => hasPayment ? [
      index + 1,
      row.project,
      row.cluster,
      row.unit_no,
      row.lt_lb,
      row.payment_method,
      row.sale_price ? row.sale_price.toLocaleString("id-ID") : "",
      row.notes,
      row.status,
    ] : [
      index + 1,
      row.project,
      row.cluster,
      row.unit_no,
      row.lt_lb,
      row.sale_price ? row.sale_price.toLocaleString("id-ID") : "",
      row.notes,
      row.status,
    ])
    const dense = filteredRows.length > 45
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(14)
    pdf.text(activeLabel, 12, 14)
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(8)
    pdf.setTextColor(90, 104, 124)
    pdf.text(`CGD Sales · ${generated}`, 12, 19)
    pdf.setTextColor(15, 23, 42)
    autoTable(pdf, {
      startY: 24,
      margin: { top: 12, left: 10, right: 10, bottom: 10 },
      head: [head],
      body,
      styles: {
        fontSize: dense ? 5.1 : 7,
        cellPadding: dense ? { top: 0.6, right: 0.8, bottom: 0.6, left: 0.8 } : 1.3,
        overflow: "linebreak",
        lineWidth: 0.08,
        valign: "middle",
        minCellHeight: dense ? 3.2 : 5,
      },
      headStyles: { fillColor: [11, 34, 73], textColor: 255, fontStyle: "bold", fontSize: dense ? 5.8 : 7.4 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: hasPayment ? {
        0: { cellWidth: 7, halign: "center" },
        1: { cellWidth: 23 },
        2: { cellWidth: 28 },
        3: { cellWidth: 19 },
        4: { cellWidth: 14 },
        5: { cellWidth: 27 },
        6: { cellWidth: 21, halign: "right" },
        7: { cellWidth: 38 },
        8: { cellWidth: 13, halign: "center" },
      } : {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 30 },
        2: { cellWidth: 34 },
        3: { cellWidth: 22 },
        4: { cellWidth: 18 },
        5: { cellWidth: 25, halign: "right" },
        6: { cellWidth: 39 },
        7: { cellWidth: 14, halign: "center" },
      },
      didParseCell: (data) => {
        const statusIndex = hasPayment ? 8 : 7
        if (data.section === "body" && data.row.raw && Array.isArray(data.row.raw) && data.row.raw[statusIndex] === "Sold") {
          data.cell.styles.fillColor = [254, 242, 242]
          data.cell.styles.textColor = [153, 27, 27]
        }
      },
      pageBreak: "avoid",
      rowPageBreak: "avoid",
      theme: "grid",
    })
    if (pdf.getNumberOfPages() > 1) {
      for (let page = pdf.getNumberOfPages(); page > 1; page -= 1) pdf.deletePage(page)
      pdf.setFontSize(7)
      pdf.setTextColor(185, 28, 28)
      pdf.text("Catatan: data dirapatkan agar tetap satu halaman A4 portrait.", 8, 291)
    }
    pdf.save(`${activeLabel}.pdf`)
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
          <div className="flex gap-2 flex-wrap">
            {bulkEditing ? (
              <>
                <button onClick={handleBulkSave} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition">
                  <Save size={16} /> {saving ? "Menyimpan..." : "Simpan Semua"}
                </button>
                <button onClick={() => { setBulkEditing(false); setBulkRows({}) }} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  Batal
                </button>
              </>
            ) : (
              <button onClick={startBulkEdit} disabled={loading || filteredRows.length === 0} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition">
                <Edit3 size={16} /> Edit Bulk
              </button>
            )}
            <button onClick={exportPdf} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition">
              <FileDown size={16} /> Export PDF
            </button>
            <button onClick={() => openNew()} disabled={bulkEditing} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition">
              <Plus size={16} /> Tambah Unit
            </button>
          </div>
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
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">No.</th>
                  {[
                    ["project", "Project"],
                    ["cluster", "Cluster"],
                    ["unit_no", "No. Unit"],
                    ["lt_lb", "LT/LB"],
                    ["payment_method", "Cara Bayar"],
                    ["sale_price", "Harga Jual"],
                    ["notes", "Keterangan"],
                    ["status", "Status"],
                  ].map(([key, label]) => (
                    <th key={key} className="px-3 py-2 font-semibold whitespace-nowrap">
                      <button type="button" onClick={() => toggleSort(key as SortKey)} className="inline-flex items-center gap-1 hover:text-white">
                        {label}<ArrowUpDown size={12} />
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Memuat data...</td></tr>
                ) : filteredRows.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Belum ada data.</td></tr>
                ) : filteredRows.map((row, index) => (
                  <tr key={row.id} className="border-t border-slate-800/70" style={{ background: row.status === "Sold" ? "rgba(239,68,68,0.10)" : undefined }}>
                    <td className="px-3 py-2 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-2 text-white font-medium">{bulkEditing ? <BulkInput value={bulkRows[row.id]?.project || ""} onChange={(value) => setBulkField(row.id, "project", value)} /> : row.project}</td>
                    <td className="px-3 py-2 text-slate-300">{bulkEditing ? <BulkInput value={bulkRows[row.id]?.cluster || ""} onChange={(value) => setBulkField(row.id, "cluster", value)} /> : row.cluster || "—"}</td>
                    <td className="px-3 py-2 text-slate-300">{bulkEditing ? <BulkInput value={bulkRows[row.id]?.unit_no || ""} onChange={(value) => setBulkField(row.id, "unit_no", value)} /> : row.unit_no}</td>
                    <td className="px-3 py-2 text-slate-300">{bulkEditing ? <BulkInput value={bulkRows[row.id]?.lt_lb || ""} onChange={(value) => setBulkField(row.id, "lt_lb", value)} /> : row.lt_lb || "—"}</td>
                    <td className="px-3 py-2 text-slate-300">{bulkEditing ? <BulkInput value={bulkRows[row.id]?.payment_method || ""} onChange={(value) => setBulkField(row.id, "payment_method", value)} /> : row.payment_method || "—"}</td>
                    <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{bulkEditing ? <BulkInput value={bulkRows[row.id]?.sale_price || ""} onChange={(value) => setBulkField(row.id, "sale_price", priceInput(value))} /> : formatRupiah(row.sale_price || 0)}</td>
                    <td className="px-3 py-2 text-slate-400 min-w-[180px]">{bulkEditing ? <BulkInput value={bulkRows[row.id]?.notes || ""} onChange={(value) => setBulkField(row.id, "notes", value)} /> : row.notes || "—"}</td>
                    <td className="px-3 py-2">
                      {bulkEditing ? (
                        <select value={bulkRows[row.id]?.status || row.status} onChange={(event) => setBulkField(row.id, "status", event.target.value as UnitSpecialStatus)} className="field-input min-w-[86px] !py-1 !px-2 !text-xs">
                          {UNIT_SPECIAL_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${row.status === "Open" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                          {row.status}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className={`flex gap-2 ${bulkEditing ? "opacity-40 pointer-events-none" : ""}`}>
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

        {activeCategory === "unit_investor" && <UnitInvestorTerms />}
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
                <Field label="Cara Bayar">
                  <div className="flex flex-wrap gap-2 rounded-lg border p-2" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
                    {UNIT_SPECIAL_PAYMENT_OPTIONS.map((payment) => {
                      const selected = parsePayments(form.payment_method).includes(payment)
                      return (
                        <button
                          key={payment}
                          type="button"
                          onClick={() => togglePayment(payment)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selected ? "text-white" : "text-slate-400 hover:text-white"}`}
                          style={{ background: selected ? "rgba(59,130,246,0.28)" : "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
                        >
                          {payment}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={selectAllPayments}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-300 hover:text-amber-200 transition"
                      style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)" }}
                    >
                      Semua Bisa
                    </button>
                  </div>
                </Field>
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

function BulkInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="field-input min-w-[110px] !py-1 !px-2 !text-xs"
    />
  )
}

function UnitInvestorTerms() {
  const accounts = [
    ["PM", "BCA 061-6391288", "Princip Muljadi"],
    ["MM", "BCA 061-8598899", "Merry Muljadi"],
    ["RBX", "BCA 061-5175353", "PT Robalex Indonesia"],
    ["MPJR", "BCA 061-3921122", "Mahkota Properti Jayaraya"],
    ["MBAM", "BCA 855-0050138", "Mitra Bahana Asia Makmur"],
    ["MPM", "BCA 061-5156677", "Mahkota Permata Mitra"],
    ["MPT", "BCA 061-5582323", "Mahkota Properti Tangguh"],
    ["MPTD", "BCA 061-6631688", "Mahkota Properti Tangguh Dahsyat"],
  ]
  return (
    <section className="rounded-2xl p-4 space-y-3 text-sm text-slate-300" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <h2 className="text-base font-bold text-white">Syarat &amp; Ketentuan</h2>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Unit Investor hanya dapat dijual dengan cara bayar Cash Bertahap mulai dari 36x &amp; SOB.</li>
        <li>Unit Internal hanya dapat dijual dengan cara bayar Cash keras dan KPR indent.</li>
        <li>Setiap hold unit mohon dapat menginformasikan ke Dept. SA untuk pencatatan.</li>
        <li>Transfer titipan / Booking Fee wajib ke rekening sesuai dengan kode:</li>
      </ol>
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead style={{ background: "var(--surface2)" }}>
            <tr className="text-slate-300">
              <th className="px-4 py-2 text-left">Kode</th>
              <th className="px-4 py-2 text-left">Nomor Rekening</th>
              <th className="px-4 py-2 text-left">Nama Rekening</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map(([code, number, name]) => (
              <tr key={code} className="border-t border-slate-800/70">
                <td className="px-4 py-2 font-semibold text-white">{code}</td>
                <td className="px-4 py-2">{number}</td>
                <td className="px-4 py-2">{name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ol className="list-decimal pl-5 space-y-1" start={5}>
        <li>SKUP menggunakan SKUP Chomes.</li>
        <li>BASTPP uang masuk 40%.</li>
      </ol>
    </section>
  )
}
