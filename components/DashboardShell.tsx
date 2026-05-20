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
    const isTm = user.role === "telemarketing" || user.role === "dgm"
    if (isTm && !TM_ALLOWED.some((p) => pathname.startsWith(p))) {
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
