"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Search, Bell } from "lucide-react"

const BASE_NAV = [
  { href: "/",           label: "Overview"    },
  { href: "/visit",      label: "Visit"       },
  { href: "/pipeline",   label: "Pipeline"    },
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
  const { user, isAdmin } = useAuth()

  const navItems = [...BASE_NAV, ...(isAdmin ? ADMIN_NAV : [])]
  const initials = user?.name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?"

  return (
    <header className="app-header">
      <div className="header-logo">
        <Image
          src="/logo.png"
          alt="CGD"
          width={90}
          height={32}
          style={{ objectFit: "contain", height: "28px", width: "auto" }}
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
        <button className="header-icon-btn" aria-label="Cari">
          <Search size={15} />
        </button>
        <button className="header-icon-btn" aria-label="Notifikasi">
          <Bell size={15} />
        </button>
        <div className="user-profile-btn">
          <div className="user-profile-text">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role} · CGD</span>
          </div>
          <div className="user-avatar">{initials}</div>
        </div>
      </div>
    </header>
  )
}
