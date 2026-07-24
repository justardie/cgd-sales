"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import DashboardShell from "@/components/DashboardShell"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_ACCESS } from "@/lib/role-access"

export default function RoleAccessPage() {
  const { isAdmin, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/")
  }, [isAdmin, loading, router])

  if (!isAdmin) {
    return (
      <DashboardShell>
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">Akses ditolak</div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white">
            <ShieldCheck size={20} className="text-purple-400" /> Setting Role &amp; Akses Data
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Detail role, menu, cakupan data, dan cara setting user di sistem CGD Sales.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "var(--surface2)" }}>
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Menu yang Diakses</th>
                  <th className="px-4 py-3 font-semibold">Data yang Diakses</th>
                  <th className="px-4 py-3 font-semibold">Setting / Catatan</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_ACCESS.map((item) => (
                  <tr key={item.role} className="align-top" style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-white">{item.role}</td>
                    <td className="min-w-[260px] px-4 py-4 text-slate-300">{item.menu}</td>
                    <td className="min-w-[320px] px-4 py-4 text-slate-300">{item.data}</td>
                    <td className="min-w-[320px] px-4 py-4 text-slate-400">{item.setting}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl p-4 text-xs text-slate-400" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          Catatan: Telemarketing bukan role database terpisah dari Admin. Saat Admin memilih Telemarketing,
          sistem menyimpan user sebagai Sales Person dengan akses telemarketing aktif.
        </div>
      </div>
    </DashboardShell>
  )
}
