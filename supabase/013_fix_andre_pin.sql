-- Fix: set PIN for Andriansyah (Andre) explicitly
-- Run this in Supabase SQL editor

UPDATE users SET pin_hash = '6004' WHERE name ILIKE '%Andriansyah%';
UPDATE users SET pin_hash = '6004' WHERE name ILIKE '%Andre%';

-- Verify
SELECT id, name, role, status, pin_hash FROM users WHERE name ILIKE '%Andre%' OR name ILIKE '%Andriansyah%';
