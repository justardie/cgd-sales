import { supabase } from './supabase'
import { AuthUser } from '@/types'

export async function loginUser(name: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role, status')
    .ilike('name', name.trim())
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
