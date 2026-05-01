import { supabase } from './supabase'
import { AuthUser } from '@/types'

const PIN_SALT = 'cgd-mascol-2026'

export function hashPin(pin: string): string {
  // Simple hash for 4-digit PIN - use with salt
  let hash = 0
  const str = PIN_SALT + pin
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

export async function loginUser(name: string, pin: string): Promise<AuthUser | null> {
  const pinHash = hashPin(pin)
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role, status, pin_hash')
    .ilike('name', name.trim())
    .eq('pin_hash', pinHash)
    .eq('status', 'active')
    .single()

  if (error || !data) return null
  return { id: data.id, name: data.name, role: data.role, status: data.status }
}

export function saveSession(user: AuthUser) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('cgd_user', JSON.stringify(user))
  }
}

export function getSession(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem('cgd_user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('cgd_user')
  }
}
