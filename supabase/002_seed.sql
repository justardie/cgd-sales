-- ============================================================
-- CGD Sales Dashboard --- Seed Data (002)
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
  ('Admin',                '1kws73', 'admin',  'active', 0,        0,       0),
  ('Roy Ferdinand H.',     '1kw4fz', 'hunter', 'active', 11000000, 5000000, 60),
  ('Lyndon Sumarli',       '1kvgov', 'hunter', 'active', 10000000, 4000000, 60),
  ('Jimmy Darmadi',        '1kusxr', 'hunter', 'active', 5780000,  3000000, 60),
  ('Al (Firyal Badriyyah)','1ku56n', 'hunter', 'active', 5450000,  3000000, 60),
  ('Aida (Rosmaida)',      '1kthfj', 'hunter', 'active', 8000000,  5000000, 50),
  ('Aldo (Rinaldo)',       '1kstof', 'hunter', 'active', 8000000,  5000000, 50),
  ('Frans',                '1ks5xb', 'hunter', 'active', 8000000,  5000000, 50),
  ('Andre',                '1kri67', 'hunter', 'active', 8000000,  5000000, 50),
  ('Prediman',             '1kquf3', 'hunter', 'active', 5000000,  2000000, 40),
  ('Ellen',                '1kw3nh', 'hunter', 'active', 5000000,  2000000, 40),
  ('Asun',                 '1kvfwd', 'hunter', 'active', 5000000,  2000000, 40)
ON CONFLICT (name) DO NOTHING;

SELECT 'Seed 002 selesai: ' || COUNT(*)::text || ' users' AS status FROM users;
