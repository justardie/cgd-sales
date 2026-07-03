ALTER TABLE pipeline_notes
  ADD COLUMN IF NOT EXISTS kendala TEXT,
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS target_closing DATE;

-- Legacy content remains unchanged and continues to appear in history.
