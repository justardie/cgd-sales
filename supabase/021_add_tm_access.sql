-- ── TM Access flag on existing users ────────────────────────────────────────
-- Instead of separate 'telemarketing' role accounts, we flag existing
-- sales_person accounts with has_tm_access = true so they keep their normal
-- sales access AND can also use /funnel and /funnel-summary.

ALTER TABLE users ADD COLUMN IF NOT EXISTS has_tm_access boolean NOT NULL DEFAULT false;

-- Grant funnel access to the 9 designated telemarketing sales persons
UPDATE users
SET    has_tm_access = true
WHERE  name IN (
  'Shinta Okvianti',
  'Dea Alvony Agista',
  'M. Fadjri Saputra',
  'Ela Magdalena Andrint',
  'Riduan Hasudungan Hutabarat',
  'Adi Chandra',
  'Ferdinan Bangun',
  'Maria Oktavaini',
  'Nurlela'
);

-- Fix hunter_name for Dea Alvony Agista: migration 011 set it to 'Andre'
-- but the hunter's DB name is 'Andriansyah (Andre)' — funnel page matches on user.name.
UPDATE users
SET    hunter_name = 'Andriansyah (Andre)'
WHERE  name = 'Dea Alvony Agista';

-- Verify
SELECT name, role, has_tm_access, hunter_name
FROM   users
WHERE  has_tm_access = true
ORDER  BY name;
