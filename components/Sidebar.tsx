"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import {
  LayoutDashboard, MapPin, TrendingUp, DollarSign,
  CheckSquare, Users, LogOut, Shield,
  MessageSquare, BarChart2, Sun, Moon,
} from "lucide-react"

const ALL_NAV = [
  { href: "/",           label: "Overview",    icon: LayoutDashboard },
  { href: "/visit",      label: "Visit",        icon: MapPin },
  { href: "/pipeline",   label: "Pipeline",     icon: TrendingUp },
  { href: "/closing",    label: "Closing",      icon: DollarSign },
  { href: "/activities", label: "Activities",   icon: CheckSquare },
  { href: "/team",       label: "Team Status",  icon: Users },
  { href: "/lapor-mas",  label: "Lapor Mas",    icon: MessageSquare, adminOnly: true },
  { href: "/report-hod", label: "Report HOD",   icon: BarChart2,     adminOnly: true },
  { href: "/admin",      label: "Admin",         icon: Shield,        adminOnly: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { logout, isAdmin } = useAuth()
  const { theme, toggle } = useTheme()
  const navItems = ALL_NAV.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside className="sidebar-float">
      {/* Theme toggle */}
      <button
        className="sidebar-btn"
        onClick={toggle}
        title={theme === "dark" ? "Light Mode" : "Dark Mode"}
      >
        {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="sidebar-divider" />

      {/* Nav icons */}
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`sidebar-btn${pathname === href ? " sidebar-btn--active" : ""}`}
          title={label}
        >
          <Icon size={16} />
        </Link>
      ))}

      <div className="sidebar-divider" />

      {/* Logout */}
      <button
        className="sidebar-btn sidebar-btn--logout"
        onClick={logout}
        title="Keluar"
      >
        <LogOut size={16} />
      </button>
    </aside>
  )
}
