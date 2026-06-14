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

-- Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_notes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
