import { supabase } from './supabase'
import { AuthUser } from '@/types'

// Fallback aliases for renamed users — tries each variant until one matches the DB
// Login dropdown now fetches exact DB names, so these are safety nets only
const NAME_ALIASES: Record<string, string[]> = {
  'Rika Sanusi': ['Rika Sanusi', 'Asun', 'Rika Sanusi (Asun)'],
}

export async function loginUser(name: string, pin?: string): Promise<AuthUser | null> {
  const namesToTry = NAME_ALIASES[name] ?? [name]
  for (const n of namesToTry) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, status, pin_hash')
      .ilike('name', n.trim())
      .eq('status', 'active')
      .single()
    if (error || !data) continue
    if ((data.role === 'hunter' || data.role === 'admin') && data.pin_hash) {
      if (!pin || pin !== data.pin_hash) return null
    }
    return { id: data.id, name: data.name, role: data.role, status: data.status }
  }
  return null
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
