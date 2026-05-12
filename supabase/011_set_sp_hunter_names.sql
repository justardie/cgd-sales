-- Add hunter_name column if it doesn't exist, then populate it
-- Run this in Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS hunter_name text;

-- Lyndon Sumarli's team
UPDATE users SET hunter_name = 'Lyndon Sumarli'
WHERE role = 'sales_person'
  AND name IN ('Heriyandi', 'Riduan Hasudungan Hutabarat', 'Tiar Riki Aryanto', 'Mhd Sidiq Abdussalam');

-- Firyal Badriyyah (Al)'s team
UPDATE users SET hunter_name = 'Firyal Badriyyah'
WHERE role = 'sales_person'
  AND name IN ('Adi Chandra');

-- Aida (Rosmaida)'s team
UPDATE users SET hunter_name = 'Aida (Rosmaida)'
WHERE role = 'sales_person'
  AND name IN ('M. Fadjri Saputra', 'Lenni Natalia', 'Seprita Rahma', 'M. Fiqri', 'Vio Wahyuda');

-- Aldo (Rinaldo)'s team
UPDATE users SET hunter_name = 'Aldo (Rinaldo)'
WHERE role = 'sales_person'
  AND name IN ('Yossi Eka Nofrita', 'Rosa Dwi Vanesa', 'Abel Shevcenko', 'Noer Roelloh', 'Ela Magdalena Andrint');

-- Frans's team
UPDATE users SET hunter_name = 'Frans'
WHERE role = 'sales_person'
  AND name IN ('M. Amirullah', 'Shinta Okvianti', 'Nisa Nur fadhila');

-- Andre's team
UPDATE users SET hunter_name = 'Andre'
WHERE role = 'sales_person'
  AND name IN ('Riezkya Adella', 'Risa Opiani', 'Ari Kurnia Sandy', 'Syarah Mustika', 'Kanigia Lubis', 'Salsabila Rahman', 'Dea Alvony Agista');

-- Prediman's team
UPDATE users SET hunter_name = 'Prediman'
WHERE role = 'sales_person'
  AND name IN ('Crisna Ardhianysah', 'Muhammad Rafie', 'Maria Oktavaini', 'Gallih Dwi Gumelar');

-- Ellen's team
UPDATE users SET hunter_name = 'Ellen'
WHERE role = 'sales_person'
  AND name IN ('Amos Marihot', 'Ferdinan Bangun', 'Nurlela', 'Febry Nairi', 'Tri Andy Kurniawan');

-- Rika Sanusi's team
UPDATE users SET hunter_name = 'Rika Sanusi'
WHERE role = 'sales_person'
  AND name IN ('Santoso', 'Sentia Julika', 'Rio Pratama', 'Eka Vitria Lestari');

-- Verify result
SELECT name, hunter_name, role, status
FROM users
WHERE role = 'sales_person'
ORDER BY hunter_name, name;
