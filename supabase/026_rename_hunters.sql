-- Rename hunters to short names everywhere (users table, konsumen table, hunter_name references)
-- Removes duplication: Andriansyah (Andre) -> Andre, Aldo (Rinaldo) -> Aldo, Aida (Rosmaida) -> Aida

-- 1. Update users.name (affects login dropdown & session)
UPDATE users SET name = 'Andre' WHERE name IN ('Andriansyah (Andre)', 'Andriansyah');
UPDATE users SET name = 'Aldo'  WHERE name IN ('Aldo (Rinaldo)', 'Rinaldo');
UPDATE users SET name = 'Aida'  WHERE name IN ('Aida (Rosmaida)', 'Rosmaida');

-- 2. Update users.hunter_name (TM staff assigned to these hunters)
UPDATE users SET hunter_name = 'Andre' WHERE hunter_name IN ('Andriansyah (Andre)', 'Andriansyah');
UPDATE users SET hunter_name = 'Aldo'  WHERE hunter_name IN ('Aldo (Rinaldo)', 'Rinaldo');
UPDATE users SET hunter_name = 'Aida'  WHERE hunter_name IN ('Aida (Rosmaida)', 'Rosmaida');

-- 3. Update konsumen.sales_hunter (pipeline records)
UPDATE konsumen SET sales_hunter = 'Andre' WHERE sales_hunter IN ('Andriansyah (Andre)', 'Andriansyah');
UPDATE konsumen SET sales_hunter = 'Aldo'  WHERE sales_hunter IN ('Aldo (Rinaldo)', 'Rinaldo');
UPDATE konsumen SET sales_hunter = 'Aida'  WHERE sales_hunter IN ('Aida (Rosmaida)', 'Rosmaida');

-- 4. Fix KPR Bank -> KPR Indent
UPDATE konsumen SET cara_bayar = 'KPR Indent' WHERE cara_bayar = 'KPR Bank';
