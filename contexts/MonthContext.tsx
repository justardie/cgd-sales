"use client"
import { createContext, useContext, useState } from "react"

export type MonthState = {
  month: number   // 1–12
  year:  number
  ytd:   boolean  // true = Jan 2026 → current month
}

type MonthCtxType = {
  monthState:    MonthState
  setMonthState: (s: MonthState) => void
}

const now = new Date()

const MonthCtx = createContext<MonthCtxType>({
  monthState:    { month: now.getMonth() + 1, year: now.getFullYear(), ytd: false },
  setMonthState: () => {},
})

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [monthState, setMonthState] = useState<MonthState>({
    month: now.getMonth() + 1,
    year:  now.getFullYear(),
    ytd:   false,
  })

  return (
    <MonthCtx.Provider value={{ monthState, setMonthState }}>
      {children}
    </MonthCtx.Provider>
  )
}

export const useMonth = () => useContext(MonthCtx)
