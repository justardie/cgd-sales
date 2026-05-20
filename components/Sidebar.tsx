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
  { href: "/",               label: "Overview",       icon: LayoutDashboard                    },
  { href: "/visit",          label: "Visit",          icon: MapPin                             },
  { href: "/pipeline",       label: "Pipeline",       icon: TrendingUp                         },
  { href: "/closing",        label: "Closing",        icon: DollarSign                         },
  { href: "/activities",     label: "Activities",     icon: CheckSquare                        },
  { href: "/team",           label: "Team Status",    icon: Users                              },
  { href: "/funnel",         label: "Leads Funnel",   icon: Filter,     hunterOnly: true       },
  { href: "/funnel-summary", label: "Funnel Summary", icon: PieChart,   hunterOnly: true       },
  { href: "/lapor-mas",      label: "Lapor Mas",      icon: MessageSquare, adminOnly: true     },
  { href: "/report-hod",     label: "Report HOD",     icon: BarChart2,     adminOnly: true     },
  { href: "/admin",          label: "Admin",          icon: Shield,        adminOnly: true     },
]

const TM_NAV = [
  { href: "/funnel",         label: "Leads Funnel",   icon: Filter  },
  { href: "/funnel-summary", label: "Funnel Summary", icon: PieChart },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, isAdmin } = useAuth()
  const role = user?.role ?? ""
  const isTm = role === "telemarketing" || role === "dgm"

  const items = isTm
    ? TM_NAV
    : SALES_NAV.filter((item) => {
        if (item.adminOnly  && !isAdmin)             return false
        if (item.hunterOnly && role !== "hunter")     return false
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
