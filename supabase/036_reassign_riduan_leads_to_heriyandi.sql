-- ============================================================
-- 036_reassign_riduan_leads_to_heriyandi.sql
-- Pindahkan semua leads (leads nurture) dari Riduan ke Heriyandi.
-- Riduan Hasudungan Hutabarat → Heriyandi
-- Hanya assigned_to yang berubah; semua data lain tetap sama.
-- ============================================================

-- 1. Cek user Riduan dan Heriyandi (preview — tidak mengubah data)
SELECT id, name, role, status
FROM users
WHERE lower(name) LIKE '%riduan%'
   OR lower(name) LIKE '%heriyandi%'
ORDER BY name;

-- 2. Hitung leads milik Riduan sebelum dipindah
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
WHERE lower(u.name) LIKE '%riduan%'
GROUP BY u.name;

-- 3. Jalankan reassign
UPDATE leads
SET
  assigned_to = (
    SELECT id FROM users
    WHERE lower(name) LIKE '%heriyandi%'
    ORDER BY name
    LIMIT 1
  ),
  updated_at = now()
WHERE assigned_to = (
  SELECT id FROM users
  WHERE lower(name) LIKE '%riduan%'
  ORDER BY name
  LIMIT 1
);

-- 4. Verifikasi setelah reassign
SELECT
  u.name       AS assigned_to_name,
  COUNT(*)     AS total_leads
FROM leads l
JOIN users u ON u.id = l.assigned_to
WHERE lower(u.name) LIKE '%heriyandi%'
   OR lower(u.name) LIKE '%riduan%'
GROUP BY u.name
ORDER BY u.name;

-- 5. Pastikan Riduan sudah tidak punya leads lagi
SELECT COUNT(*) AS sisa_leads_riduan
FROM leads l
JOIN users u ON u.id = l.assigned_to
WHERE lower(u.name) LIKE '%riduan%';
