import { supabase } from './supabase'
import { AuthUser } from '@/types'

// Fallback aliases for renamed users — tries each variant until one matches the DB
// Login dropdown now fetches exact DB names, so these are safety nets only
const NAME_ALIASES: Record<string, string[]> = {
  'Rika Sanusi': ['Rika Sanusi', 'Asun', 'Rika Sanusi (Asun)'],
}

const SESSION_KEY = 'cgd_user'

export async function loginUser(name: string, pin?: string): Promise<AuthUser | null> {
  const namesToTry = NAME_ALIASES[name] ?? [name]
  for (const n of namesToTry) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, status, pin_hash, has_tm_access')
      .ilike('name', n.trim())
      .eq('status', 'active')
      .single()
    if (error || !data) continue
    // All roles with a pin_hash set require PIN verification
    if (data.pin_hash) {
      if (!pin || pin !== data.pin_hash) return null
    }
    return { id: data.id, name: data.name, role: data.role, status: data.status, has_tm_access: data.has_tm_access ?? false }
  }
  return null
}

export function saveSession(user: AuthUser) {
  if (typeof window !== 'undefined') localStorage.setItem(SESSION_KEY, JSON.stringify(user))
}

export function getSession(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const user = JSON.parse(raw) as AuthUser
    localStorage.setItem(SESSION_KEY, raw)
    sessionStorage.removeItem(SESSION_KEY)
    return user
  } catch {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}
