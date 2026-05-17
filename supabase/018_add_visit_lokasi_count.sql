-- Add visit_lokasi_count to visit_logs
-- Stores the "Visit Lokasi" value from the pivot Excel import separately
-- Required to check the SP minimum rule: Visit Lokasi >= 12 per month

ALTER TABLE visit_logs ADD COLUMN IF NOT EXISTS visit_lokasi_count int NOT NULL DEFAULT 0;
