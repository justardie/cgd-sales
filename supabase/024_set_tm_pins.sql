-- ── Set default PINs for Sales Telemarketing users ───────────────────────────
-- The 9 TM users are existing sales_person accounts whose PINs may be unknown.
-- Reset them all to '1234' so they can log in immediately.
-- Admin should update individual PINs via the Admin page afterwards.

UPDATE users
SET    pin_hash = '1234'
WHERE  has_tm_access = true;

-- Also ensure Kadek has a known PIN
UPDATE users
SET    pin_hash = '1234'
WHERE  name = 'Kadek';

-- Show result — share these with the respective team members to set their own PIN
SELECT name, role, has_tm_access, pin_hash
FROM   users
WHERE  has_tm_access = true OR name = 'Kadek'
ORDER  BY name;
