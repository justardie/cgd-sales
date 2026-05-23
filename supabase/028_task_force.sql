-- ============================================================
-- 028_task_force.sql
-- Add Task Force role + board column + 5 TF users (PIN 1234)
-- ============================================================

-- 1. Add board column to konsumen (default 'pipeline' for all existing rows)
ALTER TABLE konsumen ADD COLUMN IF NOT EXISTS board TEXT NOT NULL DEFAULT 'pipeline';

-- 2. Expand role check constraint to include 'task_force'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'hunter', 'sales_person', 'telemarketing', 'dgm', 'admin_dgm', 'task_force'));

-- 3. Upsert 5 task_force users with PIN 1234
--    Pattern: UPDATE existing, then INSERT if not exists (no unique constraint on name)

-- Arafah
UPDATE users SET role = 'task_force', pin_hash = '1234', status = 'active' WHERE name = 'Arafah';
INSERT INTO users (name, pin_hash, role, status, monthly_target, win_or_die_target, visit_target, has_tm_access)
  SELECT 'Arafah', '1234', 'task_force', 'active', 0, 0, 0, false
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE name = 'Arafah');

-- Claudia
UPDATE users SET role = 'task_force', pin_hash = '1234', status = 'active' WHERE name = 'Claudia';
INSERT INTO users (name, pin_hash, role, status, monthly_target, win_or_die_target, visit_target, has_tm_access)
  SELECT 'Claudia', '1234', 'task_force', 'active', 0, 0, 0, false
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE name = 'Claudia');

-- Susi
UPDATE users SET role = 'task_force', pin_hash = '1234', status = 'active' WHERE name = 'Susi';
INSERT INTO users (name, pin_hash, role, status, monthly_target, win_or_die_target, visit_target, has_tm_access)
  SELECT 'Susi', '1234', 'task_force', 'active', 0, 0, 0, false
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE name = 'Susi');

-- Devy
UPDATE users SET role = 'task_force', pin_hash = '1234', status = 'active' WHERE name = 'Devy';
INSERT INTO users (name, pin_hash, role, status, monthly_target, win_or_die_target, visit_target, has_tm_access)
  SELECT 'Devy', '1234', 'task_force', 'active', 0, 0, 0, false
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE name = 'Devy');

-- Jenny
UPDATE users SET role = 'task_force', pin_hash = '1234', status = 'active' WHERE name = 'Jenny';
INSERT INTO users (name, pin_hash, role, status, monthly_target, win_or_die_target, visit_target, has_tm_access)
  SELECT 'Jenny', '1234', 'task_force', 'active', 0, 0, 0, false
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE name = 'Jenny');
