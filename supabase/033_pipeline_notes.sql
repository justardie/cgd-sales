-- ============================================================
-- 033_pipeline_notes.sql
-- Journey / progress notes for pipeline records (konsumen table)
-- ============================================================

CREATE TABLE IF NOT EXISTS pipeline_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  konsumen_id UUID        NOT NULL REFERENCES konsumen(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  author_name TEXT        NOT NULL DEFAULT '',
  created_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grant access
GRANT ALL ON pipeline_notes TO anon, authenticated;

-- RLS (same pattern as leads table — app uses PIN auth, not Supabase Auth)
ALTER TABLE pipeline_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_notes_service_all"
  ON pipeline_notes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "pipeline_notes_anon_all"
  ON pipeline_notes FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_notes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
