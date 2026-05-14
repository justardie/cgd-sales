export type Role = 'admin' | 'hunter' | 'sales_person'
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
}
