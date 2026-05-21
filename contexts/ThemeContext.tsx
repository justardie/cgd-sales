"use client"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"

// ─── Types ───────────────────────────────────────────────────
export type AppTheme = "dark" | "light" | "idul-adha"

export const THEMES: { id: AppTheme; name: string; label: string; bg: string; accent: string }[] = [
  { id: "dark",      name: "Dark",      label: "Midnight Glass",  bg: "#0A0A0D", accent: "#FF6A3D" },
  { id: "light",     name: "Light",     label: "Pearl Glass",     bg: "#C0BBB4", accent: "#FF6A3D" },
  { id: "idul-adha", name: "Idul Adha", label: "Eid Mubarak 🌙", bg: "#1E3932", accent: "#C8963E" },
]

// ─── Context ─────────────────────────────────────────────────
const ThemeCtx = createContext<{
  theme: AppTheme
  setTheme: (t: AppTheme) => Promise<void>
  toggle: () => Promise<void>
}>({ theme: "dark", setTheme: async () => {}, toggle: async () => {} })

// ─── Apply theme to <html> element ───────────────────────────
function applyTheme(t: AppTheme) {
  const html = document.documentElement
  html.classList.remove("dark", "iduladha")
  if (t === "dark")      html.classList.add("dark")
  if (t === "idul-adha") html.classList.add("iduladha")
  localStorage.setItem("cgd-theme-v2", t)
}

// ─── Provider ────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("dark")

  useEffect(() => {
    // 1. Apply saved local theme immediately — avoid flash
    const saved = localStorage.getItem("cgd-theme-v2") as AppTheme | null
    const legacy = localStorage.getItem("cgd-theme")
    if (saved === "dark" || saved === "light" || saved === "idul-adha") {
      applyTheme(saved); setThemeState(saved)
    } else if (legacy === "light") {
      applyTheme("light"); setThemeState("light")
    } else {
      applyTheme("dark"); setThemeState("dark")
    }

    // 2. Fetch from Supabase (source of truth)
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "app_theme")
      .single()
      .then(({ data }) => {
        // Map legacy 4-theme values to dark/light
        const raw = data?.value ?? ""
        const t: AppTheme =
          raw === "idul-adha"                                       ? "idul-adha" :
          raw === "dark"  || raw === "midnight" || raw === "ocean"  ? "dark"  :
          raw === "light" || raw === "pearl"    || raw === "sand"   ? "light" :
          "dark"
        applyTheme(t); setThemeState(t)
      })

    // 3. Realtime — all clients update when admin changes theme
    const channel = supabase
      .channel("app_theme_sync")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "app_settings",
        filter: "key=eq.app_theme",
      }, (payload) => {
        const raw = (payload.new as { value: string }).value
        const t: AppTheme =
          raw === "idul-adha"                                       ? "idul-adha" :
          raw === "dark"  || raw === "midnight" || raw === "ocean"  ? "dark"  :
          raw === "light" || raw === "pearl"    || raw === "sand"   ? "light" :
          "dark"
        applyTheme(t); setThemeState(t)
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
    await setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)
