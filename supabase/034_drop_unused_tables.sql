-- Migration 034: Drop tables for deleted pages (Activities, Visit)
-- Run in Supabase SQL Editor after deleting Visit & Activities pages from code
--
-- Tables being dropped:
--   tasks        → used by Activities page (009_tasks_table.sql)
--   activities   → created in 001_init.sql, used by Activities page
--   visit_logs   → created in 001_init.sql, used by Visit page

-- Drop tasks table (from Migration 009)
DROP TABLE IF EXISTS tasks CASCADE;

-- Drop activities table
DROP TABLE IF EXISTS activities CASCADE;

-- Drop visit_logs table
DROP TABLE IF EXISTS visit_logs CASCADE;

-- Note: The old `visits` table (legacy data from migration) is kept as-is
-- since it contains historical data and is referenced by 003_migrate_legacy_data.sql

SELECT 'Migration 034 selesai ✓ — Tabel tasks, activities, visit_logs dihapus' AS status;
