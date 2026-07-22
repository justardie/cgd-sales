"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { useStaleLeads } from "@/lib/useStaleLeads"

export default function NotificationBell() {
  const { staleLeads } = useStaleLeads()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  function goToLead(id: string) {
    setOpen(false)
    router.push(`/pipeline?highlight=${id}`)
  }

  return (
    <div className="user-profile-wrap" ref={wrapRef}>
      <button
        className="header-icon-btn"
        style={{ position: "relative" }}
        onClick={() => setOpen(v => !v)}
        title={staleLeads.length > 0 ? `${staleLeads.length} lead stuck` : "Tidak ada lead stuck"}
      >
        <Bell size={16} />
        {staleLeads.length > 0 && (
          <span className="bell-badge">{staleLeads.length > 9 ? "9+" : staleLeads.length}</span>
        )}
      </button>

      {open && (
        <div className="profile-dropdown" style={{ minWidth: 260 }}>
          <div className="px-2 py-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            Lead Stuck {staleLeads.length > 0 ? `(${staleLeads.length})` : ""}
          </div>
          {staleLeads.length === 0 ? (
            <div className="px-3 py-4 text-xs text-center" style={{ color: "var(--text-muted)" }}>
              Semua lead aktif sudah di-update 🎉
            </div>
          ) : (
            <>
              {staleLeads.slice(0, 8).map(lead => (
                <button key={lead.id} className="profile-dropdown-item" onClick={() => goToLead(lead.id)} style={{ display: "block" }}>
                  <span style={{ display: "block", fontWeight: 600 }}>{lead.name || "—"}</span>
                  <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>
                    {lead.project || "—"} · {lead.days} hari tanpa update
                  </span>
                </button>
              ))}
              {staleLeads.length > 8 && (
                <div className="px-3 py-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  +{staleLeads.length - 8} lainnya
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
