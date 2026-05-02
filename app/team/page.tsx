"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import DashboardShell from "@/components/DashboardShell"
import { formatRupiah, getMonthName, pct, spBadgeColor } from "@/lib/utils"
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react"

// Each Sales Hunter has their own Sales Persons.
// Sales Hunters → no SP (Surat Peringatan).
// Sales Persons → SP applies, tracked in team_status_history.
const HUNTERS = [
  {
    name: "Lyndon Sumarli",
    color: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    sp: ["Heriyandi", "Riduan Hasudungan Hutabarat", "Tiar Riki Aryanto", "Mhd Sidiq Abdussalam"],
  },
  {
    name: "Jimmy Darmadi",
    color: "bg-green-500/10 border-green-500/30 text-green-400",
    sp: [],
  },
  {
    name: "Firyal Badriyyah",
    color: "bg-orange-500/10 border-orange-500/30 text-orange-400",
    sp: ["Adi Chandra"],
  },
  {
    name: "Aida (Rosmaida)",
    color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
    sp: ["Achmad Rian", "M. Fadjri Saputra", "Lenni Natalia", "Seprita Rahma", "M. Fiqri", "Vio Wahyuda"],
  },
  {
    name: "Aldo (Rinaldo)",
    color: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    sp: ["Yossi Eka Nofrita", "Rosa Dwi Vanesa", "Abel Shevcenko", "Noer Roelloh", "Muhammad Rayyan", "Ela Magdalena Andrint"],
  },
  {
    name: "Frans",
    color: "bg-pink-500/10 border-pink-500/30 text-pink-400",
    sp: ["M. Amirullah", "Shinta Okvianti", "Nisa Nur fadhila"],
  },
  {
    name: "Andriansyah (Andre)",
    color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
    sp: ["Riezkya Adella", "Risa Opiani", "Ari Kurnia Sandy", "Syarah Mustika", "Kanigia Lubis", "Salsabila Rahman", "Dea Alvony Agista"],
  },
  {
    name: "Prediman",
    color: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400",
    sp: ["Crisna Ardhianysah", "Muhammad Rafie", "Maria Oktavaini", "Gallih Dwi Gumelar"],
  },
  {
    name: "Ellen",
    color: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    sp: ["Amos Marihot", "Ferdinan Bangun", "Nurlela", "Febry Nairi", "Tri Andy Kurniawan"],
  },
  {
    name: "Rika Sanusi (Asun)",
    color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    sp: ["Santoso", "Sentia Julika", "Rio Pratama", "Eka Vitria Lestari"],
  },
]

interface MemberStatus {
  id: string
  name: string
  role_type: "SH" | "SP"
  monthly_target: number
  omset: number
  sp_level: number
  sp_history_id: string | null
}

const now = new Date()

export default function TeamPage() {
  const { user, isAdmin } = useAuth()
  const [members, setMembers] = useState<MemberStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  useEffect(() => { if (user) fetchData() }, [user, month, year])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const allHunterNames = new Set(HUNTERS.map(h => h.name))
  const allSPNames = new Set(HUNTERS.flatMap(h => h.sp))

  async function fetchData() {
    setLoading(true)
    const [usersRes, closingsRes, spRes] = await Promise.all([
      supabase.from("users").select("id,name,monthly_target").eq("status", "active"),
      supabase.from("closings").select("user_id,closing_value").eq("month", month).eq("year", year),
      supabase.from("team_status_history").select("id,user_id,sp_level").eq("month", month).eq("year", year),
    ])

    const omsetMap: Record<string, number> = {}
    ;(closingsRes.data || []).forEach(c => {
      omsetMap[c.user_id] = (omsetMap[c.user_id] || 0) + (c.closing_value || 0)
    })

    const spMap: Record<string, { id: string; sp_level: number }> = {}
    ;(spRes.data || []).forEach(s => { spMap[s.user_id] = { id: s.id, sp_level: s.sp_level } })

    const list: MemberStatus[] = (usersRes.data || [])
      .filter(u => allHunterNames.has(u.name) || allSPNames.has(u.name))
      .map(u => ({
        id: u.id,
        name: u.name,
        role_type: allHunterNames.has(u.name) ? "SH" : "SP",
        monthly_target: u.monthly_target,
        omset: omsetMap[u.id] || 0,
        sp_level: spMap[u.id]?.sp_level ?? 0,
        sp_history_id: spMap[u.id]?.id || null,
      }))

    setMembers(list)
    setLoading(false)
  }

  function getMember(name: string): MemberStatus | undefined {
    return members.find(m => m.name === name)
  }

  async function adjustSP(memberId: string, delta: number, current: number, historyId: string | null) {
    if (!isAdmin) return
    const newLevel = Math.max(0, Math.min(5, current + delta))
    setSaving(memberId)
    if (historyId) {
      await supabase.from("team_status_history").update({ sp_level: newLevel }).eq("id", historyId)
    } else {
      await supabase.from("team_status_history").insert({
        user_id: memberId, month, year,
        sp_level: newLevel,
        reason: delta > 0 ? "Manual increase" : "Manual decrease",
      })
    }
    setSaving(null)
    fetchData()
  }

  function borderColor(color: string) { return color.split(" ")[1] }

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header + Month Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Team Status</h1>
            <p className="text-sm text-slate-500 mt-0.5">SP Level per Sales Person · MASCOL Division</p>
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
          </div>
        </div>

        {/* Hunters Grid */}
        {loading ? (
          <div className="text-center py-12 text-slate-600 text-sm">Memuat data...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {HUNTERS.map(hunter => (
              <div key={hunter.name}
                className={`rounded-xl overflow-hidden border ${borderColor(hunter.color)}`}
                style={{ background: "var(--surface)" }}>

                {/* Hunter Header */}
                <div className={`px-4 py-3 border-b ${borderColor(hunter.color)}`}
                  style={{ background: "var(--surface2)" }}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${hunter.color}`}>SH</span>
                    <span className="text-sm font-semibold text-white">{hunter.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 ml-auto">
                      Sales Hunter
                    </span>
                  </div>
                  {/* Hunter omset */}
                  {(() => {
                    const m = getMember(hunter.name)
                    if (!m) return (
                      <div className="text-xs text-slate-600 mt-1.5">Data belum tersedia</div>
                    )
                    const ach = pct(m.omset, m.monthly_target)
                    return (
                      <div className="mt-2">
                        <div className="text-xs text-slate-500">
                          {formatRupiah(m.omset)} / {formatRupiah(m.monthly_target)}
                          <span className={`ml-2 font-bold ${ach >= 100 ? "text-green-400" : ach >= 70 ? "text-blue-400" : "text-red-400"}`}>
                            {ach}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 rounded-full bg-slate-800 w-full max-w-[200px]">
                          <div className="h-1 rounded-full transition-all"
                            style={{ width: `${Math.min(ach, 100)}%`, background: ach >= 100 ? "#22c55e" : "#6366f1" }} />
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Sales Persons */}
                {hunter.sp.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-600 italic">Tidak ada Sales Person</div>
                ) : (
                  <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {hunter.sp.map(spName => {
                      const m = getMember(spName)

                      // SP not yet in users table
                      if (!m) return (
                        <div key={spName} className="px-4 py-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800 flex-shrink-0">
                            <span className="text-xs font-bold text-slate-500">OK</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-white">{spName}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Sales Person</span>
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">Belum terdaftar di sistem</div>
                          </div>
                        </div>
                      )

                      // SP found in users table
                      return (
                        <div key={spName} className="px-4 py-3 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${spBadgeColor(m.sp_level)}`}>
                            <span className="text-xs font-bold">{m.sp_level > 0 ? `SP${m.sp_level}` : "OK"}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white">{m.name}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Sales Person</span>
                            </div>
                            {m.sp_level > 0 && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                Level SP: <span className="text-red-400 font-semibold">SP{m.sp_level}</span>
                              </div>
                            )}
                          </div>
                          {/* SP ± Controls — admin only */}
                          {isAdmin && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => adjustSP(m.id, -1, m.sp_level, m.sp_history_id)}
                                disabled={m.sp_level <= 0 || saving === m.id}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/10 disabled:opacity-30 transition"
                                title="Turunkan SP">
                                <TrendingDown size={13} />
                              </button>
                              <button
                                onClick={() => adjustSP(m.id, 1, m.sp_level, m.sp_history_id)}
                                disabled={m.sp_level >= 5 || saving === m.id}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition"
                                title="Naikkan SP">
                                <TrendingUp size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
