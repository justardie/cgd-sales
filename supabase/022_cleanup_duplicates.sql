-- ── Remove duplicate users caused by re-running migration 020 ────────────────
-- Keeps the most recently created row for each duplicated name.

DELETE FROM users
WHERE id NOT IN (
  SELECT DISTINCT ON (name) id
  FROM   users
  ORDER  BY name, created_at DESC
);

-- Verify: every name should now appear exactly once
SELECT name, role, status, created_at
FROM   users
ORDER  BY name;
