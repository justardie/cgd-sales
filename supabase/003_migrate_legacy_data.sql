-- ============================================================
-- CGD Sales Dashboard — Migration 003
-- Migrasi data historis Jan–Apr 2026 dari tabel legacy
-- ke tabel baru (closings, visit_logs)
--
-- CARA PAKAI:
-- Buka Supabase → SQL Editor → jalankan tiap bagian satu per satu
-- Mulai dari BAGIAN 1 (diagnostik) dulu sebelum BAGIAN 2/3
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- BAGIAN 1: DIAGNOSTIK — jalankan ini dulu
-- ══════════════════════════════════════════════════════════════

-- 1a. Lihat isi pipeline (data lama) — 20 terakhir
SELECT id, name, slhunter, sales, unit, value, status, visitdate, dateadded
FROM pipeline
ORDER BY ts DESC
LIMIT 20;

-- 1b. Ringkasan pipeline per status
SELECT status, COUNT(*) as jumlah, SUM(COALESCE(value,0)) as total_value
FROM pipeline
GROUP BY status
ORDER BY jumlah DESC;

-- 1c. Lihat isi tabel visits (data kunjungan lama) — 20 terakhir
SELECT * FROM visits ORDER BY ts DESC LIMIT 20;

-- 1d. Cek users yang ada (untuk mapping nama)
SELECT id, name, role, status FROM users ORDER BY name;

-- 1e. Cek closings sudah berisi data atau belum
SELECT COUNT(*) as total_closings FROM closings;

-- 1f. Cek visit_logs sudah berisi data atau belum
SELECT COUNT(*) as total_visit_logs FROM visit_logs;


-- ══════════════════════════════════════════════════════════════
-- BAGIAN 2: MIGRASI CLOSINGS
-- Pindahkan pipeline ber-status closed_won → tabel closings
-- Jalankan SETELAH melihat hasil BAGIAN 1
-- ══════════════════════════════════════════════════════════════

-- 2a. Preview — lihat data yang akan dipindahkan (tidak mengubah data)
SELECT
  p.id        AS pipeline_id,
  p.name      AS konsumen_name,
  p.sales     AS project,
  p.unit,
  p.value     AS closing_value,
  p.dateadded AS tanggal_raw,
  p.slhunter  AS nama_hunter_lama,
  u.name      AS user_ditemukan
FROM pipeline p
LEFT JOIN users u
  ON LOWER(u.name) LIKE '%' || LOWER(SPLIT_PART(TRIM(COALESCE(p.slhunter,'')), ' ', 1)) || '%'
  AND SPLIT_PART(TRIM(COALESCE(p.slhunter,'')), ' ', 1) <> ''
WHERE LOWER(p.status) IN ('closed_won','closed','closing','deal')
  AND COALESCE(p.value, 0) > 0
ORDER BY p.dateadded DESC;

-- 2b. Jalankan INSERT setelah preview terlihat benar
INSERT INTO closings (
  user_id, pipeline_id, konsumen_name, project, unit,
  closing_value, closing_date, month, year, notes
)
SELECT
  u.id                                                                AS user_id,
  p.id::text                                                          AS pipeline_id,
  COALESCE(NULLIF(TRIM(p.name),''), '(Tanpa Nama)')                  AS konsumen_name,
  NULLIF(TRIM(COALESCE(p.sales,'')), '')                             AS project,
  NULLIF(TRIM(COALESCE(p.unit,'')), '')                              AS unit,
  COALESCE(p.value, 0)                                               AS closing_value,
  COALESCE(p.dateadded::date, CURRENT_DATE)                          AS closing_date,
  EXTRACT(MONTH FROM COALESCE(p.dateadded::date, CURRENT_DATE))::int AS month,
  EXTRACT(YEAR  FROM COALESCE(p.dateadded::date, CURRENT_DATE))::int AS year,
  NULLIF(TRIM(COALESCE(p.note,'')), '')                              AS notes
FROM pipeline p
JOIN users u
  ON LOWER(u.name) LIKE '%' || LOWER(SPLIT_PART(TRIM(COALESCE(p.slhunter,'')), ' ', 1)) || '%'
  AND SPLIT_PART(TRIM(COALESCE(p.slhunter,'')), ' ', 1) <> ''
WHERE LOWER(p.status) IN ('closed_won','closed','closing','deal')
  AND COALESCE(p.value, 0) > 0
  AND u.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM closings c WHERE c.pipeline_id = p.id::text
  );

-- 2c. Verifikasi hasil — cek omset per bulan setelah migrasi
SELECT
  month, year,
  COUNT(*)              AS transaksi,
  SUM(closing_value)    AS total_omset
FROM closings
GROUP BY month, year
ORDER BY year, month;


-- ══════════════════════════════════════════════════════════════
-- BAGIAN 3: MIGRASI VISIT_LOGS
-- Pindahkan data tabel visits lama → tabel visit_logs baru
-- Jalankan HANYA jika tabel visits ada dan berisi data
-- ══════════════════════════════════════════════════════════════

-- 3a. Preview — cek nama kolom visits dan datanya
SELECT
  v.id,
  v.slhunter,
  v.date,
  v.count,
  v.project,
  v.note,
  u.name AS user_ditemukan
FROM visits v
LEFT JOIN users u
  ON LOWER(u.name) LIKE '%' || LOWER(SPLIT_PART(TRIM(COALESCE(v.slhunter,'')), ' ', 1)) || '%'
  AND SPLIT_PART(TRIM(COALESCE(v.slhunter,'')), ' ', 1) <> ''
LIMIT 20;

-- 3b. Insert ke visit_logs
INSERT INTO visit_logs (
  user_id, visit_date, visit_type, count,
  notes, week_number, month, year
)
SELECT
  u.id                                                                  AS user_id,
  COALESCE(v.date::date, CURRENT_DATE)                                  AS visit_date,
  'konsumen'                                                            AS visit_type,
  GREATEST(COALESCE(v.count, 1), 1)                                    AS count,
  NULLIF(TRIM(COALESCE(v.note,'')), '')                                AS notes,
  EXTRACT(WEEK  FROM COALESCE(v.date::date, CURRENT_DATE))::int        AS week_number,
  EXTRACT(MONTH FROM COALESCE(v.date::date, CURRENT_DATE))::int        AS month,
  EXTRACT(YEAR  FROM COALESCE(v.date::date, CURRENT_DATE))::int        AS year
FROM visits v
JOIN users u
  ON LOWER(u.name) LIKE '%' || LOWER(SPLIT_PART(TRIM(COALESCE(v.slhunter,'')), ' ', 1)) || '%'
  AND SPLIT_PART(TRIM(COALESCE(v.slhunter,'')), ' ', 1) <> ''
WHERE u.status = 'active'
  AND COALESCE(v.count, 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM visit_logs vl
    WHERE vl.user_id = u.id
      AND vl.visit_date = v.date::date
      AND vl.count = COALESCE(v.count, 1)
  );

-- 3c. Verifikasi
SELECT
  u.name,
  vl.month, vl.year,
  SUM(vl.count) AS total_visit
FROM visit_logs vl
JOIN users u ON vl.user_id = u.id
GROUP BY u.name, vl.month, vl.year
ORDER BY u.name, vl.year, vl.month;


-- ══════════════════════════════════════════════════════════════
-- BAGIAN 4: DISABLE RLS (wajib agar anon key bisa baca data)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE users               DISABLE ROW LEVEL SECURITY;
ALTER TABLE closings            DISABLE ROW LEVEL SECURITY;
ALTER TABLE visit_logs          DISABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline            DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_status_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities          DISABLE ROW LEVEL SECURITY;

-- Verifikasi RLS sudah off:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
