-- ============================================================
-- 016_app_settings.sql
-- Global app settings table (key/value).
-- Stores admin-controlled settings like active theme.
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default theme
INSERT INTO app_settings (key, value)
VALUES ('app_theme', 'midnight')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read (theme must be public)
CREATE POLICY "read_app_settings" ON app_settings
  FOR SELECT USING (true);

-- Anyone can upsert (admin check handled in app layer)
CREATE POLICY "write_app_settings" ON app_settings
  FOR ALL USING (true)
  WITH CHECK (true);

-- Enable Realtime so all clients get instant theme updates
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;

-- Verify
-- SELECT * FROM app_settings;  → expected: { key: 'app_theme', value: 'midnight' }
