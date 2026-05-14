-- Add accompanied_count to visit_logs
-- Stores the "Didampingi Atasan" value from SP's Excel import
-- Used to compute hunter's visit realization = sum of their SPs' accompanied_count

ALTER TABLE visit_logs ADD COLUMN IF NOT EXISTS accompanied_count int NOT NULL DEFAULT 0;
