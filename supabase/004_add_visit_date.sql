-- ============================================================
-- CGD Sales Dashboard — Migration 004
-- Tambah kolom visit_date ke tabel closings
--
-- CARA PAKAI:
-- Buka Supabase → SQL Editor → jalankan seluruh file ini
-- ============================================================

-- Tambah kolom visit_date (nullable, karena data lama tidak punya nilai ini)
ALTER TABLE closings
  ADD COLUMN IF NOT EXISTS visit_date DATE;

-- Verifikasi kolom sudah ada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'closings'
ORDER BY ordinal_position;
