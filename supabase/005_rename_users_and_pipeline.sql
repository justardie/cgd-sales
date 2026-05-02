-- ============================================================
-- CGD Sales Dashboard — Migration 005
-- 1. Rename Andre → Andriansyah (Andre)
-- 2. Rename Rika Sanusi / Asun → Rika Sanusi (Asun)
-- 3. Add salesname column to pipeline table
--
-- CARA PAKAI:
-- Buka Supabase → SQL Editor → jalankan seluruh file ini
-- ============================================================

-- 1. Rename Andre
UPDATE users
  SET name = 'Andriansyah (Andre)'
  WHERE name ILIKE '%andre%'
    AND name NOT ILIKE '%andriansyah%';

-- 2. Rename Asun / Rika Sanusi
UPDATE users
  SET name = 'Rika Sanusi (Asun)'
  WHERE name ILIKE '%asun%'
     OR (name ILIKE '%rika%' AND name NOT ILIKE 'rika sanusi (asun)');

-- 3. Add salesname column to pipeline (nullable, legacy rows will be NULL)
ALTER TABLE pipeline
  ADD COLUMN IF NOT EXISTS salesname TEXT;

-- Verifikasi
SELECT id, name FROM users ORDER BY name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pipeline'
ORDER BY ordinal_position;
