"use client"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

// ─── Types ───────────────────────────────────────────────────
export type AppTheme = "midnight" | "ocean" | "pearl" | "sand"

export const THEMES: {
  id: AppTheme
  name: string
  label: string
  dark: boolean
  accent: string
  bg: string
}[] = [
  { id: "midnight", name: "Midnight", label: "Dark · CGD Orange", dark: true,  accent: "#FF6A3D", bg: "#0C0C0F" },
  { id: "ocean",    name: "Ocean",    label: "Dark · Cyan",       dark: true,  accent: "#06B6D4", bg: "#040912" },
  { id: "pearl",    name: "Pearl",    label: "Light · Orange",    dark: false, accent: "#FF6A3D", bg: "#EDEAE4" },
  { id: "sand",     name: "Sand",     label: "Light · Amber",     dark: false, accent: "#B45309", bg: "#DDD4C4" },
]

// ─── Context ─────────────────────────────────────────────────
const ThemeCtx = createContext<{
  theme: AppTheme
  setTheme: (t: AppTheme) => Promise<void>
  toggle: () => Promise<void>
}>({
  theme: "midnight",
  setTheme: async () => {},
  toggle: async () => {},
})

// ─── Apply theme to <html> element ───────────────────────────
function applyTheme(t: AppTheme) {
  const html = document.documentElement
  html.classList.remove("theme-midnight", "theme-ocean", "theme-pearl", "theme-sand")
  html.classList.toggle("dark", t === "midnight" || t === "ocean")
  html.classList.remove("light")
  html.classList.add(`theme-${t}`)
  localStorage.setItem("cgd-theme-v2", t)
}

const VALID: AppTheme[] = ["midnight", "ocean", "pearl", "sand"]

// ─── Provider ────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("midnight")

  useEffect(() => {
    // 1. Apply saved local theme immediately — avoid flash
    const saved = localStorage.getItem("cgd-theme-v2") as AppTheme | null
    const legacy = localStorage.getItem("cgd-theme")
    if (saved && VALID.includes(saved)) {
      applyTheme(saved); setThemeState(saved)
    } else if (legacy === "light") {
      applyTheme("pearl"); setThemeState("pearl")
    } else {
      applyTheme("midnight"); setThemeState("midnight")
    }

    // 2. Fetch active theme from Supabase (source of truth)
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "app_theme")
      .single()
      .then(({ data }) => {
        if (data?.value && VALID.includes(data.value as AppTheme)) {
          const t = data.value as AppTheme
          applyTheme(t); setThemeState(t)
        }
      })

    // 3. Realtime — all clients update instantly when admin changes theme
    const channel = supabase
      .channel("app_theme_sync")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "app_settings",
        filter: "key=eq.app_theme",
      }, (payload) => {
        const t = (payload.new as { value: string }).value as AppTheme
        if (VALID.includes(t)) { applyTheme(t); setThemeState(t) }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const setTheme = useCallback(async (t: AppTheme) => {
    applyTheme(t)
    setThemeState(t)
    await supabase
      .from("app_settings")
      .upsert({ key: "app_theme", value: t, updated_at: new Date().toISOString() })
  }, [])

  const toggle = useCallback(async () => {
    await setTheme(theme === "midnight" || theme === "ocean" ? "pearl" : "midnight")
  }, [theme, setTheme])

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)
