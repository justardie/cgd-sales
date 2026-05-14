-- ============================================================
-- 015_rename_asun_to_rika_sanusi.sql
-- Normalise sales_hunter 'Asun' → 'Rika Sanusi' in konsumen.
-- ONLY touches konsumen.sales_hunter — users table untouched
-- so login credentials are NOT affected.
-- ============================================================

UPDATE konsumen
SET sales_hunter = 'Rika Sanusi'
WHERE sales_hunter = 'Asun';

-- Verifikasi: tidak boleh ada 'Asun' tersisa
-- SELECT COUNT(*) FROM konsumen WHERE sales_hunter = 'Asun';  → expected 0

-- Cek semua distinct sales_hunter setelah update:
-- SELECT DISTINCT sales_hunter, COUNT(*) AS total
-- FROM konsumen GROUP BY sales_hunter ORDER BY sales_hunter;
