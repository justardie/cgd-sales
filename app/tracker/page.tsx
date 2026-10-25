"use client"
import { useCallback, useEffect, useState, type FormEvent } from "react"
import DashboardShell from "@/components/DashboardShell"
import TrackerG1, { type ArchiveResult } from "@/components/tracker/TrackerG1"
import TrackerM1 from "@/components/tracker/TrackerM1"
import TrackerSales from "@/components/tracker/TrackerSales"
import { dLabel } from "@/components/tracker/ui"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/contexts/ToastContext"
import type { TrackerData } from "@/lib/tracker-metrics"
import { addGold, deleteGold, fetchManual, saveNote, saveTarget, type GoldItem, type ZeroNote } from "@/lib/tracker-store"
import "./tracker.css"

type Tab = "g1" | "tracker" | "m1"
const TABS: [Tab, string][] = [["g1", "G1 · Leads Generation"], ["tracker", "Tracker A · per sales"], ["m1", "M1 · ME CH + CT"]]
const PIN_KEY = "cgd_tracker_pin"
interface Loaded { data: TrackerData; missing: string[] }

function readPin(): string {
  try { return sessionStorage.getItem(PIN_KEY) ?? "" } catch { return "" }
}

export default function TrackerPage() {
  const { user, isAdmin } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>("g1")
  const [pin, setPin] = useState("")
  const [needPin, setNeedPin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [manual, setManual] = useState<{ gold: GoldItem[]; notes: ZeroNote[]; targets: Record<string, number> }>({ gold: [], notes: [], targets: {} })

  const call = useCallback(async (body: Record<string, unknown>, usePin: string) => {
    const res = await fetch("/api/tracker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: user?.name, pin: usePin, ...body }) })
    const json = await res.json().catch(() => ({ ok: false, message: "Jawaban server tidak terbaca." }))
    if (res.status === 401 || res.status === 403) { try { sessionStorage.removeItem(PIN_KEY) } catch { /* storage may be blocked */ } setNeedPin(true) }
    if (!json.ok) throw new Error(json.message || "Data TRACKER belum bisa dimuat.")
    return json
  }, [user?.name])

  const loadManual = useCallback(async () => {
    try { setManual(await fetchManual()) } catch (e) { showToast(`Isian manual belum termuat: ${e instanceof Error ? e.message : ""}`, "error") }
  }, [showToast])

  const load = useCallback(async (usePin: string, refresh = false) => {
    setBusy(true); setError("")
    try {
      const json = await call({ refresh }, usePin)
      try { sessionStorage.setItem(PIN_KEY, usePin) } catch { /* storage may be blocked */ }
      setNeedPin(false)
      setLoaded({ data: json.data, missing: json.missing ?? [] })
      void loadManual()
    } catch (e) { setError(e instanceof Error ? e.message : "Data TRACKER belum bisa dimuat.") }
    finally { setBusy(false) }
  }, [call, loadManual])

  useEffect(() => {
    if (!user || !isAdmin) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      const saved = readPin()
      if (saved) void load(saved)
      else setNeedPin(true)
    })
    return () => { cancelled = true }
  }, [user, isAdmin, load])

  const loadArchive = async (): Promise<ArchiveResult> => (await call({ archive: true }, readPin())).archive
  const by = user?.name ?? ""
  // Shows the outcome, then rethrows a failure so the form keeps what was typed.
  const guard = async (fn: () => Promise<void>, ok: string) => {
    try { await fn() } catch (e) { showToast(e instanceof Error ? e.message : "Gagal menyimpan.", "error"); throw e }
    showToast(ok, "success")
    await loadManual()
  }

  if (user && !isAdmin) return <DashboardShell><div className="trk"><p className="trk-empty">Menu TRACKER khusus admin.</p></div></DashboardShell>

  return (
    <DashboardShell>
      <div className="trk">
        <header className="trk-mast">
          <div>
            <div className="trk-eyebrow">Confidential · internal use only</div>
            <h1>TRACKER · Leads Generation</h1>
            <p className="trk-asof">{loaded ? `Data CIS CRM per ${dLabel(loaded.data.ref)} ${loaded.data.ref.slice(0, 4)} · export harian 17.30` : "Data CIS CRM dari Google Drive"}</p>
          </div>
          {loaded && <button type="button" className="trk-btn" disabled={busy} onClick={() => load(readPin(), true)}>{busy ? "Memuat data…" : "Muat ulang data"}</button>}
        </header>

        {needPin && (
          <form className="trk-pin" onSubmit={(e: FormEvent) => { e.preventDefault(); void load(pin.trim()) }}>
            <label htmlFor="trk-pin">Masukkan PIN admin untuk membuka data TRACKER</label>
            <div className="trk-pin-row">
              <input id="trk-pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} />
              <button type="submit" className="trk-btn" disabled={busy || !pin.trim()}>{busy ? "Memeriksa…" : "Buka"}</button>
            </div>
          </form>
        )}
        {error && <div className="trk-banner" role="alert">{error}</div>}
        {loaded && loaded.missing.length > 0 && <div className="trk-banner soft">File belum ada di folder Terbaru: {loaded.missing.join(", ")}. Angka yang memakai file itu bisa lebih kecil dari sebenarnya.</div>}
        {busy && !loaded && !needPin && <p className="trk-hint">Membaca export CIS CRM dari Google Drive…</p>}

        {loaded && (
          <>
            <nav className="trk-tabs" role="tablist" aria-label="Menu TRACKER">
              {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
            </nav>
            {tab === "g1" && <TrackerG1 data={loaded.data} loadArchive={loadArchive} />}
            {tab === "tracker" && <TrackerSales data={loaded.data} notes={manual.notes} onSaveNote={(m, s, p, t) => guard(() => saveNote(m, s, p, t, by), `Catatan ${s} tersimpan.`)} />}
            {tab === "m1" && (
              <TrackerM1 data={loaded.data} gold={manual.gold} targets={manual.targets}
                onAddGold={async (item) => { await addGold(item, by); showToast(`${item.lead_name} masuk Gold Chest.`, "success"); await loadManual() }}
                onDeleteGold={(id) => guard(() => deleteGold(id), "Dihapus dari Gold Chest.")}
                onSaveTarget={(team, v) => guard(() => saveTarget(team, v, by), "Target tersimpan.")} />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  )
}
