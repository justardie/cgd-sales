-- ── Add Kadek (DGM) ──────────────────────────────────────────────────────────
-- role 'dgm' → uploads leads, sees all TM data, restricted to /funnel pages only.
-- The 9 Sales Telemarketing use their existing sales_person accounts — see 021.
-- PIN defaults to '1234' — update via Admin page.

INSERT INTO users (name, role, status, pin_hash, hunter_name, monthly_target, win_or_die_target, visit_target)
VALUES
  ('Kadek', 'dgm', 'active', '1234', '', 0, 0, 0)
ON CONFLICT DO NOTHING;
