// TRACKER — server-only access to the CIS CRM exports on Google Drive, via a service account.
// Never import this from a client component: it reads the service account key.
import { createSign } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { activeAsOf, buildTracker, parseCSV, type Row, type TrackerData } from "./tracker-metrics.ts"

export const DRIVE_FILES = {
  leadsNew: "leads_tgl_dibuat_created_on.csv",
  leadsUpd: "leads_last_updated_on.csv",
  activity: "activity_csv.csv",
  so: "penjualan_master_so.csv",
} as const
type FileKey = keyof typeof DRIVE_FILES

const DEFAULT_FOLDER_TERBARU = "1yS_ZhxIuDuRGp5jlTj27TU6Jj37VBQMs"
const DEFAULT_FOLDER_ARSIP = "16ccbn2PsniIqVZe8iGULBKUfAC8VTaCl"
const CACHE_MS = 10 * 60 * 1000
// Reading CSVs from disk is for `next dev` only; on Netlify the exports always come from Drive.
const LOCAL_DIR = process.env.NODE_ENV === "development" ? process.env.TRACKER_LOCAL_DIR : undefined
const DRIVE = "https://www.googleapis.com/drive/v3/files"

export class TrackerError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

interface DriveFile { id: string; name: string; modifiedTime: string; size?: string; mimeType?: string }
interface Loaded { data: TrackerData; activity: Row[]; files: Record<string, { name: string; modified: string } | null>; missing: string[]; at: number; key: string }

let cache: Loaded | null = null
let token: { value: string; exp: number } | null = null

function serviceAccount(): { email: string; key: string } {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new TrackerError("not_configured", "GOOGLE_SERVICE_ACCOUNT_JSON belum diisi di Netlify.")
  const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8")
  const json = JSON.parse(text) as { client_email?: string; private_key?: string }
  if (!json.client_email || !json.private_key) throw new TrackerError("not_configured", "Isi GOOGLE_SERVICE_ACCOUNT_JSON tidak lengkap.")
  return { email: json.client_email, key: json.private_key.replace(/\\n/g, "\n") }
}

async function accessToken(): Promise<string> {
  if (token && token.exp - 60_000 > Date.now()) return token.value
  const sa = serviceAccount()
  const now = Math.floor(Date.now() / 1000)
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url")
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.email, scope: "https://www.googleapis.com/auth/drive.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`
  const signature = createSign("RSA-SHA256").update(unsigned).sign(sa.key, "base64url")
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  })
  if (!res.ok) throw new TrackerError("auth_failed", `Login service account ke Google gagal (${res.status}).`)
  const body = (await res.json()) as { access_token: string; expires_in: number }
  token = { value: body.access_token, exp: Date.now() + body.expires_in * 1000 }
  return token.value
}

async function drive(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken()}` } })
  if (res.status === 403) {
    const reason = ((await res.json().catch(() => null)) as { error?: { errors?: { reason?: string }[] } } | null)?.error?.errors?.[0]?.reason ?? ""
    if (/rate|quota/i.test(reason)) throw new TrackerError("drive_busy", "Google Drive sedang membatasi permintaan. Coba lagi beberapa menit lagi.")
    throw new TrackerError("no_access", "Service account belum punya akses ke folder Drive CRM. Share folder ke email service account.")
  }
  if (res.status === 404) throw new TrackerError("no_access", "Service account belum punya akses ke folder Drive CRM. Share folder ke email service account.")
  if (!res.ok) throw new TrackerError("drive_error", `Google Drive menjawab ${res.status}.`)
  return res
}

async function list(q: string): Promise<DriveFile[]> {
  const out: DriveFile[] = []
  let pageToken = ""
  for (let i = 0; i < 20; i++) {
    const params = new URLSearchParams({ q, fields: "nextPageToken,files(id,name,modifiedTime,size,mimeType)", pageSize: "200", orderBy: "modifiedTime desc", supportsAllDrives: "true", includeItemsFromAllDrives: "true" })
    if (pageToken) params.set("pageToken", pageToken)
    const body = (await (await drive(`${DRIVE}?${params}`)).json()) as { files: DriveFile[]; nextPageToken?: string }
    out.push(...body.files)
    if (!body.nextPageToken) break
    pageToken = body.nextPageToken
  }
  return out
}
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")
const download = async (id: string) => (await drive(`${DRIVE}/${id}?alt=media&supportsAllDrives=true`)).text()

// ---- local mode for development: TRACKER_LOCAL_DIR holds files named like the Drive exports ----
async function localFile(name: string): Promise<{ meta: DriveFile; text: () => Promise<string> } | null> {
  if (!LOCAL_DIR) return null
  const p = path.join(LOCAL_DIR, name)
  try {
    const text = await readFile(p, "utf8")
    return { meta: { id: p, name, modifiedTime: "local" }, text: async () => text }
  } catch { return null }
}

async function locate(name: string): Promise<{ meta: DriveFile; text: () => Promise<string> } | null> {
  if (LOCAL_DIR) return localFile(name)
  const folder = process.env.TRACKER_FOLDER_TERBARU || DEFAULT_FOLDER_TERBARU
  const [f] = await list(`'${esc(folder)}' in parents and name = '${esc(name)}' and trashed = false`)
  return f ? { meta: f, text: () => download(f.id) } : null
}

/** Loads the exports (cached until a file changes) and returns the computed tracker. */
export async function loadTracker(force = false): Promise<Loaded> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache
  const keys = Object.keys(DRIVE_FILES) as FileKey[]
  const found = await Promise.all(keys.map((k) => locate(DRIVE_FILES[k])))
  const key = found.map((f) => f?.meta.modifiedTime ?? "-").join("|")
  if (!force && cache && cache.key === key) { cache = { ...cache, at: Date.now() }; return cache }
  const missing = keys.filter((_, i) => !found[i]).map((k) => DRIVE_FILES[k])
  if (!found[0] || !found[2]) throw new TrackerError("missing", `File export tidak ditemukan: ${missing.join(", ")}.`)
  const texts = await Promise.all(found.map((f) => (f ? f.text() : Promise.resolve(""))))
  const [leadsNew, leadsUpd, activity, so] = texts.map(parseCSV)
  cache = {
    data: buildTracker({ leadsNew, leadsUpd, activity, so }),
    activity,
    files: Object.fromEntries(keys.map((k, i) => [k, found[i] ? { name: found[i]!.meta.name, modified: found[i]!.meta.modifiedTime } : null])),
    missing,
    at: Date.now(),
    key,
  }
  return cache
}

/** Active leads per source from the archived snapshot nearest to (and not after) targetKey. */
export async function loadArchiveCompare(targetKey: string) {
  const current = await loadTracker()
  let pick: { date: string; text: () => Promise<string> } | null = null
  const dated = /^leads_last_updated_on_(\d{4}-\d{2}-\d{2})\.csv$/
  if (!LOCAL_DIR) {
    const root = process.env.TRACKER_FOLDER_ARSIP || DEFAULT_FOLDER_ARSIP
    const months = (await list(`'${esc(root)}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`))
    const perMonth = await Promise.all(months.map((m) => list(`'${esc(m.id)}' in parents and name contains 'leads_last_updated_on_' and trashed = false`)))
    const cands = perMonth.flat().flatMap((f) => {
      const hit = dated.exec(f.name)
      return hit ? [{ date: hit[1], id: f.id }] : []
    })
    cands.sort((a, b) => (a.date < b.date ? -1 : 1))
    const best = cands.filter((c) => c.date <= targetKey).pop() ?? cands[0]
    if (best) pick = { date: best.date, text: () => download(best.id) }
  }
  if (!pick) throw new TrackerError("no_archive", "Belum ada arsip leads di folder Arsip.")
  return { date: pick.date, exact: pick.date <= targetKey, counts: activeAsOf(parseCSV(await pick.text()), current.activity, pick.date) }
}
