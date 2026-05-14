-- ============================================================
-- 014_normalize_project_names.sql
-- Standardise all project names in konsumen table to canonical
-- abbreviated form. Run once in Supabase SQL Editor.
--
-- Canonical names:
--   CH | CT | MRD CRBA+CBA | CRT | MRD CRTU | MRD CLH
--   SCC - Hillside | SCC - Valleyside
--
-- NOTE: standalone "MRD" / "residential" is NOT a valid project.
--       Those records must be investigated manually (see bottom).
-- ============================================================

-- 1. CH — Central Hills
UPDATE konsumen
SET project = 'CH'
WHERE project ~* 'central[\s\-]*hills'
   OR project = 'CH';

-- 2. CT — Central Tiban (bukan Central Raya Tiban)
UPDATE konsumen
SET project = 'CT'
WHERE (project ~* 'central[\s\-]*tiban' AND project !~* 'raya')
   OR project = 'CT';

-- 3. MRD CRBA+CBA — Central Raya Batu Aji + Central Batu Aji
UPDATE konsumen
SET project = 'MRD CRBA+CBA'
WHERE project ~* 'central[\s\-]*(raya[\s\-]*)?batu'
   OR project ~* '^(CBA|CRBA|MRD[\s\-]*CRBA)$';

-- 4. CRT — Central Raya Tiban (bukan Tanjung Uncang)
UPDATE konsumen
SET project = 'CRT'
WHERE (project ~* 'central[\s\-]*raya[\s\-]*tiban' AND project !~* 'uncang')
   OR project = 'CRT';

-- 5. MRD CRTU — Central Raya Tanjung Uncang
UPDATE konsumen
SET project = 'MRD CRTU'
WHERE project ~* 'tanjung'
   OR project ~* 'uncang'
   OR project ~* '^(CRTU|MRD[\s\-]*CRTU)$';

-- 6. MRD CLH — Central Laguna Hills
UPDATE konsumen
SET project = 'MRD CLH'
WHERE project ~* 'laguna'
   OR project ~* '^(CLH|CLB|MRD[\s\-]*CLH)$';

-- 7. SCC - Hillside
UPDATE konsumen
SET project = 'SCC - Hillside'
WHERE project ~* 'hillside';

-- 8. SCC - Valleyside
UPDATE konsumen
SET project = 'SCC - Valleyside'
WHERE project ~* 'valleyside';

-- ============================================================
-- STEP 2 — INVESTIGASI record dengan project "MRD" / "residential"
-- Jalankan query ini SEBELUM update manual:
-- ============================================================
-- SELECT id, name, project, sales_hunter, sales_person, status, unit
-- FROM konsumen
-- WHERE project ~* '^MRD$'
--    OR project ~* 'residential'
-- ORDER BY created_at DESC;

-- Setelah dikonfirmasi, update manual ke sub-project yang tepat:
-- UPDATE konsumen SET project = 'MRD CRBA+CBA' WHERE id IN ('...','...');
-- UPDATE konsumen SET project = 'MRD CRTU'     WHERE id IN ('...','...');
-- UPDATE konsumen SET project = 'MRD CLH'      WHERE id IN ('...','...');

-- ============================================================
-- STEP 3 — Verifikasi: semua nilai harus canonical
-- ============================================================
-- SELECT DISTINCT project, COUNT(*) AS total
-- FROM konsumen
-- GROUP BY project
-- ORDER BY project;
