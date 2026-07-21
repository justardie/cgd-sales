"use client"
import { createContext, useCallback, useContext, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CheckCircle2, XCircle, Info } from "lucide-react"

type ToastType = "success" | "error" | "info"

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

const TOAST_DURATION_MS = 3500

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const ACCENTS: Record<ToastType, string> = {
  success: "#22c55e",
  error: "#ef4444",
  info: "var(--accent)",
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const dismissToast = useCallback((id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++idRef.current
    setToasts(current => [...current, { id, message, type }])
    setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
  }, [dismissToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
            zIndex: 10050, display: "flex", flexDirection: "column-reverse", gap: 8,
            alignItems: "center", pointerEvents: "none", width: "100%", padding: "0 16px",
          }}
        >
          {toasts.map(toast => {
            const Icon = ICONS[toast.type]
            const accent = ACCENTS[toast.type]
            return (
              <div
                key={toast.id}
                role="status"
                className="cgd-toast"
                onClick={() => dismissToast(toast.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
                  borderRadius: 12, background: "var(--surface)", border: `1px solid ${accent}55`,
                  color: "var(--text-primary)", fontSize: 13, fontWeight: 500,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.35)", maxWidth: "min(90vw, 420px)",
                  pointerEvents: "auto", cursor: "pointer",
                }}
              >
                <Icon size={16} style={{ color: accent, flexShrink: 0 }} />
                <span>{toast.message}</span>
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
