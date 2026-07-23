"use client"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { useStaleLeads } from "@/lib/useStaleLeads"
import { useAuth } from "@/contexts/AuthContext"

const SPOTLIGHT_SEEN_KEY_PREFIX = "cgd-pipeline-notif-intro-seen:"
const SPOTLIGHT_PAD = 8

export default function NotificationBell() {
  const { user } = useAuth()
  const { staleLeads } = useStaleLeads()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showSpotlight, setShowSpotlight] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const bellBtnRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    queueMicrotask(() => setMounted(true))
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  // Show the "new feature" spotlight once per user, until dismissed.
  useEffect(() => {
    if (!user) return
    if (localStorage.getItem(SPOTLIGHT_SEEN_KEY_PREFIX + user.id)) return
    const timer = setTimeout(() => setShowSpotlight(true), 700)
    return () => clearTimeout(timer)
  }, [user])

  useEffect(() => {
    if (!showSpotlight) return
    function updateRect() {
      if (bellBtnRef.current) setRect(bellBtnRef.current.getBoundingClientRect())
    }
    updateRect()
    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect, true)
    return () => {
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
    }
  }, [showSpotlight])

  function dismissSpotlight() {
    setShowSpotlight(false)
    if (user) localStorage.setItem(SPOTLIGHT_SEEN_KEY_PREFIX + user.id, "1")
  }

  function goToLead(id: string) {
    setOpen(false)
    if (pathname === "/pipeline") {
      // Already there — a route change to the same path wouldn't remount the page,
      // so tell it directly instead of relying on a (no-op) query string change.
      window.dispatchEvent(new CustomEvent("pipeline:highlightLead", { detail: { id } }))
    } else {
      router.push(`/pipeline?highlight=${id}`)
    }
  }

  const captionLeft = rect ? Math.min(Math.max(12, rect.left - 100), window.innerWidth - 272) : 0

  return (
    <div className="user-profile-wrap" ref={wrapRef}>
      <button
        ref={bellBtnRef}
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

      {mounted && showSpotlight && rect && createPortal(
        <>
          {/* Dismiss-only catcher covering the whole screen */}
          <div onClick={dismissSpotlight} style={{ position: "fixed", inset: 0, zIndex: 999, cursor: "pointer" }} />

          {/* Spotlight ring — the only clickable "hole"; clicking it opens the dropdown */}
          <div
            onClick={() => { dismissSpotlight(); setOpen(true) }}
            style={{
              position: "fixed",
              top: rect.top - SPOTLIGHT_PAD,
              left: rect.left - SPOTLIGHT_PAD,
              width: rect.width + SPOTLIGHT_PAD * 2,
              height: rect.height + SPOTLIGHT_PAD * 2,
              borderRadius: "50%",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.7), 0 0 0 3px var(--accent)",
              zIndex: 1000,
              cursor: "pointer",
            }}
          />

          {/* Caption bubble */}
          <div
            style={{
              position: "fixed",
              top: rect.bottom + 16,
              left: captionLeft,
              maxWidth: 260,
              zIndex: 1001,
              background: "var(--surface)",
              border: "1px solid var(--border-medium)",
              borderRadius: 14,
              padding: "14px 16px",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div className="text-sm font-semibold" style={{ color: "var(--text-primary)", marginBottom: 4 }}>
              🔔 Fitur baru: Notifikasi Lead Stuck
            </div>
            <div className="text-xs" style={{ color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 10 }}>
              Klik bell ini untuk lihat lead yang belum di-update lebih dari 2 hari.
            </div>
            <button
              onClick={dismissSpotlight}
              className="text-xs font-semibold"
              style={{ background: "var(--accent)", color: "#fff", borderRadius: 8, padding: "6px 12px", border: "none", cursor: "pointer" }}
            >
              Mengerti
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
