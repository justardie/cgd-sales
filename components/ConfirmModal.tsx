"use client"
import { AlertTriangle } from "lucide-react"

interface Props {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ title, message, confirmLabel = "Hapus", onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-medium)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--red-soft)" }}
          >
            <AlertTriangle size={16} style={{ color: "var(--red)" }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {title}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={onCancel}
            className="text-sm font-medium px-4 py-2 rounded-xl transition"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="text-sm font-semibold px-4 py-2 rounded-xl transition"
            style={{
              background: "var(--red)",
              color: "#fff",
              border: "none",
              boxShadow: "0 4px 12px rgba(239,68,68,0.30)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
