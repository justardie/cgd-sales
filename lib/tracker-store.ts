// TRACKER — manual inputs (Gold Chest, zero-closing notes, omset targets) in Supabase.
import { supabase } from "./supabase.ts"

export interface GoldItem {
  id: string; week_start: string; lead_id: string; lead_name: string; sales_name: string; team: string; project: string
  kendala: string; minat: string; kebutuhan: string; target_closing: string | null
}
export interface ZeroNote { month: string; sales_name: string; penyebab: string[]; tindakan: string; updated_at: string }

export const PENYEBAB = ["Leads", "Kualitas", "Kontak", "Visit", "Produk", "Harga", "Pembayaran", "KPR", "Negosiasi", "Follow-up"] as const

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function fetchManual() {
  const [gold, notes, targets] = await Promise.all([
    supabase.from("tracker_gold_chest").select("id,week_start,lead_id,lead_name,sales_name,team,project,kendala,minat,kebutuhan,target_closing").order("created_at"),
    supabase.from("tracker_notes").select("month,sales_name,penyebab,tindakan,updated_at"),
    supabase.from("tracker_targets").select("team,monthly_target"),
  ])
  return {
    gold: check(gold) as GoldItem[],
    notes: check(notes) as ZeroNote[],
    targets: Object.fromEntries((check(targets) as { team: string; monthly_target: number }[]).map((t) => [t.team, Number(t.monthly_target)])) as Record<string, number>,
  }
}

export async function addGold(item: Omit<GoldItem, "id">, by: string) {
  check(await supabase.from("tracker_gold_chest").upsert({ ...item, created_by: by, updated_at: new Date().toISOString() }, { onConflict: "week_start,lead_id" }))
}
export async function deleteGold(id: string) {
  check(await supabase.from("tracker_gold_chest").delete().eq("id", id))
}
export async function saveNote(month: string, sales: string, penyebab: string[], tindakan: string, by: string) {
  check(await supabase.from("tracker_notes").upsert({ month, sales_name: sales, penyebab, tindakan, updated_by: by, updated_at: new Date().toISOString() }, { onConflict: "month,sales_name" }))
}
export async function saveTarget(team: string, value: number, by: string) {
  check(await supabase.from("tracker_targets").upsert({ team, monthly_target: Math.round(value), updated_by: by, updated_at: new Date().toISOString() }, { onConflict: "team" }))
}
