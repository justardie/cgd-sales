"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { loginUser, saveSession } from "@/lib/auth"
import { useAuth } from "@/contexts/AuthContext"

const TEAM_MEMBERS = [
  "Ardie",
  "Lyndon Sumarli",
  "Jimmy Darmadi",
  "Firyal Badriyyah",
  "Aida (Rosmaida)",
  "Aldo (Rinaldo)",
  "Frans",
  "Andre",
  "Prediman",
  "Ellen",
  "Rika Sanusi",
]

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) { setError("Pilih nama kamu"); return }
    setLoading(true)
    setError("")
    const user = await loginUser(name)
    if (!user) {
      setError("Nama tidak ditemukan. Hubungi admin.")
      setLoading(false)
      return
    }
    saveSession(user)
    setUser(user)
    router.push("/")
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <Image
              src="/logo.png"
              alt="Central Group"
              width={200}
              height={72}
              style={{ objectFit: "contain", height: "52px", width: "auto" }}
              priority
            />
          </div>
          <div
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)", letterSpacing: "0.15em" }}
          >
            MASCOL Division
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Sales CRM Dashboard
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            padding: "32px",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <h2
            className="font-bold mb-1"
            style={{ fontSize: "20px", letterSpacing: "-0.5px", color: "var(--text-primary)" }}
          >
            Selamat datang
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Pilih nama kamu untuk masuk ke dashboard
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                Nama
              </label>
              <select
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm outline-none"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  color: "var(--text-primary)",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-medium)")}
              >
                <option value="">— Pilih nama kamu —</option>
                {TEAM_MEMBERS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p
                className="text-xs font-medium"
                style={{ color: "var(--red)", background: "var(--red-soft)", borderRadius: "8px", padding: "8px 12px" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-sm font-semibold text-white transition"
              style={{
                background: loading
                  ? "var(--text-muted)"
                  : "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
                borderRadius: "12px",
                padding: "11px",
                boxShadow: loading ? "none" : "var(--shadow-accent)",
                cursor: loading ? "not-allowed" : "pointer",
                border: "none",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Memverifikasi..." : "Masuk ke Dashboard"}
            </button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--text-muted)" }}
        >
          © 2026 PT Central Group Development
        </p>
      </div>
    </div>
  )
}
