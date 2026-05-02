"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, getMonthName, pct } from "@/lib/utils"
import { Plus, X, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react"
import type { Closing, User } from "@/types"

// Existing pipeline table uses: name (konsumen), sales (project), value, slhunter, unit
interface ExistingPipeline {
  id: string
  name: string
  sales: string
  unit: string
  value: number
  slhunter: string
  status: string
  user_id?: string
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-xl relative"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  )
}

export default function ClosingPage() {
  const { user, isAdmin } = useAuth()
  const [closings, setClosings] = useState<Closing[]>([])
  const [pipelines, setPipelines] = useState<ExistingPipeline[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [myTarget, setMyTarget] = useState(0)

  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const [form, setForm] = useState({
    user_id: user?.id || "",
    pipeline_id: "",
    konsumen_name: "",
    project: "",
    unit: "",
    closing_value: "",
    closing_date: new Date().toISOString().slice(0, 10),
    notes: "",
  })

  useEffect(() => { if (user) fetchData() }, [user, month, year])

  async function fetchData() {
    setLoading(true)
    const [closingsRes, pipeRes, usersRes, targetRes] = await Promise.all([
      supabase.from("closings").select("*")
        .eq("month", month).eq("year", year)
        .order("closing_date", { ascending: false }),
      supabase.from("pipeline")
        .select("id,name,sales,unit,value,slhunter,status,user_id")
        .not("status", "eq", "closed_won")
        .not("status", "eq", "closed_lost"),
      isAdmin
        ? supabase.from("users").select("id,name,monthly_target").eq("status", "active")
        : Promise.resolve({ data: [] }),
      !isAdmin
        ? supabase.from("users").select("monthly_target").eq("id", user!.id).single()
        : Promise.resolve({ data: null }),
    ])

    const allClosings = (closingsRes.data || []) as Closing[]
    setClosings(isAdmin ? allClosings : allClosings.filter(c => c.user_id === user!.id))

    const allPipes = (pipeRes.data || []) as ExistingPipeline[]
    setPipelines(allPipes.filter(p =>
      isAdmin ||
      p.user_id === user!.id ||
      (p.slhunter || "").toLowerCase() === (user!.name || "").toLowerCase()
    ))

    if (isAdmin) setUsers((usersRes.data || []) as User[])
    if (targetRes.data) setMyTarget((targetRes.data as { monthly_target: number }).monthly_target || 0)
    setLoading(false)
  }

  function onPipelineSelect(id: string) {
    const p = pipelines.find(x => x.id === id)
    if (p) {
      setForm(f => ({
        ...f,
        pipeline_id: id,
        konsumen_name: p.name || "",
        project: p.sales || "",
        unit: p.unit || "",
        closing_value: p.value?.toString() || "",
        user_id: p.user_id || f.user_id,
      }))
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.closing_value || Number(form.closing_value) <= 0) return
    setSaving(true)
    const d = new Date(form.closing_date)
    await supabase.from("closings").insert({
      user_id: form.user_id || user!.id,
      pipeline_id: form.pipeline_id || null,
      konsumen_name: form.konsumen_name,
      project: form.project || null,
      unit: form.unit || null,
      closing_value: Number(form.closing_value),
      closing_date: form.closing_date,
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      notes: form.notes || null,
    })
    if (form.pipeline_id) {
      await supabase.from("pipeline")
        .update({ status: "closed_won" })
        .eq("id", form.pipeline_id)
    }
    setSaving(false)
    setShowModal(false)
    setForm(f => ({ ...f, pipeline_id: "", konsumen_name: "", project: "", unit: "", closing_value: "", notes: "" }))
    fetchData()
  }

  const myClosings = closings.filter(c => isAdmin || c.user_id === user?.id)
  const totalOmset = myClosings.reduce((s, c) => s + (c.closing_value || 0), 0)
  const achievement = pct(totalOmset, myTarget)

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Closing</h1>
            <p className="text-sm text-slate-500 mt-0.5">Realisasi penjualan</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <ChevronLeft size={14} />
            </button>
            <div className="text-sm font-semibold text-white min-w-[130px] text-center">
              {getMonthName(month)} {year}
            </div>
            <button onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <ChevronRight size={14} />
            </button>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition">
              <Plus size={14} /> Input Closing
            </button>
          </div>
        </div>

        {/* Stats */}
        {!isAdmin ? (
          <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-slate-500">Omset MTD</div>
                <div className="text-2xl font-bold text-white mt-0.5">{formatRupiah(totalOmset)}</div>
                <div className="text-xs text-slate-500 mt-0.5">Target: {formatRupiah(myTarget)}</div>
              </div>
              <div className={`text-3xl font-black ${achievement >= 100 ? "text-green-400" : achievement >= 70 ? "text-blue-400" : "text-red-400"}`}>
                {achievement}%
              </div>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-2 rounded-full transition-all"
                style={{ width: `${Math.min(achievement, 100)}%`, background: achievement >= 100 ? "#22c55e" : achievement >= 70 ? "#3b82f6" : "#ef4444" }} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl p-4 col-span-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs text-slate-500 mb-1">Total Omset Tim</div>
              <div className="text-2xl font-bold text-green-400">
                {formatRupiah(closings.reduce((s, c) => s + (c.closing_value || 0), 0))}
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs text-slate-500 mb-1">Transaksi</div>
              <div className="text-2xl font-bold text-white">{closings.length}</div>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs text-slate-500 mb-1">Avg. Deal</div>
              <div className="text-xl font-bold text-white">
                {closings.length > 0
                  ? formatRupiah(Math.round(closings.reduce((s, c) => s + (c.closing_value || 0), 0) / closings.length))
                  : "—"}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-5 py-4" style={{ background: "var(--surface)" }}>
            <h2 className="text-sm font-semibold text-white">Riwayat Closing {getMonthName(month)}</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                {isAdmin && <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Hunter</th>}
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Konsumen</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Proyek / Unit</th>
                <th className="px-4 py-3 text-right text-xs text-slate-500 font-medium">Nilai</th>
                <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Tanggal</th>
                <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat...</td></tr>
              ) : myClosings.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600 text-xs">Belum ada closing bulan ini</td></tr>
              ) : myClosings.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                  {isAdmin && <td className="px-4 py-3 text-xs text-slate-400">{c.user_id?.slice(0, 8)}…</td>}
                  <td className="px-4 py-3 font-medium text-white">{c.konsumen_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.project}{c.unit ? ` · ${c.unit}` : ""}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-400">{formatRupiah(c.closing_value)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.closing_date}</td>
                  <td className="px-4 py-3 text-center">
                    {c.pipeline_id
                      ? <CheckCircle size={14} className="text-green-400 mx-auto" />
                      : <span className="text-slate-700 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Input Closing</h3>
            <form onSubmit={handleSave} className="space-y-3">
              {isAdmin && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Hunter</label>
                  <select value={form.user_id}
                    onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value="">— Pilih Hunter —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Dari Pipeline (opsional)</label>
                <select value={form.pipeline_id}
                  onChange={e => { if (e.target.value) onPipelineSelect(e.target.value); else setForm(f => ({ ...f, pipeline_id: "" })) }}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  <option value="">— Manual (tanpa pipeline) —</option>
                  {pipelines.map(p => (
                    <option key={p.id} value={p.id}>{p.name} · {p.sales}</option>
                  ))}
                </select>
              </div>
              {[
                { key: "konsumen_name", label: "Nama Konsumen", required: true },
                { key: "project", label: "Proyek" },
                { key: "unit", label: "Unit / Tipe" },
                { key: "closing_value", label: "Nilai Closing (Rp)", type: "number", required: true },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-500 block mb-1">{f.label}</label>
                  <input
                    type={f.type || "text"}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    required={f.required}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Tanggal Closing</label>
                <input type="date" value={form.closing_date}
                  onChange={e => setForm(f => ({ ...f, closing_date: e.target.value }))}
                  required
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition">
                  {saving ? "Menyimpan..." : "Konfirmasi Closing"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </DashboardShell>
  )
}
