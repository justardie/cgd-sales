"use client"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import { Bell, Sun, Moon, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"


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

  const [profileOpen, setProfileOpen] = useState(false)
  const [taskCount,   setTaskCount]   = useState(0)
  const profileRef = useRef<HTMLDivElement>(null)

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
    }
    if (profileOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [profileOpen])

  return (
    <header className="app-header">
      <div className="header-logo">
        <Image
          src={theme === "pearl" || theme === "sand" ? "/logo-dark.png" : "/logo.png"}
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
                {theme === "midnight" || theme === "ocean" ? <Sun size={14} /> : <Moon size={14} />}
                <span>{theme === "midnight" || theme === "ocean" ? "Light Mode" : "Dark Mode"}</span>
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
