"use client"
import { useState } from "react"
import { X } from "lucide-react"
import ConfirmModal from "@/components/ConfirmModal"

interface ModalProps {
  onClose: () => void
  /** When true, clicking the backdrop or the X button asks for confirmation instead of closing immediately. */
  isDirty?: boolean
  maxWidth?: string
  children: React.ReactNode
}

/** Shared modal shell: click outside (or the X) closes it, unless `isDirty` is set — then it confirms first. */
export default function Modal({ onClose, isDirty = false, maxWidth = "max-w-lg", children }: ModalProps) {
  const [confirmingClose, setConfirmingClose] = useState(false)

  function requestClose() {
    if (isDirty) setConfirmingClose(true)
    else onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={requestClose}
      >
        <div
          className={`w-full ${maxWidth} rounded-xl relative max-h-[90vh] overflow-y-auto`}
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={requestClose} className="absolute top-4 right-4 text-slate-500 hover:text-white z-10">
            <X size={16} />
          </button>
          {children}
        </div>
      </div>

      {confirmingClose && (
        <ConfirmModal
          title="Ada perubahan belum disimpan"
          message="Tutup form ini tanpa menyimpan perubahan?"
          confirmLabel="Tutup Tanpa Simpan"
          onConfirm={() => { setConfirmingClose(false); onClose() }}
          onCancel={() => setConfirmingClose(false)}
        />
      )}
    </>
  )
}
