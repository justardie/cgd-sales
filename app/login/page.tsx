"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginUser, saveSession } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'

const TEAM_MEMBERS = [
  'Ardie',
  'Roy Ferdinand H.',
  'Lyndon Sumarli',
  'Jimmy Darmadi',
  'Firyal Badriyyah',
  'Aida (Rosmaida)',
  'Aldo (Rinaldo)',
  'Frans',
  'Andre',
  'Prediman',
  'Ellen',
  'Asun',
]

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) { setError('Pilih nama kamu'); return }
    setLoading(true)
    setError('')
    const user = await loginUser(name)
    if (!user) {
      setError('Nama tidak ditemukan. Hubungi admin.')
      setLoading(false)
      return
    }
    saveSession(user)
    setUser(user)
    router.push('/')
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
              <select
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
              >
                <option value="">-- Pilih nama kamu --</option>
                {TEAM_MEMBERS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
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
