"use client"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import Sidebar from "./Sidebar"
import Header from "./Header"

const TM_ALLOWED = ["/funnel", "/funnel-summary"]
const TF_ALLOWED = ["/", "/pipeline", "/closing", "/team"]

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) { router.replace("/login"); return }
    if (!user) return
    // Only pure DGM/telemarketing roles are restricted to funnel pages.
    // sales_person with has_tm_access keeps full access to all sales pages.
    const isTmOnly = user.role === "telemarketing" || user.role === "dgm" || user.role === "admin_dgm"
    if (isTmOnly && !TM_ALLOWED.some((p) => pathname.startsWith(p))) {
      router.replace("/funnel")
    }
    // Task Force: access overview, pipeline, closing, team only
    const isTaskForceOnly = user.role === "task_force"
    if (isTaskForceOnly && !TF_ALLOWED.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      router.replace("/")
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
      <div className="app-main">
        <Header />
        <main className="app-content">
          {children}
        </main>
      </div>
      <Sidebar />
    </div>
  )
}
