"use client"
import type { ReactNode } from "react"
import { GROUPS, type GroupId } from "@/lib/tracker-metrics"

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

export const n = (v: number) => (v || 0).toLocaleString("id-ID")
export const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–")
export const rupiahM = (v: number) => `Rp ${(v / 1e9).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`
export function dLabel(k: string) {
  if (!k) return "–"
  const d = new Date(`${k}T00:00:00Z`)
  return `${HARI[d.getUTCDay()]} ${+k.slice(8, 10)} ${BULAN[+k.slice(5, 7) - 1]}`
}
export const rLabel = (r: readonly [string, string]) => (r[0] === r[1] ? dLabel(r[0]) : `${dLabel(r[0])} – ${dLabel(r[1])}`)
export const groupLabel = (id: GroupId) => GROUPS.find((g) => g.id === id)?.label ?? id
export const shortTeam = (t: string) => t.replace("Sales Leader ", "SL ")

export function Delta({ now, prev }: { now: number; prev: number }) {
  const d = now - prev
  const cls = d > 0 ? "up" : d < 0 ? "down" : "flat"
  const sign = d > 0 ? "▲ " : d < 0 ? "▼ " : "■ "
  const rel = prev ? ` (${d >= 0 ? "+" : "−"}${Math.abs(Math.round((d / prev) * 100))}%)` : ""
  return <span className={`trk-delta ${cls}`}>{sign}{n(Math.abs(d))}{rel}</span>
}

export function Meter({ value, target }: { value: number; target: number }) {
  const p = target ? Math.min(100, Math.round((value / target) * 100)) : 0
  const cls = value >= target ? "ok" : p >= 50 ? "warn" : "bad"
  return (
    <span className={`trk-meter ${cls}`} title={`${n(value)} dari ${n(target)}`}>
      <span className="trk-meter-bar"><span className="trk-meter-fill" style={{ width: `${p}%` }} /></span>
      <span className="trk-meter-txt"><b>{n(value)}</b> / {n(target)}</span>
    </span>
  )
}

export const Pill = ({ kind, children }: { kind: "ok" | "warn" | "bad" | "muted"; children: ReactNode }) => <span className={`trk-pill ${kind}`}>{children}</span>
export const Swatch = ({ id }: { id: GroupId }) => <span className={`trk-sw trk-sw-${id}`} aria-hidden="true" />
export const Grp = ({ id, label }: { id: GroupId; label?: string }) => <span className="trk-grp"><Swatch id={id} />{label ?? groupLabel(id)}</span>

export interface Col<T> { label: string; num?: boolean; cell: (row: T, i: number) => ReactNode }
export function Table<T>({ cols, rows, rowKey, rowClass, foot, onRow, after }: {
  cols: Col<T>[]; rows: T[]; rowKey: (row: T, i: number) => string
  rowClass?: (row: T) => string; foot?: (col: Col<T>) => ReactNode; onRow?: (row: T) => void; after?: (row: T) => ReactNode
}) {
  return (
    <div className="trk-table-wrap">
      <table className="trk-table">
        <thead><tr>{cols.map((c) => <th key={c.label} className={c.num ? "num" : ""}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const extra = after?.(r)
            return [
              <tr
                key={rowKey(r, i)}
                className={`${rowClass?.(r) ?? ""}${onRow ? " clickable" : ""}`}
                tabIndex={onRow ? 0 : undefined}
                onClick={onRow ? () => onRow(r) : undefined}
                onKeyDown={onRow ? (e) => { if (e.key === "Enter") onRow(r) } : undefined}
              >
                {cols.map((c) => <td key={c.label} className={c.num ? "num" : ""}>{c.cell(r, i)}</td>)}
              </tr>,
              extra ? <tr key={`${rowKey(r, i)}-x`} className="trk-editor-row"><td colSpan={cols.length}>{extra}</td></tr> : null,
            ]
          })}
        </tbody>
        {foot && <tfoot><tr>{cols.map((c) => <td key={c.label} className={c.num ? "num" : ""}>{foot(c)}</td>)}</tr></tfoot>}
      </table>
    </div>
  )
}

export function Defs({ items }: { items: [string, string][] }) {
  return (
    <details className="trk-defs">
      <summary>Definisi dan sumber angka</summary>
      <dl>{items.map(([t, d]) => [<dt key={`t${t}`}>{t}</dt>, <dd key={`d${t}`}>{d}</dd>])}</dl>
    </details>
  )
}
