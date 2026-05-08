"use client"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const saved = (localStorage.getItem("cgd-theme") as Theme) ?? "light"
    apply(saved)
  }, [])

  function apply(t: Theme) {
    setTheme(t)
    // Default = light (no class). Dark adds html.dark
    document.documentElement.classList.toggle("dark", t === "dark")
    // Remove legacy class from old sessions
    document.documentElement.classList.remove("light")
    localStorage.setItem("cgd-theme", t)
  }

  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => apply(theme === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)
