"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import ConfirmModal from "@/components/ConfirmModal"
import { Plus, X, AlertCircle, Clock, CheckCircle2, Circle, Trash2, Target, Edit2 } from "lucide-react"
import type { Activity, User } from "@/types"

const PRIORITIES = [
  { value: "low",      label: "Low",      color: "bg-slate-500/20 text-slate-400" },
  { value: "medium",   label: "Medium",   color: "bg-blue-500/20 text-blue-400" },
  { value: "high",     label: "High",     color: "bg-orange-500/20 text-orange-400" },
  { value: "critical", label: "Critical", color: "bg-red-500/20 text-red-400" },
]

const STATUSES = [
  { value: "pending",     label: "Pending",     icon: Circle,       color: "text-slate-400" },
  { value: "in_progress", label: "In Progress", icon: Clock,        color: "text-blue-400" },
  { value: "completed",   label: "Selesai",     icon: CheckCircle2, color: "text-green-400" },
  { value: "overdue",     label: "Overdue",     icon: AlertCircle,  color: "text-red-400" },
]

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-xl relative max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  )
}

export default function ActivitiesPage() {
  const { user, isAdmin } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [wigs, setWigs] = useState<any[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Activity | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState("all")
  const [taskError, setTaskError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedHunters: [] as string[],
    deadline: "",
    priority: "medium",
  })

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    deadline: "",
    priority: "medium",
    status: "pending",
    notes: "",
  })

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    setLoading(true)
    setTaskError(null)
    const [actRes, wigRes, usersRes] = await Promise.all([
      supabase.from("tasks").select("*").order("deadline", { ascending: true }),
      supabase.from("wig").select("*").order("created_at", { ascending: false }),
      supabase.from("users").select("id,name,role").eq("status", "active"),
    ])
    if (actRes.error) setTaskError(actRes.error.message)
    setActivities((actRes.data || []) as Activity[])
    setWigs(wigRes.data || [])
    setUsers(usersRes.data as User[] || [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const targets = form.assignedHunters.length > 0 ? form.assignedHunters : [user!.id]
    await supabase.from("tasks").insert(
      targets.map(id => ({
        title: form.title,
        description: form.description || null,
        assigned_to: id,
        created_by: user!.id,
        deadline: form.deadline || null,
        priority: form.priority,
        status: "pending",
      }))
    )
    setSaving(false)
    setShowModal(false)
    setForm({ title: "", description: "", assignedHunters: [], deadline: "", priority: "medium" })
    fetchData()
  }

  function openEdit(a: Activity) {
    setEditingTask(a)
    setEditForm({
      title: a.title,
      description: a.description || "",
      assigned_to: a.assigned_to || "",
      deadline: a.deadline || "",
      priority: a.priority,
      status: a.status === "overdue" ? "pending" : a.status,
      notes: (a as Activity & { notes?: string }).notes || "",
    })
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingTask) return
    setSaving(true)
    const payload = isAdmin
      ? {
          title: editForm.title,
          description: editForm.description || null,
          assigned_to: editForm.assigned_to || null,
          deadline: editForm.deadline || null,
          priority: editForm.priority,
          status: editForm.status,
          updated_at: new Date().toISOString(),
        }
      : {
          status: editForm.status,
          notes: editForm.notes || null,
          updated_at: new Date().toISOString(),
        }
    await supabase.from("tasks").update(payload).eq("id", editingTask.id)
    setSaving(false)
    setEditingTask(null)
    fetchData()
  }

  async function deleteActivity(id: string) {
    await supabase.from("tasks").delete().eq("id", id)
    fetchData()
  }

  const hunters = users.filter(u => u.role === "hunter")
  const filtered = activities.filter(a => filterStatus === "all" || a.status === filterStatus)
  const counts = { all: activities.length, pending: 0, in_progress: 0, completed: 0, overdue: 0 }
  activities.forEach(a => {
    if (counts[a.status as keyof typeof counts] !== undefined)
      counts[a.status as keyof typeof counts]++
  })
  const isOverdue = (a: Activity) => a.deadline && new Date(a.deadline) < new Date() && a.status !== "completed"

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Activities</h1>
            <p className="text-sm text-slate-500 mt-0.5">Tugas & target aktivitas</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg font-semibold text-white transition"
              style={{ background: "#E84500" }}>
              <Plus size={14} /> Tambah Task
            </button>
          )}
        </div>

        {taskError && (
          <div className="text-xs p-3 rounded-lg bg-red-500/10 text-red-400">
            Gagal memuat task: {taskError}
          </div>
        )}

        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "all",         label: `Semua (${counts.all})` },
            { value: "pending",     label: `Pending (${counts.pending})` },
            { value: "in_progress", label: `In Progress (${counts.in_progress})` },
            { value: "overdue",     label: `Overdue (${counts.overdue})` },
            { value: "completed",   label: `Selesai (${counts.completed})` },
          ].map(s => (
            <button key={s.value} onClick={() => setFilterStatus(s.value)}
              className={`text-xs px-3 py-1.5 rounded-lg transition ${filterStatus === s.value ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
              style={filterStatus !== s.value ? { background: "var(--surface)", border: "1px solid var(--border)" } : {}}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Task Cards */}
        {loading ? (
          <div className="text-center py-8 text-slate-600 text-sm">Memuat...</div>
        ) : filtered.length === 0 && !taskError ? (
          <div className="text-center py-12 text-slate-600 text-sm">Tidak ada task</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => {
              const prio = PRIORITIES.find(p => p.value === a.priority) || PRIORITIES[1]
              const overdue = isOverdue(a)
              const isAssignee = a.assigned_to === user?.id
              const canEdit = isAdmin || isAssignee
              const assignee = users.find(u => u.id === a.assigned_to)
              return (
                <div key={a.id} className="rounded-xl p-4 space-y-3"
                  style={{ background: "var(--surface)", border: `1px solid ${overdue ? "#7f1d1d" : "var(--border)"}` }}>

                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${a.status === "completed" ? "text-slate-500 line-through" : "text-white"}`}>
                          {a.title}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${prio.color}`}>{prio.label}</span>
                      </div>
                      {a.description && (
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed whitespace-pre-wrap">{a.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {canEdit && (
                        <button onClick={() => openEdit(a)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition"
                          title="Edit task">
                          <Edit2 size={13} />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => setConfirmDeleteId(a.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Hapus task">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Meta: assignee + deadline */}
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    {assignee && (
                      <span className="text-slate-500">👤 {assignee.name}</span>
                    )}
                    {a.deadline && (
                      <span className={overdue ? "text-red-400 font-semibold" : "text-slate-500"}>
                        ⏰ {a.deadline}{overdue ? " — Terlambat!" : ""}
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="flex items-center gap-2">
                    {(() => {
                      const effectiveStatus = overdue ? "overdue" : a.status
                      const st = STATUSES.find(s => s.value === effectiveStatus) || STATUSES[0]
                      const Icon = st.icon
                      const bg =
                        effectiveStatus === "completed"   ? "bg-green-500/15 text-green-400 border-green-500/30" :
                        effectiveStatus === "in_progress" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
                        effectiveStatus === "overdue"     ? "bg-red-500/15 text-red-400 border-red-500/30" :
                                                           "bg-slate-500/15 text-slate-400 border-slate-500/30"
                      return (
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${bg}`}>
                          <Icon size={11} />
                          {st.label}
                        </span>
                      )
                    })()}
                    {(a as Activity & { notes?: string }).notes && (
                      <span className="text-xs text-slate-500 italic truncate max-w-[160px]">
                        &ldquo;{(a as Activity & { notes?: string }).notes}&rdquo;
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* WIG Section */}
        {wigs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target size={14} style={{ color: "#E84500" }} />
              <h2 className="text-sm font-semibold text-white">WIG — Wildly Important Goals</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {wigs.map((w, i) => {
                const keys = Object.keys(w).filter(k => !["id", "created_at", "updated_at"].includes(k))
                return (
                  <div key={w.id || i} className="rounded-xl p-4"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    {keys.map(k => (
                      <div key={k} className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-slate-500 capitalize">{k.replace(/_/g, " ")}</span>
                        <span className="text-xs font-medium text-white">{String(w[k] ?? "—")}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tambah Task Modal */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Tambah Task</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Judul Task</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required placeholder="e.g. Follow up konsumen X"
                  className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>

              {/* Hunter toggle buttons */}
              <div>
                <label className="text-xs text-slate-500 block mb-2">
                  Assign ke Sales Hunter
                  {form.assignedHunters.length > 0 && (
                    <span className="ml-2 text-blue-400 font-medium">({form.assignedHunters.length} dipilih)</span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {hunters.length === 0 ? (
                    <span className="text-xs text-slate-600 italic">Tidak ada hunter aktif</span>
                  ) : hunters.map(u => {
                    const selected = form.assignedHunters.includes(u.id)
                    return (
                      <button key={u.id} type="button"
                        onClick={() => setForm(f => ({
                          ...f,
                          assignedHunters: selected
                            ? f.assignedHunters.filter(id => id !== u.id)
                            : [...f.assignedHunters, u.id],
                        }))}
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${
                          selected
                            ? "text-white border-blue-500"
                            : "text-slate-400 hover:text-white hover:border-slate-500 border-slate-700"
                        }`}
                        style={selected ? { background: "#2563eb" } : { background: "var(--surface2)" }}>
                        {u.name.split(" ")[0]}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Deskripsi</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={5} className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none resize-none"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Deadline</label>
                  <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Prioritas</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <Modal onClose={() => setEditingTask(null)}>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Edit Task</h3>
            <p className="text-xs text-slate-500 mb-4">
              {isAdmin ? "Edit semua detail task" : "Update status task kamu"}
            </p>
            <form onSubmit={handleEditSave} className="space-y-3">
              {isAdmin && (
                <>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Judul Task</label>
                    <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      required className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Deskripsi</label>
                    <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      rows={2} className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none resize-none"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Assign ke Hunter</label>
                    <select value={editForm.assigned_to} onChange={e => setEditForm(f => ({ ...f, assigned_to: e.target.value }))}
                      className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                      <option value="">— Tidak di-assign —</option>
                      {hunters.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Deadline</label>
                      <input type="date" value={editForm.deadline} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
                        className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Prioritas</label>
                      <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                        className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none"
                        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                        {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Status — visible for both admin and assignee, overdue excluded */}
              <div>
                <label className="text-xs text-slate-500 block mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.filter(s => s.value !== "overdue").map(s => {
                    const selected = editForm.status === s.value
                    return (
                      <button key={s.value} type="button"
                        onClick={() => setEditForm(f => ({ ...f, status: s.value }))}
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${
                          selected ? "text-white border-transparent" : "text-slate-400 hover:text-white border-slate-700"
                        }`}
                        style={{
                          background: selected
                            ? s.value === "completed"   ? "#16a34a"
                            : s.value === "in_progress" ? "#2563eb"
                            :                            "#475569"
                            : "var(--surface2)",
                        }}>
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Notes — hunter/assignee only */}
              {!isAdmin && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Notes / Update</label>
                  <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3} placeholder="Tambahkan catatan progress..."
                    className="w-full text-sm px-3 py-2 rounded-lg text-white outline-none resize-none"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditingTask(null)}
                  className="flex-1 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      {confirmDeleteId && (
        <ConfirmModal
          title="Hapus Task?"
          message="Task ini akan dihapus permanen dan tidak bisa dikembalikan."
          confirmLabel="Hapus"
          onConfirm={() => { deleteActivity(confirmDeleteId); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </DashboardShell>
  )
}
