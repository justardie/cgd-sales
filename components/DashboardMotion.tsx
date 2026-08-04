"use client"

import { useEffect, useRef, useState } from "react"

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return reduced
}

export function AnimatedNumber({
  value,
  format,
  className,
  duration = 700,
}: {
  value: number
  format: (value: number) => string
  className?: string
  duration?: number
}) {
  const reducedMotion = useReducedMotion()
  const previousValue = useRef(0)
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const from = previousValue.current
    previousValue.current = value

    if (reducedMotion || from === value) {
      const frame = requestAnimationFrame(() => setDisplayValue(value))
      return () => cancelAnimationFrame(frame)
    }

    const startedAt = performance.now()
    let frame = 0
    const tick = (time: number) => {
      const progress = Math.min((time - startedAt) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(from + (value - from) * eased)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration, reducedMotion, value])

  return (
    <span className={`motion-number ${className ?? ""}`} aria-label={format(value)}>
      {format(displayValue)}
    </span>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat data dashboard">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="dashboard-skeleton-card">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-7 w-28 mt-3" />
            <div className="skeleton h-3 w-24 mt-3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="dashboard-skeleton-card h-40" />
        <div className="dashboard-skeleton-card h-40" />
      </div>
      <div className="dashboard-skeleton-card h-[270px]">
        <div className="skeleton h-3 w-36" />
        <div className="skeleton h-[210px] w-full mt-4" />
      </div>
      <span className="sr-only">Memuat data dashboard</span>
    </div>
  )
}
