-- ── Add Telemarketing users + Kadek (DGM) ───────────────────────
-- role 'telemarketing' → can only access /funnel and /funnel-summary
-- role 'dgm'           → Kadek, uploads leads, sees all TM data
-- hunter_name          → links each TM to their hunter (for hunter visibility)
-- PIN defaults to '1234' — admin must update via Admin page

INSERT INTO users (name, role, status, pin_hash, hunter_name, monthly_target, win_or_die_target, visit_target)
VALUES
  -- DGM
  ('Kadek',                    'dgm',           'active', '1234', '',                    0, 0, 0),
  -- Telemarketing (hunter_name = hunter's DB name from users table)
  ('Shinta Okvianti',          'telemarketing', 'active', '1234', 'Frans',               0, 0, 0),
  ('Dea Alviony Agista (TM)',  'telemarketing', 'active', '1234', 'Andriansyah (Andre)', 0, 0, 0),
  ('M. Fadjri Saputra (TM)',   'telemarketing', 'active', '1234', 'Aida (Rosmaida)',     0, 0, 0),
  ('Ela Magdalena (TM)',        'telemarketing', 'active', '1234', 'Aldo (Rinaldo)',      0, 0, 0),
  ('Riduan Hasudungan (TM)',   'telemarketing', 'active', '1234', 'Lyndon Sumarli',      0, 0, 0),
  ('Adi Chandra (TM)',         'telemarketing', 'active', '1234', 'Firyal Badriyyah',    0, 0, 0),
  ('Ferdinan Bangun (TM)',     'telemarketing', 'active', '1234', 'Ellen',               0, 0, 0),
  ('Maria Oktavaini (TM)',     'telemarketing', 'active', '1234', 'Prediman',            0, 0, 0),
  ('Nurlela (TM)',             'telemarketing', 'active', '1234', 'Ellen',               0, 0, 0)
ON CONFLICT DO NOTHING;

-- NOTE: Usernames have "(TM)" suffix to distinguish from their SP accounts.
-- PINs are '1234' as placeholder — update each via Admin > Users page.
