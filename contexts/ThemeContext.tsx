"use client"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light"

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    const saved = (localStorage.getItem("cgd-theme") as Theme) ?? "dark"
    apply(saved)
  }, [])

  function apply(t: Theme) {
    setTheme(t)
    document.documentElement.classList.toggle("light", t === "light")
    localStorage.setItem("cgd-theme", t)
  }

  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => apply(theme === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)
