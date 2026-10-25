import { timingSafeEqual } from "node:crypto"
import { supabase } from "@/lib/supabase"
import { addDays } from "@/lib/tracker-metrics"
import { TrackerError, loadArchiveCompare, loadTracker } from "@/lib/tracker-drive"

export const maxDuration = 26

interface Body { name?: unknown; pin?: unknown; refresh?: unknown; archive?: unknown }

const fail = (status: number, code: string, message: string) => Response.json({ ok: false, code, message }, { status })

// Per-instance brake on wrong PINs: 8 misses per 15 minutes per caller.
const MAX_MISSES = 8
const WINDOW_MS = 15 * 60 * 1000
const misses = new Map<string, { n: number; since: number }>()
// Only Netlify's own client-IP header is trusted; a forwarded header can be spoofed.
function callerKey(request: Request): string {
  return request.headers.get("x-nf-client-connection-ip") ?? "unknown"
}
function pruneMisses() {
  const now = Date.now()
  for (const [k, m] of misses) if (now - m.since > WINDOW_MS) misses.delete(k)
}
function isBlocked(key: string): boolean {
  const m = misses.get(key)
  if (!m) return false
  if (Date.now() - m.since > WINDOW_MS) { misses.delete(key); return false }
  return m.n >= MAX_MISSES
}
function recordMiss(key: string) {
  pruneMisses()
  const m = misses.get(key)
  misses.set(key, m && Date.now() - m.since <= WINDOW_MS ? { n: m.n + 1, since: m.since } : { n: 1, since: Date.now() })
}

// Local development against CSVs on disk only: lets the page load without a real PIN.
// Never active on Netlify, where NODE_ENV is "production".
const DEV_BYPASS = process.env.NODE_ENV === "development" && !!process.env.TRACKER_LOCAL_DIR && process.env.TRACKER_DEV_SKIP_PIN === "1"

/** Only an active admin, proven by name + PIN on every call, gets tracker data. */
async function isAdmin(name: string, pin: string): Promise<boolean> {
  if (DEV_BYPASS) return true
  const literal = name.replace(/[\\%_]/g, (c) => `\\${c}`)
  const { data, error } = await supabase
    .from("users")
    .select("role, status, pin_hash")
    .ilike("name", literal)
    .eq("status", "active")
    .maybeSingle()
  if (error || !data || data.role !== "admin" || !data.pin_hash) return false
  const a = Buffer.from(String(data.pin_hash)), b = Buffer.from(pin)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  let body: Body
  try { body = (await request.json()) as Body } catch { return fail(400, "bad_request", "Permintaan tidak valid.") }
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const pin = typeof body.pin === "string" ? body.pin.trim() : ""
  if (!name || !/^\w{3,12}$/.test(pin)) return fail(401, "unauthorized", "Masukkan PIN admin.")
  const caller = callerKey(request)
  if (isBlocked(caller)) return fail(429, "too_many", "Terlalu banyak PIN salah. Coba lagi 15 menit lagi.")
  if (!(await isAdmin(name, pin))) { recordMiss(caller); return fail(403, "forbidden", "PIN salah atau akun bukan admin.") }
  misses.delete(caller)

  try {
    const loaded = await loadTracker(body.refresh === true)
    if (body.archive === true) {
      const archive = await loadArchiveCompare(addDays(loaded.data.ref, -7))
      return Response.json({ ok: true, archive })
    }
    return Response.json({ ok: true, data: loaded.data, files: loaded.files, missing: loaded.missing, loadedAt: new Date(loaded.at).toISOString() })
  } catch (err) {
    if (err instanceof TrackerError) return fail(err.code === "not_configured" ? 503 : 502, err.code, err.message)
    console.error("tracker load failed", err)
    return fail(500, "server_error", "Data TRACKER belum bisa dimuat. Coba lagi beberapa saat.")
  }
}
