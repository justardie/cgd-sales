-- Fix Asep Syaeful login: reset pin_hash (was "noop" — non-numeric, unenterable)
-- Also fixes any other user stuck with pin_hash = 'noop' (created via admin panel without PIN)

-- Reset Asep's PIN to 4437 — ubah angkanya sesuai keinginan
UPDATE users SET pin_hash = '4437' WHERE name ILIKE '%Asep%' AND role = 'admin';

-- Safety: fix ALL users with pin_hash = 'noop' → default PIN 1234
-- (pin_hash column is NOT NULL so cannot be set to null)
UPDATE users SET pin_hash = '1234' WHERE pin_hash = 'noop';
