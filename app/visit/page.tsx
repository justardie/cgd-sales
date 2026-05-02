"use client"
import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, getMonthName, getWeekNumber } from "@/lib/utils"
import { MapPin, Plus, Upload, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import type { Visit, User } from "@/types"
import * as XLSX from "xlsx"

const VISIT_TYPES = [
  { value: "konsumen", label: "Konsumen" },
  { value: "lokasi", label: "Visit Lokasi" },
  { value: "assisted", label: "Assisted" },
  { value: "out_of_town", label: "Luar Kota" },
  { value: "pk", label: "PK / Seminar" },
  { value: "sg_agent", label: "SG Agent" },
]

interface VisitWithUser extends Visit { user?: User }

const now = new Date()

export default function VisitPage() {
  const { user, isAdmin } = useAuth()
  const [visits, setVisits] = useState<VisitWithUser[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const [form, setForm] = useState({
    user_id: user?.id || "",
    visit_date: new Date().toISOString().slice(0, 10),
    visit_type: "konsumen",
    count: 1,
    notes: "",
  })

  useEffect(() => { if (user) { setForm(f => ({ ...f, user_id: user.id })); fetchData() } }, [user, month, year])

  async function fetchData() {
    setLoading(true)
    const [visitsRes, usersRes] = await Promise.all([
      supabase.from("visit_logs")
        .select("*")
        .eq("month", month).eq("year", year)
        .order("visit_date", { ascending: false })
        ,
      isAdmin ? supabase.from("users").select("id,name").eq("status", "active") : Promise.resolve({ data: [] }),
    ])
    setVisits(visitsRes.data || [])
    if (isAdmin) setUsers(usersRes.data as User[] || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const date = new Date(form.visit_date)
    const { error } = await supabase.from("visit_logs").insert({
      user_id: form.user_id || user!.id,
      visit_date: form.visit_date,
      visit_type: form.visit_type,
      count: Number(form.count),
      notes: form.notes || null,
      week_number: getWeekNumber(date),
      month,
      year,
    })
    if (error) setMsg({ type: "err", text: error.message })
    else {
      setMsg({ type: "ok", text: "Visit berhasil dicatat!" })
      setForm(f => ({ ...f, notes: "", count: 1 }))
      fetchData()
    }
    setSaving(false)
  }

  async function handleExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data)
    const rows = XLSX.utils.sheet_to_json<{ tanggal?: string; tipe?: string; jumlah?: number; catatan?: string }>(
      wb.Sheets[wb.SheetNames[0]]
    )
    const inserts = rows.map(r => {
      const d = new Date(r.tanggal || Date.now())
      return {
        user_id: user!.id,
        visit_date: d.toISOString().slice(0, 10),
        visit_type: r.tipe || "konsumen",
        count: Number(r.jumlah) || 1,
        notes: r.catatan || null,
        week_number: getWeekNumber(d),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
      }
    })
    const { error } = await supabase.from("visit_logs").insert(inserts)
    if (error) setMsg({ type: "err", text: error.message })
    else { setMsg({ type: "ok", text: `${inserts.length} visit diimport!` }); fetchData() }
    if (fileRef.current) fileRef.current.value = ""
  }

  const myVisits = visits.filter(v => isAdmin || v.user_id === user?.id)
  const totalCount = myVisits.reduce((s, v) => s + (v.count || 0), 0)
  const visitTarget = 40
  const weekVisits = myVisits.filter(v => {
    const d = new Date(v.visit_date)
    return getWeekNumber(d) === getWeekNumber(new Date())
  }).reduce((s, v) => s + (v.count || 0), 0)

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Visit</h1>
            <p className="text-sm text-slate-500 mt-0.5">Rekap kunjungan bulanan</p>
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
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg text-slate-400 hover:text-white transition"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
              <Upload size={13} /> Import Excel
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcel} />
          </div>
        </div>

        {/* Progress Cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Visit Bulan Ini", val: totalCount, max: visitTarget, unit: "visit" },
            { label: "Visit Minggu Ini", val: weekVisits, max: 10, unit: "visit" },
            { label: "Hari Kerja Tersisa", val: null, max: null, unit: "" },
          ].map((c, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="text-xs text-slate-500 mb-1">{c.label}</div>
              {c.val !== null ? (
                <>
                  <div className="text-2xl font-bold text-white">{c.val}<span className="text-sm text-slate-500 ml-1">/ {c.max}</span></div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-800">
                    <div className="h-1.5 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min((c.val / (c.max || 1)) * 100, 100)}%` }} />
                  </div>
                </>
              ) : (
                <div className="text-2xl font-bold text-white">
                  {Math.max(0, (() => {
                    const d = new Date(); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
                    let count = 0; for (let i = d.getDate(); i <= last.getDate(); i++) {
                      const day = new Date(d.getFullYear(), d.getMonth(), i).getDay()
                      if (day !== 0 && day !== 6) count++
                    }
                    return count
                  })())}
                  <span className="text-sm text-slate-500 ml-1">hari</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Plus size={15} className="text-blue-400" /> Catat Visit</h2>
            {msg && (
              <div className={`flex items-center gap-2 text-xs p-3 rounded-lg ${msg.type === "ok" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                {msg.type === "ok" ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                {msg.text}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              {isAdmin && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Sales Hunter</label>
                  <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    <option value={user!.id}>Saya sendiri</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500 block mb-1">Tanggal</label>
                <input type="date" value={form.visit_date}
                  onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} required />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Tipe Visit</label>
                <select value={form.visit_type} onChange={e => setForm(f => ({ ...f, visit_type: e.target.value }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  {VISIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Jumlah Visit</label>
                <input type="number" min={1} max={50} value={form.count}
                  onChange={e => setForm(f => ({ ...f, count: Number(e.target.value) }))}
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} required />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Catatan</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Optional"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none resize-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition">
                {saving ? "Menyimpan..." : "Simpan Visit"}
              </button>
            </form>
          </div>

          {/* Visit Log */}
          <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="px-5 py-4" style={{ background: "var(--surface)" }}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <MapPin size={15} className="text-green-400" /> Riwayat Visit {getMonthName(month)}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                    {isAdmin && <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Hunter</th>}
                    <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Tipe</th>
                    <th className="px-4 py-3 text-center text-xs text-slate-500 font-medium">Jumlah</th>
                    <th className="px-4 py-3 text-left text-xs text-slate-500 font-medium">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600 text-xs">Memuat...</td></tr>
                  ) : myVisits.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-600 text-xs">Belum ada visit bulan ini</td></tr>
                  ) : myVisits.slice(0, 50).map(v => (
                    <tr key={v.id} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-white/[0.02]">
                      {isAdmin && <td className="px-4 py-3 text-xs text-slate-300">{v.user_id}</td>}
                      <td className="px-4 py-3 text-xs text-slate-300">{v.visit_date}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                          {VISIT_TYPES.find(t => t.value === v.visit_type)?.label || v.visit_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-white font-semibold">{v.count}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{v.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

