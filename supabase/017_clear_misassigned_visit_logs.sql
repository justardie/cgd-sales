-- Clear all visit_logs data that was mis-assigned during old import
-- (old import always stored records under the logged-in admin's user_id,
--  not under the actual SP/hunter the row belonged to)
-- Run this ONCE in Supabase SQL Editor before re-importing visit data via the new Excel import.

TRUNCATE TABLE visit_logs;

-- Verify table is empty
SELECT COUNT(*) AS remaining_rows FROM visit_logs;
