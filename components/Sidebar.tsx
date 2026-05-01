"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, MapPin, TrendingUp, DollarSign,
  CheckSquare, Users, LogOut, ChevronRight, Shield
} from 'lucide-react'

const ALL_NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/visit', label: 'Visit', icon: MapPin },
  { href: '/pipeline', label: 'Pipeline', icon: TrendingUp },
  { href: '/closing', label: 'Closing', icon: DollarSign },
  { href: '/activities', label: 'Activities', icon: CheckSquare },
  { href: '/team', label: 'Team Status', icon: Users },
  { href: '/admin', label: 'Admin', icon: Shield, adminOnly: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout, isAdmin } = useAuth()
  const navItems = ALL_NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-56 flex flex-col z-50"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">PT Central Group Dev</div>
        <div className="text-sm font-bold text-white mt-0.5">MASCOL Division</div>
        <div className="mt-2 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400">
          Weekly Report
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={12} />}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 text-sm font-bold">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-semibold text-white truncate max-w-[120px]">{user?.name}</div>
            <div className="text-[10px] text-slate-500 capitalize">{user?.role}</div>
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition">
          <LogOut size={13} />
          Keluar
        </button>
      </div>
    </aside>
  )
}

