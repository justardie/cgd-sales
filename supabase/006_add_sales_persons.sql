-- ============================================================
-- CGD Sales Dashboard — Migration 006
-- 1. Rename "Andre" → "Andriansyah (Andre)"
-- 2. Rename "Asun"  → "Rika Sanusi (Asun)"
-- 3. Register all Sales Persons into users table
--    (skip any that already exist by name)
--
-- CARA PAKAI:
-- Buka Supabase → SQL Editor → jalankan seluruh file ini
-- ============================================================

-- 1. Rename Andre (exact match from 002_seed.sql)
UPDATE users SET name = 'Andriansyah (Andre)'
  WHERE name = 'Andre';

-- 2. Rename Asun (exact match from 002_seed.sql)
UPDATE users SET name = 'Rika Sanusi (Asun)'
  WHERE name = 'Asun';

-- 3. Insert all Sales Persons (skip duplicates by name)
INSERT INTO users (name, pin_hash, role, status, monthly_target, win_or_die_target, visit_target)
SELECT sp.name, 'noop', 'hunter', 'active', 0, 0, 0
FROM (VALUES
  -- Lyndon Sumarli's SPs
  ('Heriyandi'),
  ('Riduan Hasudungan Hutabarat'),
  ('Tiar Riki Aryanto'),
  ('Mhd Sidiq Abdussalam'),
  -- Firyal Badriyyah's SP
  ('Adi Chandra'),
  -- Aida (Rosmaida)'s SPs
  ('Achmad Rian'),
  ('M. Fadjri Saputra'),
  ('Lenni Natalia'),
  ('Seprita Rahma'),
  ('M. Fiqri'),
  ('Vio Wahyuda'),
  -- Aldo (Rinaldo)'s SPs
  ('Yossi Eka Nofrita'),
  ('Rosa Dwi Vanesa'),
  ('Abel Shevcenko'),
  ('Noer Roelloh'),
  ('Muhammad Rayyan'),
  ('Ela Magdalena Andrint'),
  -- Frans's SPs
  ('M. Amirullah'),
  ('Shinta Okvianti'),
  ('Nisa Nur fadhila'),
  -- Andriansyah (Andre)'s SPs
  ('Riezkya Adella'),
  ('Risa Opiani'),
  ('Ari Kurnia Sandy'),
  ('Syarah Mustika'),
  ('Kanigia Lubis'),
  ('Salsabila Rahman'),
  ('Dea Alvony Agista'),
  -- Prediman's SPs
  ('Crisna Ardhianysah'),
  ('Muhammad Rafie'),
  ('Maria Oktavaini'),
  ('Gallih Dwi Gumelar'),
  -- Ellen's SPs
  ('Amos Marihot'),
  ('Ferdinan Bangun'),
  ('Nurlela'),
  ('Febry Nairi'),
  ('Tri Andy Kurniawan'),
  -- Rika Sanusi (Asun)'s SPs
  ('Santoso'),
  ('Sentia Julika'),
  ('Rio Pratama'),
  ('Eka Vitria Lestari')
) AS sp(name)
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.name = sp.name
);

-- Verifikasi
SELECT name, role, status FROM users ORDER BY role DESC, name;
