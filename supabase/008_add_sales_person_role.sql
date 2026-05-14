-- ============================================================
-- CGD Sales Dashboard — Migration 008
-- Fix: expand users_role_check constraint to include 'sales_person'
-- Then re-run the SP role updates from migration 007
--
-- CARA PAKAI:
-- Buka Supabase → SQL Editor → jalankan seluruh file ini
-- ============================================================

-- 1. Drop the existing role check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Add updated constraint that includes 'sales_person'
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'hunter', 'sales_person'));

-- 3. Now update SP roles (same as migration 007, safe to re-run)
UPDATE users SET role = 'sales_person'
WHERE name IN (
  -- Lyndon Sumarli's SPs
  'Heriyandi', 'Riduan Hasudungan Hutabarat', 'Tiar Riki Aryanto', 'Mhd Sidiq Abdussalam',
  -- Firyal Badriyyah's SP
  'Adi Chandra',
  -- Aida (Rosmaida)'s SPs
  'Achmad Rian', 'M. Fadjri Saputra', 'Lenni Natalia', 'Seprita Rahma', 'M. Fiqri', 'Vio Wahyuda',
  -- Rinaldo (Aldo)'s SPs
  'Yossi Eka Nofrita', 'Rosa Dwi Vanesa', 'Abel Shevcenko', 'Noer Roelloh', 'Muhammad Rayyan', 'Ela Magdalena Andrint',
  -- Frans's SPs
  'M. Amirullah', 'Shinta Okvianti', 'Nisa Nur fadhila',
  -- Andriansyah (Andre)'s SPs
  'Riezkya Adella', 'Risa Opiani', 'Ari Kurnia Sandy', 'Syarah Mustika', 'Kanigia Lubis', 'Salsabila Rahman', 'Dea Alvony Agista',
  -- Prediman's SPs
  'Crisna Ardhianysah', 'Muhammad Rafie', 'Maria Oktavaini', 'Gallih Dwi Gumelar',
  -- Elen Rulita's SPs
  'Amos Marihot', 'Ferdinan Bangun', 'Nurlela', 'Febry Nairi', 'Tri Andy Kurniawan',
  -- Rika Sanusi (Asun)'s SPs
  'Santoso', 'Sentia Julika', 'Rio Pratama', 'Eka Vitria Lestari'
);

-- 4. Add salesname column to closings (safe to re-run)
ALTER TABLE closings ADD COLUMN IF NOT EXISTS salesname TEXT;

-- 5. Migrate legacy SP name data: notes → salesname
UPDATE closings
SET salesname = notes
WHERE notes IS NOT NULL AND notes != '' AND salesname IS NULL;

-- Verifikasi
SELECT role, count(*) AS jumlah FROM users GROUP BY role ORDER BY role;
