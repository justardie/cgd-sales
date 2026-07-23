"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { loginUser, saveSession } from "@/lib/auth"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

type LoginMode = "sales" | "telemarketing" | "task_force"

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [mode, setMode] = useState<LoginMode>("sales")
  const [name, setName] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [salesMembers, setSalesMembers] = useState<string[]>([])
  const [tmMembers, setTmMembers] = useState<string[]>([])
  const [tfMembers, setTfMembers] = useState<string[]>([])

  useEffect(() => {
    supabase.from("users").select("name")
      .in("role", ["hunter", "admin"]).eq("status", "active").order("name")
      .then(({ data }) => { if (data) setSalesMembers([...new Set(data.map((u: { name: string }) => u.name))]) })
    // TM toggle: sales_person with has_tm_access=true  +  Kadek (role=admin_dgm)
    supabase.from("users").select("name")
      .or("has_tm_access.eq.true,role.eq.dgm,role.eq.admin_dgm").eq("status", "active").order("name")
      .then(({ data }) => { if (data) setTmMembers([...new Set(data.map((u: { name: string }) => u.name))]) })
    supabase.from("users").select("name")
      .eq("role", "task_force").eq("status", "active").order("name")
      .then(({ data }) => { if (data) setTfMembers([...new Set(data.map((u: { name: string }) => u.name))]) })
  }, [])

  const teamMembers = mode === "sales" ? salesMembers : mode === "task_force" ? tfMembers : tmMembers

  const switchMode = (m: LoginMode) => {
    setMode(m); setName(""); setPin(""); setError("")
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) { setError("Pilih nama kamu"); return }
    if (!pin)  { setError("Masukkan PIN kamu"); return }
    setLoading(true); setError("")
    const user = await loginUser(name, pin)
    if (!user) {
      setError("PIN salah atau nama tidak ditemukan. Hubungi admin.")
      setLoading(false); return
    }
    saveSession(user)
    setUser(user)
    // Route by role
    if (user.role === "dgm" || user.role === "admin_dgm") router.push("/funnel")
    else if (user.role === "task_force") router.push("/task-force")
    else router.push("/")
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "#06101f" }}
    >
      <style>{`
        @keyframes cgd-float1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(70px,50px) scale(1.12); }
          66%      { transform: translate(-40px,80px) scale(0.93); }
        }
        @keyframes cgd-float2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-60px,-40px) scale(1.08); }
          70%      { transform: translate(50px,-60px) scale(0.9); }
        }
        @keyframes cgd-float3 {
          0%,100% { transform: translate(0,0) scale(1); }
          30%      { transform: translate(50px,-70px) scale(1.18); }
          60%      { transform: translate(-70px,30px) scale(0.95); }
        }
        @keyframes cgd-float4 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(30px,-40px) scale(1.1); }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(234,92,0,0.18) 0%, transparent 65%)",
          top:"-20%", left:"-15%", filter:"blur(48px)",
          animation:"cgd-float1 14s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", width:600, height:600, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(251,146,60,0.12) 0%, transparent 65%)",
          bottom:"-15%", right:"-10%", filter:"blur(56px)",
          animation:"cgd-float2 18s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", width:450, height:450, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(99,60,220,0.09) 0%, transparent 65%)",
          top:"30%", right:"15%", filter:"blur(64px)",
          animation:"cgd-float3 22s ease-in-out infinite" }}/>
        <div style={{ position:"absolute", width:350, height:350, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(234,92,0,0.10) 0%, transparent 65%)",
          bottom:"10%", left:"10%", filter:"blur(40px)",
          animation:"cgd-float4 16s ease-in-out infinite" }}/>
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <Image src="/logo.png" alt="Central Group" width={200} height={72}
              style={{ objectFit: "contain", height: "52px", width: "auto" }} priority />
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "rgba(148,163,184,0.7)", letterSpacing: "0.15em" }}>
            MASCOL Division
          </div>
          <div className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.5)" }}>
            Sales CRM Dashboard
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "24px", padding: "32px",
          boxShadow: "0 8px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        }}>

          {/* Mode toggle */}
          <div style={{
            display: "flex", background: "rgba(255,255,255,0.06)",
            borderRadius: "12px", padding: "3px", marginBottom: "22px", gap: "2px",
          }}>
            {([
              { key: "sales",        label: "Sales" },
              { key: "telemarketing",label: "Telemarketing" },
              { key: "task_force",   label: "Non Sales" },
            ] as { key: LoginMode; label: string }[]).map(({ key, label }) => (
              <button key={key} type="button" onClick={() => switchMode(key)} style={{
                flex: 1, padding: "7px 6px", borderRadius: "10px",
                border: "none", cursor: "pointer",
                fontSize: "10px", fontWeight: 600, letterSpacing: "0.03em",
                transition: "all 0.2s",
                background: mode === key ? "rgba(234,92,0,0.85)" : "transparent",
                color: mode === key ? "#fff" : "rgba(148,163,184,0.65)",
                boxShadow: mode === key ? "0 2px 8px rgba(234,92,0,0.35)" : "none",
              }}>
                {label}
              </button>
            ))}
          </div>

          <h2 className="font-bold mb-1"
            style={{ fontSize: "20px", letterSpacing: "-0.5px", color: "#f1f5f9" }}>
            Selamat datang
          </h2>
          <p className="text-sm mb-6" style={{ color: "#94a3b8" }}>
            {mode === "sales"      ? "Pilih nama kamu untuk masuk ke dashboard"
             : mode === "task_force" ? "Login Non Sales"
             : "Login Telemarketing & DGM"}
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5"
                style={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Nama
              </label>
              <select value={name}
                onChange={(e) => { setName(e.target.value); setPin(""); setError("") }}
                className="w-full text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "12px", padding: "10px 14px", color: "#f1f5f9",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(234,92,0,0.7)")}
                onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}>
                <option value="">— Pilih nama —</option>
                {teamMembers.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {name && (
              <div>
                <label className="block text-xs font-semibold mb-1.5"
                  style={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  PIN
                </label>
                <input type="password" inputMode="numeric" maxLength={6}
                  value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-full text-sm outline-none tracking-widest"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px", padding: "10px 14px", color: "#f1f5f9",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(234,92,0,0.7)")}
                  onBlur={(e)  => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                  autoFocus />
              </div>
            )}

            {error && (
              <p className="text-xs font-medium" style={{
                color: "#f87171", background: "rgba(248,113,113,0.12)",
                borderRadius: "8px", padding: "8px 12px",
              }}>{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="w-full text-sm font-semibold text-white transition"
              style={{
                background: loading ? "rgba(148,163,184,0.3)"
                  : "linear-gradient(135deg, #FF8C5A, #FF4D1F)",
                borderRadius: "12px", padding: "11px",
                boxShadow: loading ? "none" : "0 6px 28px rgba(255,106,61,0.40)",
                cursor: loading ? "not-allowed" : "pointer",
                border: "none", opacity: loading ? 0.7 : 1,
              }}>
              {loading ? "Memverifikasi..." : "Masuk"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(148,163,184,0.5)" }}>
          © 2026 PT Central Group Development
        </p>
      </div>
    </div>
  )
}
