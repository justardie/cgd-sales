-- Fix hunter_name values in users table to match hunters.ts dbName exactly
-- Run this in Supabase SQL Editor

-- Andre's team: was 'Andre', must match dbName 'Andriansyah (Andre)'
UPDATE users
SET hunter_name = 'Andriansyah (Andre)'
WHERE hunter_name = 'Andre';

-- Verify Andre's team
SELECT name, hunter_name, role, status
FROM users
WHERE hunter_name = 'Andriansyah (Andre)'
ORDER BY name;
