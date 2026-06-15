-- ============================================================
-- 035_reassign_rosa_leads_to_yossi.sql
-- Pindahkan semua leads (leads nurture) dari Rosa ke Yossi.
-- Rosa Dwi → Yossi (semua assigned_to dialihkan, tidak ada
-- data lain yang diubah: status, notes, period, dll tetap sama).
-- ============================================================

-- 1. Cek user Rosa dan Yossi dulu (preview — tidak mengubah data)
SELECT id, name, role, status
FROM users
WHERE lower(name) LIKE '%rosa%'
   OR lower(name) LIKE '%yossi%'
   OR lower(name) LIKE '%yosi%'
ORDER BY name;

-- 2. Hitung leads milik Rosa sebelum dipindah
SELECT
  u.name       AS assigned_to_name,
  COUNT(*)     AS total_leads,
  COUNT(*) FILTER (WHERE l.status = 'new')                     AS new,
  COUNT(*) FILTER (WHERE l.status = 'tidak_aktif')             AS tidak_aktif,
  COUNT(*) FILTER (WHERE l.status = 'bisa_dihub_tidak_angkat') AS follow_up,
  COUNT(*) FILTER (WHERE l.status = 'angkat_tertarik')         AS tertarik,
  COUNT(*) FILTER (WHERE l.status = 'angkat_tidak_tertarik')   AS cold
FROM leads l
JOIN users u ON u.id = l.assigned_to
WHERE lower(u.name) LIKE '%rosa%'
GROUP BY u.name;

-- 3. Jalankan reassign
-- Ganti leads.assigned_to dari Rosa → Yossi
UPDATE leads
SET
  assigned_to = (
    SELECT id FROM users
    WHERE lower(name) LIKE '%yossi%'
       OR lower(name) LIKE '%yosi%'
    ORDER BY name
    LIMIT 1
  ),
  updated_at = now()
WHERE assigned_to = (
  SELECT id FROM users
  WHERE lower(name) LIKE '%rosa%'
  ORDER BY name
  LIMIT 1
);

-- 4. Verifikasi setelah reassign
SELECT
  u.name       AS assigned_to_name,
  COUNT(*)     AS total_leads
FROM leads l
JOIN users u ON u.id = l.assigned_to
WHERE lower(u.name) LIKE '%yossi%'
   OR lower(u.name) LIKE '%yosi%'
   OR lower(u.name) LIKE '%rosa%'
GROUP BY u.name
ORDER BY u.name;

-- 5. Pastikan Rosa sudah tidak punya leads lagi
SELECT COUNT(*) AS sisa_leads_rosa
FROM leads l
JOIN users u ON u.id = l.assigned_to
WHERE lower(u.name) LIKE '%rosa%';
