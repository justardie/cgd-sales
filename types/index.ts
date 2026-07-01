export type Role = 'admin' | 'hunter' | 'sales_person' | 'telemarketing' | 'dgm' | 'admin_dgm' | 'task_force'

export type LeadStatus =
  | 'new'
  | 'tidak_aktif'
  | 'bisa_dihub_tidak_angkat'
  | 'angkat_tertarik'
  | 'angkat_tidak_tertarik'
  | 'visit_dijadwalkan'
  | 'sudah_visit'
  | 'closing'
  | 'lost'

export const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; result: string; color: string }
> = {
  new:                     { label: 'Belum Dihubungi',         result: 'Belum Dihubungi',    color: 'slate'   },
  tidak_aktif:             { label: 'Tidak Aktif',              result: 'Unqualified',         color: 'red'     },
  bisa_dihub_tidak_angkat: { label: 'Tdk Angkat',               result: 'Follow Up',           color: 'amber'   },
  angkat_tidak_tertarik:   { label: 'Tdk Tertarik',             result: 'Tdk Tertarik',        color: 'blue'    },
  angkat_tertarik:         { label: 'Tertarik & Mau Visit',     result: 'Segera Visit',        color: 'green'   },
  visit_dijadwalkan:       { label: 'Visit Dijadwalkan',        result: 'Ingatkan Visit',      color: 'purple'  },
  sudah_visit:             { label: 'Sudah Visit',              result: 'Follow up Kembali',   color: 'teal'    },
  closing:                 { label: 'Closing',                  result: 'WON!',                color: 'emerald' },
  lost:                    { label: 'Tidak Potensial',          result: 'Tdk Potensial',       color: 'gray'    },
}

export interface Lead {
  id: string
  assigned_to: string
  name: string
  phone: string
  project: string
  status: LeadStatus
  notes: string
  uploaded_by: string | null
  period: string
  created_at: string
  updated_at: string
}

export interface LeadNote {
  id: string
  lead_id: string
  content: string
  author_name: string
  created_by: string | null
  created_at: string
}
export type UserStatus = 'active' | 'resigned'
export type ActivityStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'
export type SPLevel = 'SP0' | 'SP1' | 'SP2' | 'SP3' | 'SP4' | 'SP5'

export interface User {
  id: string
  name: string
  pin_hash: string
  role: Role
  status: UserStatus
  monthly_target: number
  win_or_die_target: number
  visit_target: number
  hunter_name?: string | null
  project_coverage?: string[]
  created_at: string
}

export interface SalesPerson {
  id: string
  name: string
  hunter_id: string
  status: 'active' | 'resigned'
  sp_level: number
  created_at: string
  hunter?: User
}

export interface Visit {
  id: string
  user_id: string
  visit_date: string
  visit_type: 'konsumen' | 'lokasi' | 'assisted' | 'out_of_town' | 'pk' | 'sg_agent'
  count: number
  accompanied_count: number
  visit_lokasi_count: number
  notes: string | null
  week_number: number
  month: number
  year: number
  created_at: string
  user?: User
}

export interface Pipeline {
  id: string
  user_id: string
  konsumen_name: string
  project: string | null
  unit: string | null
  estimated_value: number | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  user?: User
}

export interface Closing {
  id: string
  user_id: string
  pipeline_id: string | null
  konsumen_name: string
  project: string | null
  unit: string | null
  closing_value: number
  visit_date: string | null
  closing_date: string
  month: number
  year: number
  notes: string | null
  salesname: string | null
  created_at: string
  user?: User
}

export interface Activity {
  id: string
  title: string
  description: string | null
  assigned_to: string
  created_by: string
  deadline: string | null
  status: ActivityStatus
  priority: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  updated_at: string
  assignee?: User
  creator?: User
}

export interface Target {
  id: string
  user_id: string
  month: number
  year: number
  omset_target: number
  visit_target: number
  created_at: string
  user?: User
}

export interface TeamStatusHistory {
  id: string
  user_id: string
  month: number
  year: number
  sp_level: number
  reason: string | null
  created_at: string
}

export interface AuthUser {
  id: string
  name: string
  role: Role
  status: UserStatus
  has_tm_access?: boolean
}
