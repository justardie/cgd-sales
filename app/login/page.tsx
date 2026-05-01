"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser, saveSession } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Masukkan nama'); return }
    if (pin.length !== 4) { setError('PIN harus 4 digit'); return }
    setLoading(true)
    setError('')
    const user = await loginUser(name, pin)
    if (!user) {
      setError('Nama atau PIN salah')
      setLoading(false)
      return
    }
    saveSession(user)
    setUser(user)
    router.push('/')
  }

  const handlePinInput = (val: string) => {
    if (/^\d{0,4}$/.test(val)) setPin(val)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-1">PT Central Group Development</div>
          <h1 className="text-2xl font-bold text-white">MASCOL Division</h1>
          <div className="text-sm text-slate-500 mt-1">Weekly Report Dashboard</div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold text-white mb-5">Masuk ke Dashboard</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Nama</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">PIN (4 digit)</label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={e => handlePinInput(e.target.value)}
                placeholder="••••"
                maxLength={4}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:ring-2 focus:ring-blue-500 tracking-widest text-center text-xl"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-600 mt-4">© 2026 PT Central Group Development</p>
      </div>
    </div>
  )
}
