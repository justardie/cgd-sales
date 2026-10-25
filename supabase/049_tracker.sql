-- ── TRACKER: manual inputs by the HOD Marcomm (admin) ─────────────────────────
-- Gold Chest: 3 leads per sales per week (Mon–Sun) handed in by the Sales Leaders.
CREATE TABLE IF NOT EXISTS tracker_gold_chest (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  lead_id TEXT NOT NULL,
  lead_name TEXT NOT NULL DEFAULT '',
  sales_name TEXT NOT NULL DEFAULT '',
  team TEXT NOT NULL DEFAULT '',
  project TEXT NOT NULL DEFAULT '',
  kendala TEXT NOT NULL DEFAULT '',
  minat TEXT NOT NULL DEFAULT '',
  kebutuhan TEXT NOT NULL DEFAULT '',
  target_closing DATE,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (week_start, lead_id)
);
CREATE INDEX IF NOT EXISTS idx_tracker_gold_chest_week ON tracker_gold_chest(week_start);

-- Cause and action for sales with zero closing in a month.
CREATE TABLE IF NOT EXISTS tracker_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,                       -- 'YYYY-MM'
  sales_name TEXT NOT NULL,
  penyebab TEXT[] NOT NULL DEFAULT '{}',
  tindakan TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (month, sales_name)
);

-- Monthly omset target per Sales Leader team (rupiah).
CREATE TABLE IF NOT EXISTS tracker_targets (
  team TEXT PRIMARY KEY,
  monthly_target BIGINT NOT NULL DEFAULT 0 CHECK (monthly_target >= 0),
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tracker_targets (team, monthly_target, updated_by) VALUES
  ('Sales Leader Rosmaida', 10000000000, 'seed'),
  ('Sales Leader Andriansyah Pulungan', 10000000000, 'seed')
ON CONFLICT (team) DO NOTHING;

-- Same explicit access pattern as 038_weekly_reports.sql.
ALTER TABLE tracker_gold_chest ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracker_gold_chest_anon_all" ON tracker_gold_chest FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "tracker_gold_chest_service_all" ON tracker_gold_chest FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "tracker_notes_anon_all" ON tracker_notes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "tracker_notes_service_all" ON tracker_notes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "tracker_targets_anon_all" ON tracker_targets FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "tracker_targets_service_all" ON tracker_targets FOR ALL TO service_role USING (true) WITH CHECK (true);
