"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutDashboard, MapPin, TrendingUp, DollarSign,
  CheckSquare, Users, Shield, MessageSquare, BarChart2,
} from "lucide-react"

const ALL_NAV = [
  { href: "/",           label: "Overview",   icon: LayoutDashboard },
  { href: "/visit",      label: "Visit",       icon: MapPin },
  { href: "/pipeline",   label: "Pipeline",    icon: TrendingUp },
  { href: "/closing",    label: "Closing",     icon: DollarSign },
  { href: "/activities", label: "Activities",  icon: CheckSquare },
  { href: "/team",       label: "Team Status", icon: Users },
  { href: "/lapor-mas",  label: "Lapor Mas",   icon: MessageSquare, adminOnly: true },
  { href: "/report-hod", label: "Report HOD",  icon: BarChart2,     adminOnly: true },
  { href: "/admin",      label: "Admin",        icon: Shield,        adminOnly: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()
  const navItems = ALL_NAV.filter((item) => !item.adminOnly || isAdmin)

  return (
    <aside className="sidebar-float">
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
    </aside>
  )
}
