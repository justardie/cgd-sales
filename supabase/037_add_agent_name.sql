ALTER TABLE konsumen
  ADD COLUMN IF NOT EXISTS agent_name TEXT;

COMMENT ON COLUMN konsumen.agent_name IS
  'Nama agent ketika sales_person bernilai Agent; nullable untuk data lama.';
