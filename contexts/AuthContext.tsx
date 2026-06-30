"use client"
import React, { createContext, useContext, useEffect, useState } from 'react'
import { AuthUser } from '@/types'
import { getSession, clearSession } from '@/lib/auth'

interface AuthContextType {
  user: AuthUser | null
  setUser: (u: AuthUser | null) => void
  logout: () => void
  isAdmin: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null, setUser: () => {}, logout: () => {}, isAdmin: false, loading: true
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      const session = getSession()
      if (session) setUserState(session)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const setUser = (u: AuthUser | null) => setUserState(u)

  const logout = () => {
    clearSession()
    setUserState(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isAdmin: user?.role === 'admin', loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
