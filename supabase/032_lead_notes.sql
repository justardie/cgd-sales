-- ============================================================
-- 032_lead_notes.sql
-- Journey notes for funnel leads (date-stamped, per-lead history)
-- ============================================================

CREATE TABLE IF NOT EXISTS lead_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  author_name TEXT        NOT NULL DEFAULT '',
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grant access (same pattern as task_force_leads)
GRANT ALL ON lead_notes TO anon, authenticated;

-- Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE lead_notes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
