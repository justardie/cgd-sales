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

-- 3. Insert 5 task_force users with PIN 1234
INSERT INTO users (name, pin_hash, role, status, monthly_target, win_or_die_target, visit_target, has_tm_access)
VALUES
  ('Arafah',  '1234', 'task_force', 'active', 0, 0, 0, false),
  ('Claudia', '1234', 'task_force', 'active', 0, 0, 0, false),
  ('Susi',    '1234', 'task_force', 'active', 0, 0, 0, false),
  ('Devy',    '1234', 'task_force', 'active', 0, 0, 0, false),
  ('Jenny',   '1234', 'task_force', 'active', 0, 0, 0, false)
ON CONFLICT (name) DO UPDATE
  SET role      = 'task_force',
      pin_hash  = '1234',
      status    = 'active';
