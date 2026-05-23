-- ============================================================
-- 031_task_force_leads_table.sql
-- Creates dedicated task_force_leads table (separate from konsumen)
-- and recreates task_force_notes with FK to task_force_leads.id
-- Run BEFORE 030_import_task_force_omset.sql
-- ============================================================

-- 1. Create task_force_leads table
CREATE TABLE IF NOT EXISTS task_force_leads (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        REFERENCES users(id) ON DELETE SET NULL,
  sales_hunter        TEXT        NOT NULL DEFAULT '',
  sales_person        TEXT,
  name                TEXT        NOT NULL DEFAULT '',
  project             TEXT,
  unit                TEXT,
  status              TEXT        NOT NULL DEFAULT 'warm',
  potensi_closing     NUMERIC     DEFAULT 0,
  cara_bayar          TEXT,
  sumber_leads        TEXT,
  visit_date          DATE,
  sudah_visit         BOOLEAN     NOT NULL DEFAULT false,
  sudah_booking_fee   BOOLEAN     NOT NULL DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Clean up old task force data from konsumen
DELETE FROM konsumen WHERE board = 'task_force';

-- 3. Drop and recreate task_force_notes with correct FK
DROP TABLE IF EXISTS task_force_notes CASCADE;

CREATE TABLE task_force_notes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID        NOT NULL REFERENCES task_force_leads(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  author_name  TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable realtime for both tables
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE task_force_leads;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE task_force_notes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
