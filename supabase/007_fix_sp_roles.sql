-- ============================================================
-- CGD Sales Dashboard — Migration 007
-- 1. Update Sales Person roles: 'hunter' → 'sales_person'
-- 2. Add salesname column to closings (dedicated SP name field)
--
-- CARA PAKAI:
-- Buka Supabase → SQL Editor → jalankan seluruh file ini
-- ============================================================

-- 1. Update SP roles (40 Sales Persons registered via migration 006)
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

-- 2. Add salesname to closings (proper SP name field, separate from notes)
ALTER TABLE closings ADD COLUMN IF NOT EXISTS salesname TEXT;

-- 3. Migrate existing SP name data: notes → salesname for legacy entries
UPDATE closings
SET salesname = notes
WHERE notes IS NOT NULL AND notes != '' AND salesname IS NULL;

-- Verifikasi
SELECT role, count(*) AS jumlah FROM users GROUP BY role ORDER BY role;
