-- Set plain 4-digit PINs for Sales Hunter and Admin users
-- Run this migration in Supabase SQL editor

UPDATE users SET pin_hash = '4436' WHERE name ILIKE '%Ardie%';
UPDATE users SET pin_hash = '5001' WHERE name ILIKE '%Roy%';
UPDATE users SET pin_hash = '5002' WHERE name ILIKE '%Lyndon%';
UPDATE users SET pin_hash = '5003' WHERE name ILIKE '%Jimmy%';
UPDATE users SET pin_hash = '5004' WHERE name ILIKE '%Firyal%';
UPDATE users SET pin_hash = '6001' WHERE name ILIKE '%Aida%' OR name ILIKE '%Rosmaida%';
UPDATE users SET pin_hash = '6002' WHERE name ILIKE '%Aldo%' OR name ILIKE '%Rinaldo%';
UPDATE users SET pin_hash = '6003' WHERE name ILIKE '%Frans%';
UPDATE users SET pin_hash = '6004' WHERE name ILIKE '%Andre%';
UPDATE users SET pin_hash = '6005' WHERE name ILIKE '%Prediman%';
UPDATE users SET pin_hash = '6006' WHERE name ILIKE '%Ellen%';
UPDATE users SET pin_hash = '6007' WHERE name ILIKE '%Rika%' OR name ILIKE '%Asun%';
