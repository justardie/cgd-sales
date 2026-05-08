"use client"
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  LayoutDashboard, MapPin, TrendingUp, DollarSign,
  CheckSquare, Users, LogOut, ChevronRight, Shield,
  MessageSquare, BarChart2, Sun, Moon,
} from 'lucide-react'

const ALL_NAV_ITEMS = [
  { href: '/',           label: 'Overview',   icon: LayoutDashboard },
  { href: '/visit',      label: 'Visit',       icon: MapPin },
  { href: '/pipeline',   label: 'Pipeline',    icon: TrendingUp },
  { href: '/closing',    label: 'Closing',     icon: DollarSign },
  { href: '/activities', label: 'Activities',  icon: CheckSquare },
  { href: '/team',       label: 'Team Status', icon: Users },
  { href: '/lapor-mas',  label: 'Lapor Mas',   icon: MessageSquare, adminOnly: true },
  { href: '/report-hod', label: 'Report HOD',  icon: BarChart2,     adminOnly: true },
  { href: '/admin',      label: 'Admin',       icon: Shield,        adminOnly: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout, isAdmin } = useAuth()
  const { theme, toggle } = useTheme()
  const navItems = ALL_NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 w-56 flex flex-col z-50"
      style={{ background: '#111827', borderRight: '1px solid #1e2d45' }}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b" style={{ borderColor: '#1e2d45' }}>
        <Image src="/logo.png" alt="Central Group" width={160} height={60} style={{ objectFit: 'contain' }} priority />
        <div className="mt-2 text-xs text-slate-400 font-medium">MASCOL Division</div>
        <div className="mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400">
          CRM Sales
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              style={active ? { background: '#E84500' } : {}}
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={12} />}
            </Link>
          )
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="px-4 py-3 border-t" style={{ borderColor: '#1e2d45' }}>
        <button
          onClick={toggle}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition"
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* User */}
      <div className="px-4 py-4 border-t" style={{ borderColor: '#1e2d45' }}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: '#E84500', color: '#fff' }}
          >
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate max-w-[110px]">{user?.name}</div>
            <div className="text-[10px] text-slate-500 capitalize">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut size={13} />
          Keluar
        </button>
      </div>
    </aside>
  )
}
