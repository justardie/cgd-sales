-- ── Add admin_dgm role and update Kadek ──────────────────────────────────────

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'hunter', 'sales_person', 'telemarketing', 'dgm', 'admin_dgm'));

-- Update Kadek's role from dgm → admin_dgm
UPDATE users SET role = 'admin_dgm' WHERE name = 'Kadek';

-- Verify
SELECT name, role, pin_hash FROM users WHERE name = 'Kadek';
