"use client"
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { daysSince, filterKonsumenRowsForUser, STALE_DAYS_THRESHOLD } from "@/lib/stale-leads"

export interface StaleLead {
  id: string
  name: string
  project: string | null
  days: number
}

const POLL_INTERVAL_MS = 5 * 60 * 1000

/** Warm/hot pipeline leads with no status update or pipeline_notes entry in STALE_DAYS_THRESHOLD days. */
export function useStaleLeads() {
  const { user, isAdmin } = useAuth()
  const isTf = user?.role === "task_force"
  const [staleLeads, setStaleLeads] = useState<StaleLead[]>([])

  const load = useCallback(async () => {
    if (!user) { setStaleLeads([]); return }

    const { data, error } = await supabase
      .from("konsumen")
      .select("id, name, project, sales_hunter, user_id, created_at")
      .in("status", ["warm", "hot"])
      .or("board.eq.pipeline,board.is.null")
    if (error || !data) { setStaleLeads([]); return }

    const rows = filterKonsumenRowsForUser(data, user, isAdmin, isTf)
    if (rows.length === 0) { setStaleLeads([]); return }

    const ids = rows.map(r => r.id)
    const CHUNK_SIZE = 50
    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) chunks.push(ids.slice(i, i + CHUNK_SIZE))
    const results = await Promise.all(chunks.map(chunk =>
      supabase.from("pipeline_notes").select("konsumen_id, created_at").in("konsumen_id", chunk).order("created_at", { ascending: false })
    ))
    const lastNoteDate: Record<string, string> = {}
    for (const { data: pnData } of results) {
      for (const pn of (pnData || []) as { konsumen_id: string; created_at: string }[]) {
        if (!lastNoteDate[pn.konsumen_id]) lastNoteDate[pn.konsumen_id] = pn.created_at
      }
    }

    const stale = rows
      .map(r => {
        const lastActivity = lastNoteDate[r.id] || r.created_at
        return { id: r.id, name: r.name, project: r.project, days: lastActivity ? daysSince(lastActivity) : 0 }
      })
      .filter(r => r.days >= STALE_DAYS_THRESHOLD)
      .sort((a, b) => b.days - a.days)

    setStaleLeads(stale)
  }, [user, isAdmin, isTf])

  useEffect(() => { void load() }, [load])
  useEffect(() => {
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  return { staleLeads }
}
