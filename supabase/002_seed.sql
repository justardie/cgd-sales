-- ============================================================
-- CGD Sales Dashboard — Seed Data (002)
-- Run AFTER 001_init.sql
-- Initial PINs (change after first login!):
--   Admin       = 0000
--   Roy         = 1111
--   Lyndon      = 2222
--   Jimmy       = 3333
--   Al          = 4444
--   Aida        = 5555
--   Aldo        = 6666
--   Frans       = 7777
--   Andre       = 8888
--   Prediman    = 9999
--   Ellen       = 1234
--   Asun        = 2345
-- ============================================================

INSERT INTO users (name, pin_hash, role, status, monthly_target, win_or_die_target, visit_target) VALUES
  ('Admin',                '1kws73', 'admin',  'active', 0,         0,        0)  ON CONFLICT DO NOTHING,
  ('Roy Ferdinand H.',     '1kw4fz', 'hunter', 'active', 11000000,  5000000, 60)  ON CONFLICT DO NOTHING,
  ('Lyndon Sumarli',       '1kvgov', 'hunter', 'active', 10000000,  4000000, 60)  ON CONFLICT DO NOTHING,
  ('Jimmy Darmadi',        '1kusxr', 'hunter', 'active', 5780000,   3000000, 60)  ON CONFLICT DO NOTHING,
  ('Al (Firyal Badriyyah)','1ku56n', 'hunter', 'active', 5450000,   3000000, 60)  ON CONFLICT DO NOTHING,
  ('Aida (Rosmaida)',      '1kthfj', 'hunter', 'active', 8000000,   5000000, 50)  ON CONFLICT DO NOTHING,
  ('Aldo (Rinaldo)',       '1kstof', 'hunter', 'active', 8000000,   5000000, 50)  ON CONFLICT DO NOTHING,
  ('Frans',                '1ks5xb', 'hunter', 'active', 8000000,   5000000, 50)  ON CONFLICT DO NOTHING,
  ('Andre',                '1kri67', 'hunter', 'active', 8000000,   5000000, 50)  ON CONFLICT DO NOTHING,
  ('Prediman',             '1kquf3', 'hunter', 'active', 5000000,   2000000, 40)  ON CONFLICT DO NOTHING,
  ('Ellen',                '1kw3nh', 'hunter', 'active', 5000000,   2000000, 40)  ON CONFLICT DO NOTHING,
  ('Asun',                 '1kvfwd', 'hunter', 'active', 5000000,   2000000, 40)  ON CONFLICT DO NOTHING;
