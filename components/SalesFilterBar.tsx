"use client"

import { Search } from "lucide-react"

// Control order: Search, Hunter, Project, Cara Bayar, Status

export interface FilterOption {
  value: string
  label: string
}

interface SalesFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  hunter: string
  onHunterChange: (value: string) => void
  hunterOptions: FilterOption[]
  project: string
  onProjectChange: (value: string) => void
  projectOptions: FilterOption[]
  caraBayar: string
  onCaraBayarChange: (value: string) => void
  caraBayarOptions: FilterOption[]
  status?: string
  onStatusChange?: (value: string) => void
  statusOptions?: FilterOption[]
}

const controlClass = "text-xs px-3 py-2 rounded-lg text-slate-300 outline-none"
const controlStyle = { background: "var(--surface)", border: "1px solid var(--border)" }

export default function SalesFilterBar({
  search,
  onSearchChange,
  hunter,
  onHunterChange,
  hunterOptions,
  project,
  onProjectChange,
  projectOptions,
  caraBayar,
  onCaraBayarChange,
  caraBayarOptions,
  status,
  onStatusChange,
  statusOptions,
}: SalesFilterBarProps) {
  return (
    <div className="flex gap-2 flex-wrap items-end">
      <label className="flex flex-col gap-1 min-w-60 flex-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Search</span>
        <span className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari konsumen, sales, project, unit..."
            className={`${controlClass} w-full pl-8`}
            style={controlStyle}
          />
        </span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Hunter</span>
        <select value={hunter} onChange={(event) => onHunterChange(event.target.value)} className={controlClass} style={controlStyle}>
          <option value="">Semua Hunter</option>
          {hunterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Project</span>
        <select value={project} onChange={(event) => onProjectChange(event.target.value)} className={controlClass} style={controlStyle}>
          <option value="">Semua Project</option>
          {projectOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Cara Bayar</span>
        <select value={caraBayar} onChange={(event) => onCaraBayarChange(event.target.value)} className={controlClass} style={controlStyle}>
          <option value="">Semua Cara Bayar</option>
          {caraBayarOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {status !== undefined && onStatusChange && statusOptions && (
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Status</span>
          <select value={status} onChange={(event) => onStatusChange(event.target.value)} className={controlClass} style={controlStyle}>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      )}
    </div>
  )
}
