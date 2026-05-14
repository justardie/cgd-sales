"use client"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import { useMonth } from "@/contexts/MonthContext"
import { Bell, Sun, Moon, LogOut, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase"

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
const MONTH_PICKER_PATHS = ["/visit", "/closing", "/"]

const BASE_NAV = [
  { href: "/",           label: "Overview"    },
  { href: "/visit",      label: "Visit"       },
  { href: "/pipeline",   label: "Pipeline"    },
  { href: "/potensi",    label: "Potensi"     },
  { href: "/closing",    label: "Closing"     },
  { href: "/activities", label: "Activities"  },
  { href: "/team",       label: "Team Status" },
]

const ADMIN_NAV = [
  { href: "/lapor-mas",  label: "Lapor Mas"  },
  { href: "/report-hod", label: "Report HOD" },
  { href: "/admin",      label: "Admin"      },
]

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAdmin, logout } = useAuth()
  const { theme, toggle } = useTheme()

  const { monthState, setMonthState } = useMonth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [monthOpen,   setMonthOpen]   = useState(false)
  const [taskCount,   setTaskCount]   = useState(0)
  const profileRef = useRef<HTMLDivElement>(null)
  const monthRef   = useRef<HTMLDivElement>(null)

  const showMonthPicker = MONTH_PICKER_PATHS.includes(pathname)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear  = now.getFullYear()

  const monthLabel = monthState.ytd
    ? `YTD ${currentYear}`
    : `${MONTH_NAMES[monthState.month - 1]} ${monthState.year}`

  const navItems = [...BASE_NAV, ...(isAdmin ? ADMIN_NAV : [])]
  const initials = user?.name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?"

  useEffect(() => {
    if (!user) return
    async function fetchTaskCount() {
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", user!.id)
        .neq("status", "completed")
      setTaskCount(count ?? 0)
    }
    fetchTaskCount()
  }, [user])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
      if (monthRef.current  && !monthRef.current.contains(e.target as Node))   setMonthOpen(false)
    }
    if (profileOpen || monthOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [profileOpen, monthOpen])

  return (
    <header className="app-header">
      <div className="header-logo">
        <Image
          src={theme === "light" ? "/logo-dark.png" : "/logo.png"}
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
        {/* Month picker — only shown on relevant pages */}
        {showMonthPicker && (
          <div style={{ position: "relative" }} ref={monthRef}>
            <button
              className="header-icon-btn"
              aria-label="Pilih bulan"
              onClick={() => setMonthOpen(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "0 10px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}
            >
              <Calendar size={14} />
              <span>{monthLabel}</span>
            </button>

            {monthOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "12px", boxShadow: "var(--shadow-lg)",
                minWidth: "160px", zIndex: 300, padding: "6px",
              }}>
                {/* YTD option */}
                <button
                  onClick={() => { setMonthState({ month: currentMonth, year: currentYear, ytd: true }); setMonthOpen(false) }}
                  style={{
                    width: "100%", textAlign: "left", padding: "7px 10px",
                    borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                    background: monthState.ytd ? "var(--accent-soft)" : "transparent",
                    color: monthState.ytd ? "var(--accent)" : "var(--text-secondary)",
                    border: "none", cursor: "pointer",
                  }}>
                  YTD {currentYear}
                </button>
                <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />
                {/* Monthly options — current year */}
                {MONTH_NAMES.map((name, i) => {
                  const m = i + 1
                  const active = !monthState.ytd && monthState.month === m && monthState.year === currentYear
                  return (
                    <button key={m}
                      onClick={() => { setMonthState({ month: m, year: currentYear, ytd: false }); setMonthOpen(false) }}
                      style={{
                        width: "100%", textAlign: "left", padding: "7px 10px",
                        borderRadius: "8px", fontSize: "12px",
                        background: active ? "var(--accent-soft)" : "transparent",
                        color: active ? "var(--accent)" : "var(--text-secondary)",
                        border: "none", cursor: "pointer",
                        opacity: m > currentMonth ? 0.4 : 1,
                      }}>
                      {name} {currentYear}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <button
          className="header-icon-btn"
          aria-label="Notifikasi task"
          onClick={() => router.push("/activities")}
          style={{ position: "relative" }}
        >
          <Bell size={15} />
          {taskCount > 0 && (
            <span className="bell-badge">{taskCount > 9 ? "9+" : taskCount}</span>
          )}
        </button>

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
              <button
                className="profile-dropdown-item"
                onClick={() => { toggle(); setProfileOpen(false) }}
              >
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
              <div className="profile-dropdown-divider" />
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
