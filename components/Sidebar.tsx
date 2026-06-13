"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutDashboard, MapPin, TrendingUp, DollarSign,
  CheckSquare, Users, Shield, MessageSquare, BarChart2,
  Filter, PieChart,
} from "lucide-react"

const SALES_NAV = [
  { href: "/",               label: "Overview",       icon: LayoutDashboard                      },
  { href: "/visit",          label: "Visit",          icon: MapPin                               },
  { href: "/pipeline",       label: "Pipeline",       icon: TrendingUp                           },
  { href: "/closing",        label: "Closing",        icon: DollarSign                           },
  { href: "/activities",     label: "Activities",     icon: CheckSquare                          },
  { href: "/team",           label: "Team Status",    icon: Users                                },
  { href: "/funnel",         label: "Leads Funnel",   icon: Filter,     funnelAccess: true       },
  { href: "/funnel-summary", label: "Funnel Summary", icon: PieChart,   funnelAccess: true       },
  { href: "/lapor-mas",      label: "Lapor Mas",      icon: MessageSquare, adminOnly: true       },
  { href: "/report-hod",     label: "Report HOD",     icon: BarChart2,     adminOnly: true       },
  { href: "/admin",          label: "Admin",          icon: Shield,        adminOnly: true       },
]

const TM_NAV = [
  { href: "/funnel",         label: "Leads Funnel",   icon: Filter  },
  { href: "/funnel-summary", label: "Funnel Summary", icon: PieChart },
]

const TF_NAV = [
  { href: "/",          label: "Overview",    icon: LayoutDashboard },
  { href: "/pipeline",  label: "Pipeline",    icon: TrendingUp      },
  { href: "/closing",   label: "Closing",     icon: DollarSign      },
  { href: "/team",      label: "Team Status", icon: Users           },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, isAdmin } = useAuth()
  const role = user?.role ?? ""
  const isTm = role === "telemarketing" || role === "dgm" || role === "admin_dgm"
  const isTf = role === "task_force"

  const hasTmAccess = user?.has_tm_access ?? false

  const items = isTm
    ? TM_NAV
    : isTf
    ? TF_NAV
    : SALES_NAV.filter((item) => {
        if (item.adminOnly    && !isAdmin)                                      return false
        if (item.funnelAccess && role !== "hunter" && !hasTmAccess && !isAdmin) return false
        return true
      })

  return (
    <aside className="sidebar-float">
      {items.map(({ href, label, icon: Icon }) => (
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
