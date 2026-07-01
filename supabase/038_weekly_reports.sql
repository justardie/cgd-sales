ALTER TABLE users ADD COLUMN IF NOT EXISTS project_coverage TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hunter_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final')),
  activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  visit_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  snapshot JSONB,
  pivot_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  UNIQUE(user_id, period_start, period_end)
);
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_reports_anon_all" ON weekly_reports FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "weekly_reports_service_all" ON weekly_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

DO $$
DECLARE pair TEXT[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY ARRAY[
    ARRAY['Alvin Rahmad','Alvin Rahmad Habibullah'], ARRAY['Amos Marihot','Amos Marihot Panggabean'],
    ARRAY['Crisna Ardhianysah','Crisna Ardhiansyah'], ARRAY['Gallih Dwi Gumelar','Gallih Dwi Gumellar'],
    ARRAY['Lenni Natalia','Lenni Natalia Marpaung'], ARRAY['M. Fadjri Saputra','M Fadjri Saputra'],
    ARRAY['M. Fiqri','M. Fiqri Zam Zami'], ARRAY['Muhammad Rafie','Muhammad Rafie Alfany'],
    ARRAY['Riezkya Adella','Riezkya Adella Hayuningtyas'], ARRAY['Sentia Julika','Sentia Julika Putri'],
    ARRAY['Tri Andy Kurniawan','Tri Andi Kurniawan']
  ] LOOP
    UPDATE users SET name=pair[2] WHERE name=pair[1] AND status='active';
    UPDATE konsumen SET sales_person=pair[2] WHERE sales_person=pair[1];
  END LOOP;
END $$;
