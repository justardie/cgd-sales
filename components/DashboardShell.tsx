"use client"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import Sidebar from "./Sidebar"
import Header from "./Header"
import IduladhaDecorations from "./IduladhaDecorations"

const TM_ALLOWED = ["/funnel", "/funnel-summary"]

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { theme } = useTheme()

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return }
    if (!user) return
    // Only pure DGM/telemarketing roles are restricted to funnel pages.
    // sales_person with has_tm_access keeps full access to all sales pages.
    const isTmOnly = user.role === "telemarketing" || user.role === "dgm" || user.role === "admin_dgm"
    if (isTmOnly && !TM_ALLOWED.some((p) => pathname.startsWith(p))) {
      router.replace("/funnel")
    }
  }, [user, loading, pathname, router])

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
    </div>
  )

  if (!user) return null

  return (
    <div className="app-layout">
      {theme === "idul-adha" && <IduladhaDecorations />}
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  )
}
