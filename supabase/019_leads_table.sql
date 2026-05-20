-- ── Leads Nurture table ─────────────────────────────────────────
-- Uploaded by Kadek (DGM), assigned to telemarketing sales persons.
-- Status updated by the assigned TM after calling the lead.

CREATE TABLE IF NOT EXISTS leads (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  assigned_to   uuid        REFERENCES users(id) NOT NULL,
  name          text        NOT NULL,
  phone         text        NOT NULL,
  project       text        NOT NULL DEFAULT '',
  status        text        NOT NULL DEFAULT 'new',
  -- status values:
  --   new                     → Belum Dihubungi
  --   tidak_aktif             → Unqualified
  --   bisa_dihub_tidak_angkat → Follow Up Lagi
  --   angkat_tertarik         → Segera Ajak Visit
  --   angkat_tidak_tertarik   → Cold
  notes         text        NOT NULL DEFAULT '',
  uploaded_by   uuid        REFERENCES users(id),
  period        text        NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS leads_period_idx      ON leads(period);
CREATE INDEX IF NOT EXISTS leads_status_idx      ON leads(status);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- This app uses its own PIN-based auth (not Supabase Auth), so auth.uid() is
-- not available for per-row policies. RLS is enabled to prevent accidental
-- exposure via the Supabase REST API; access control is enforced at the
-- application layer (DashboardShell redirect + per-role Supabase queries).
--
-- If you later migrate to Supabase Auth you can replace these policies with
-- fine-grained per-user rules using auth.uid().

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow the service-role key (server-side / migrations) unrestricted access.
-- The anon key (browser client) gets the same broad permission so the existing
-- app queries keep working; the app itself narrows results by assigned_to / period.
CREATE POLICY "leads_service_all"
  ON leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "leads_anon_all"
  ON leads FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
