-- ── Expand users_role_check to include dgm and telemarketing ─────────────────
-- Run this BEFORE 020_add_tm_users.sql and 021_add_tm_access.sql

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'hunter', 'sales_person', 'telemarketing', 'dgm'));
