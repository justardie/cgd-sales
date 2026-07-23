"use client"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import { LogOut, Shield, MessageSquare, Sun, Moon, Users } from "lucide-react"
import NotificationBell from "@/components/NotificationBell"

const SALES_NAV = [
  { href: "/",               label: "Overview"                           },
  { href: "/pipeline",       label: "Pipeline"                           },
  { href: "/closing",        label: "Closing"                            },
  { href: "/unit-special",   label: "Unit Special"                       },
  { href: "/report",         label: "REPORT",        reportAccess: true  },
  { href: "/funnel",         label: "Leads Funnel",  funnelAccess: true  },
  { href: "/funnel-summary", label: "Funnel Summary", funnelAccess: true },
]

const TM_NAV = [
  { href: "/funnel",         label: "Leads Funnel"   },
  { href: "/funnel-summary", label: "Funnel Summary" },
]

const TF_NAV = [
  { href: "/",        label: "Overview"    },
  { href: "/pipeline", label: "Pipeline"   },
  { href: "/closing",  label: "Closing"    },
  { href: "/team",     label: "Team Status"},
]

export default function Header() {
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const navLinkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [glider, setGlider] = useState({ left: 0, width: 0, visible: false })
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)

  const role = user?.role ?? ""
  const isTm = role === "telemarketing" || role === "dgm" || role === "admin_dgm"
  const isTf = role === "task_force"
  const hasTmAccess = user?.has_tm_access ?? false
  const hasPipelineAccess = isAdmin || isTf || role === "hunter" || role === "sales_person"

  const navItems = isTm
    ? TM_NAV
    : isTf
    ? TF_NAV
    : SALES_NAV.filter((item) => {
        if (item.funnelAccess && role !== "hunter" && !hasTmAccess && !isAdmin) return false
        if (item.reportAccess && role !== "hunter" && !isAdmin) return false
        return true
      })

  const initials = user?.name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?"

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    if (profileOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [profileOpen])

  function moveGlider(href: string) {
    const link = navLinkRefs.current[href]
    if (!link) return
    setGlider({ left: link.offsetLeft, width: link.offsetWidth, visible: true })
  }

  useEffect(() => {
    const sync = () => moveGlider(pathname)
    const frame = requestAnimationFrame(sync)
    window.addEventListener("resize", sync)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", sync)
    }
  }, [pathname, role, hasTmAccess, isAdmin])

  return (
    <header className="app-header">
      <div className="header-logo">
        <Image
          src="/logo-dark.png"
          alt="CGD"
          width={140}
          height={52}
          style={{ objectFit: "contain", height: "44px", width: "auto", filter: theme === "dark" ? "brightness(0) invert(1)" : "none" }}
          priority
        />
      </div>

      <nav ref={navRef} className="header-nav" aria-label="Main navigation" onMouseLeave={() => { setHoveredHref(null); moveGlider(pathname) }}>
        <span
          className="nav-glider"
          aria-hidden="true"
          style={{ width: glider.width, transform: `translateX(${glider.left}px)`, opacity: glider.visible ? 1 : 0 }}
        />
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            ref={(node) => { navLinkRefs.current[href] = node }}
            className={`nav-pill${pathname === href && hoveredHref === null ? " nav-pill--active" : ""}`}
            onMouseEnter={() => { setHoveredHref(href); moveGlider(href) }}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="header-right">
        {hasPipelineAccess && <NotificationBell />}
        <div className="user-profile-wrap" ref={profileRef}>
          <button
            className="user-profile-btn"
            onClick={() => setProfileOpen(v => !v)}
          >
            <div className="user-profile-text">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role} · CGD</span>
            </div>
            <div className="user-avatar">{initials}</div>
          </button>

          {profileOpen && (
            <div className="profile-dropdown">
              <div className="theme-toggle" role="group" aria-label="Pilih tema">
                <button
                  type="button"
                  className={`theme-toggle__btn${theme === "light" ? " theme-toggle__btn--active" : ""}`}
                  onClick={() => setTheme("light")}
                  aria-pressed={theme === "light"}
                >
                  <Sun size={13} /><span>Light</span>
                </button>
                <button
                  type="button"
                  className={`theme-toggle__btn${theme === "dark" ? " theme-toggle__btn--active" : ""}`}
                  onClick={() => setTheme("dark")}
                  aria-pressed={theme === "dark"}
                >
                  <Moon size={13} /><span>Dark</span>
                </button>
              </div>
              <div className="profile-dropdown-divider" />
              {!isTm && (
                <Link href="/team" className="profile-dropdown-item" onClick={() => setProfileOpen(false)}>
                  <Users size={14} /><span>Team Status</span>
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link
                    href="/lapor-mas"
                    className="profile-dropdown-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    <MessageSquare size={14} />
                    <span>Lapor Mas</span>
                  </Link>
                  <Link
                    href="/admin"
                    className="profile-dropdown-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Shield size={14} />
                    <span>Admin</span>
                  </Link>
                  <div className="profile-dropdown-divider" />
                </>
              )}
              <button
                className="profile-dropdown-item profile-dropdown-item--danger"
                onClick={logout}
              >
                <LogOut size={14} />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
