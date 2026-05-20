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
