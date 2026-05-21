-- Fix Asep Syaeful login: reset pin_hash (was "noop" — non-numeric, unenterable)
-- Also fixes any other admin/hunter users stuck with pin_hash = 'noop'

-- Reset Asep's PIN to 4437 — ubah angkanya sesuai keinginan
UPDATE users SET pin_hash = '4437' WHERE name ILIKE '%Asep%' AND role = 'admin';

-- Safety: fix any other user with pin_hash = 'noop' → null (will accept any PIN on login)
UPDATE users SET pin_hash = NULL WHERE pin_hash = 'noop';
