export const ROLE_ACCESS = [
  {
    role: "Admin",
    menu: "Semua menu sales + REPORT + Leads Funnel + Admin",
    data: "Semua data user, pipeline, closing, team, report, funnel, dan unit special.",
    setting: "Bisa kelola user, role, status aktif/nonaktif, target hunter, dan akses data.",
  },
  {
    role: "Sales Hunter",
    menu: "Overview, Pipeline, Closing, Unit Special, REPORT, Leads Funnel, Funnel Summary",
    data: "Data milik tim hunter sendiri, termasuk sales person dan telemarketing di bawah timnya.",
    setting: "Coverage project REPORT diatur Admin dari Team Status.",
  },
  {
    role: "Sales Person",
    menu: "Overview, Pipeline, Closing, Unit Special",
    data: "Data pipeline dan closing milik user atau data yang terkait dengan tim/hunter-nya.",
    setting: "Dibuat dari Admin sebagai Sales Person dan wajib pilih Tim Hunter.",
  },
  {
    role: "Telemarketing",
    menu: "Leads Funnel, Funnel Summary",
    data: "Data leads funnel/summary telemarketing sesuai assignment dan tim hunter.",
    setting: "Di Admin pilih Telemarketing; sistem menyimpan sebagai Sales Person dengan has_tm_access aktif.",
  },
  {
    role: "Non Sales",
    menu: "Overview, Pipeline, Closing, Team Status",
    data: "Data pipeline/closing lintas hunter yang dibutuhkan untuk follow-up non-sales.",
    setting: "Di Admin pilih Non Sales; pengguna melihat label Non Sales.",
  },
]
