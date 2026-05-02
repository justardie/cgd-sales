-- CGD Sales Dashboard -- Reset & Seed Users
-- PIN mapping:
--   Ardie           = 4436  |  Aida (Rosmaida) = 6001
--   Roy             = 5001  |  Aldo (Rinaldo)  = 6002
--   Lyndon          = 5002  |  Frans           = 6003
--   Jimmy           = 5003  |  Andre           = 6004
--   Firyal          = 5004  |  Prediman        = 6005
--                           |  Ellen           = 6006
--                           |  Asun            = 6007

TRUNCATE TABLE activities, closings, visit_logs, users RESTART IDENTITY CASCADE;

INSERT INTO users (name, pin_hash, role, status, monthly_target, win_or_die_target, visit_target) VALUES
  ('Ardie',             '1ku57g', 'admin',  'active', 0,        0,       0),
  ('Roy Ferdinand H.',  '1ktl9f', 'hunter', 'active', 11000000, 5000000, 60),
  ('Lyndon Sumarli',    '1ktl9e', 'hunter', 'active', 10000000, 4000000, 60),
  ('Jimmy Darmadi',     '1ktl9d', 'hunter', 'active', 5780000,  3000000, 60),
  ('Firyal Badriyyah',  '1ktl9c', 'hunter', 'active', 5450000,  3000000, 60),
  ('Aida (Rosmaida)',   '1ksy9w', 'hunter', 'active', 8000000,  5000000, 50),
  ('Aldo (Rinaldo)',    '1ksy9v', 'hunter', 'active', 8000000,  5000000, 50),
  ('Frans',             '1ksy9u', 'hunter', 'active', 8000000,  5000000, 50),
  ('Andre',             '1ksy9t', 'hunter', 'active', 8000000,  5000000, 50),
  ('Prediman',          '1ksy9s', 'hunter', 'active', 5000000,  2000000, 40),
  ('Ellen',             '1ksy9r', 'hunter', 'active', 5000000,  2000000, 40),
  ('Asun',              '1ksy9q', 'hunter', 'active', 5000000,  2000000, 40);

SELECT name, role, visit_target FROM users ORDER BY role DESC, name;
