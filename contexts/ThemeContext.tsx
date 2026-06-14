"use client"
import { createContext, useContext } from "react"

// Single dark theme — no switching
const ThemeCtx = createContext<{ theme: "dark" }>({ theme: "dark" })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeCtx.Provider value={{ theme: "dark" }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)
