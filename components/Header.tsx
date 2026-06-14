"use client"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { LogOut, Shield, MessageSquare } from "lucide-react"

const SALES_NAV = [
  { href: "/",               label: "Overview"                           },
  { href: "/pipeline",       label: "Pipeline"                           },
  { href: "/closing",        label: "Closing"                            },
  { href: "/team",           label: "Team Status"                        },
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

  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const role = user?.role ?? ""
  const isTm = role === "telemarketing" || role === "dgm" || role === "admin_dgm"
  const isTf = role === "task_force"
  const hasTmAccess = user?.has_tm_access ?? false

  const navItems = isTm
    ? TM_NAV
    : isTf
    ? TF_NAV
    : SALES_NAV.filter((item) => {
        if (item.funnelAccess && role !== "hunter" && !hasTmAccess && !isAdmin) return false
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

  return (
    <header className="app-header">
      <div className="header-logo">
        <Image
          src="/logo.png"
          alt="CGD"
          width={140}
          height={52}
          style={{ objectFit: "contain", height: "44px", width: "auto" }}
          priority
        />
      </div>

      <nav className="header-nav" aria-label="Main navigation">
        {navItems.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-pill${pathname === href ? " nav-pill--active" : ""}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="header-right">
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
