-- Task Force Notes: per-lead chronological action plan notes
CREATE TABLE IF NOT EXISTS task_force_notes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  konsumen_id  UUID        NOT NULL REFERENCES konsumen(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  author_name  TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tf_notes_konsumen
  ON task_force_notes (konsumen_id, created_at DESC);

-- Enable realtime for live note updates
ALTER PUBLICATION supabase_realtime ADD TABLE task_force_notes;
