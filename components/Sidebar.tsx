"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import {
  LayoutDashboard, TrendingUp, DollarSign,
  Users, Filter, PieChart, Plus,
} from "lucide-react"

const SALES_NAV = [
  { href: "/",               label: "Overview",  icon: LayoutDashboard                      },
  { href: "/pipeline",       label: "Pipeline",  icon: TrendingUp                           },
  { href: "/closing",        label: "Closing",   icon: DollarSign                           },
  { href: "/team",           label: "Team",      icon: Users                                },
  { href: "/funnel",         label: "Funnel",    icon: Filter,     funnelAccess: true       },
  { href: "/funnel-summary", label: "Summary",   icon: PieChart,   funnelAccess: true       },
]

const TM_NAV = [
  { href: "/funnel",         label: "Leads Funnel",   icon: Filter   },
  { href: "/funnel-summary", label: "Funnel Summary", icon: PieChart },
]

const TF_NAV = [
  { href: "/",          label: "Overview",  icon: LayoutDashboard },
  { href: "/pipeline",  label: "Pipeline",  icon: TrendingUp      },
  { href: "/closing",   label: "Closing",   icon: DollarSign      },
  { href: "/team",      label: "Team",      icon: Users           },
]

// Standard 4-item nav (no funnel access)
const STANDARD_NAV = [
  { href: "/",          label: "Overview",  icon: LayoutDashboard },
  { href: "/pipeline",  label: "Pipeline",  icon: TrendingUp      },
  { href: "/closing",   label: "Closing",   icon: DollarSign      },
  { href: "/team",      label: "Team",      icon: Users           },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const role = user?.role ?? ""
  const isTm = role === "telemarketing" || role === "dgm" || role === "admin_dgm"
  const isTf = role === "task_force"
  const hasTmAccess = user?.has_tm_access ?? false
  const hasFunnelAccess = role === "hunter" || hasTmAccess || isAdmin

  // Build left/right items around the center FAB
  // Layout: [left-items] [FAB] [right-items]
  let leftItems: typeof SALES_NAV = []
  let rightItems: typeof SALES_NAV = []
  let showFab = false

  if (isTm) {
    // TM: just 2 items, no FAB
    leftItems  = [TM_NAV[0]]
    rightItems = [TM_NAV[1]]
    showFab    = false
  } else if (isTf) {
    // Non Sales: 4 items + FAB in middle
    leftItems  = [TF_NAV[0], TF_NAV[1]]
    rightItems = [TF_NAV[2], TF_NAV[3]]
    showFab    = true
  } else if (hasFunnelAccess) {
    // Hunter/admin with funnel: 4 core nav items (funnel via header)
    leftItems  = [SALES_NAV[0], SALES_NAV[1]]
    rightItems = [SALES_NAV[2], SALES_NAV[3]]
    showFab    = true
  } else {
    // Standard sales user: 4 items + FAB
    leftItems  = [STANDARD_NAV[0], STANDARD_NAV[1]]
    rightItems = [STANDARD_NAV[2], STANDARD_NAV[3]]
    showFab    = true
  }

  function handleFab() {
    // Navigate to pipeline with ?add=1 to trigger modal
    if (pathname === "/pipeline") {
      // Already on pipeline — dispatch custom event to open modal
      window.dispatchEvent(new CustomEvent("pipeline:openNew"))
    } else {
      router.push("/pipeline?add=1")
    }
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <div className="bottom-nav__inner">
        {/* Left items */}
        {leftItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`bottom-nav__item${isActive(href) ? " bottom-nav__item--active" : ""}`}
          >
            <Icon size={20} className="bottom-nav__icon" />
            <span className="bottom-nav__label">{label}</span>
          </Link>
        ))}

        {/* Center FAB */}
        {showFab && (
          <button
            className="bottom-nav__fab"
            onClick={handleFab}
            aria-label="Tambah Pipeline"
          >
            <Plus size={24} />
          </button>
        )}

        {/* Right items */}
        {rightItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`bottom-nav__item${isActive(href) ? " bottom-nav__item--active" : ""}`}
          >
            <Icon size={20} className="bottom-nav__icon" />
            <span className="bottom-nav__label">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
