CREATE TABLE IF NOT EXISTS role_access_settings (
  role_key TEXT PRIMARY KEY,
  data_scope TEXT NOT NULL DEFAULT 'team_only',
  desktop_menus TEXT[] NOT NULL DEFAULT '{}',
  tablet_menus TEXT[] NOT NULL DEFAULT '{}',
  mobile_menus TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_access_overrides (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data_scope TEXT NOT NULL DEFAULT 'team_only',
  allowed_hunter_names TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE role_access_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_access_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage role access settings"
ON role_access_settings
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins manage user access overrides"
ON user_access_overrides
FOR ALL
USING (true)
WITH CHECK (true);
