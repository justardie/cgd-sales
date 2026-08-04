-- Store Sales Telemarketing as sales_person + has_tm_access only.
-- User IDs and all sales data remain unchanged.

BEGIN;

DO $$
DECLARE
  role_data_type TEXT;
  tm_access_data_type TEXT;
  role_constraint_definition TEXT;
  normalized_constraint_definition TEXT;
BEGIN
  SELECT data_type INTO role_data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role';

  IF role_data_type IS NULL THEN
    RAISE EXCEPTION 'Missing required public.users.role column';
  ELSIF role_data_type <> 'text' THEN
    RAISE EXCEPTION 'Unexpected public.users.role type: %', role_data_type;
  END IF;

  SELECT data_type INTO tm_access_data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'has_tm_access';

  IF tm_access_data_type IS NULL THEN
    RAISE EXCEPTION 'Missing required public.users.has_tm_access column';
  ELSIF tm_access_data_type <> 'boolean' THEN
    RAISE EXCEPTION 'Unexpected public.users.has_tm_access type: %', tm_access_data_type;
  END IF;

  SELECT pg_get_constraintdef(c.oid) INTO role_constraint_definition
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'users'
    AND c.conname = 'users_role_check'
    AND c.contype = 'c';

  IF role_constraint_definition IS NULL THEN
    RAISE EXCEPTION 'Missing public.users users_role_check constraint';
  END IF;

  normalized_constraint_definition := regexp_replace(role_constraint_definition, '[[:space:]]+', '', 'g');
  IF normalized_constraint_definition NOT IN (
    'CHECK((role=ANY(ARRAY[''admin''::text,''hunter''::text,''sales_person''::text,''telemarketing''::text,''dgm''::text,''admin_dgm''::text,''task_force''::text])))',
    'CHECK((role=ANY(ARRAY[''admin''::text,''hunter''::text,''sales_person''::text,''dgm''::text,''admin_dgm''::text,''task_force''::text])))'
  ) THEN
    RAISE EXCEPTION 'Unexpected public.users users_role_check definition: %', role_constraint_definition;
  END IF;

  RAISE NOTICE 'Role schema preflight passed';
END $$;

LOCK TABLE public.users IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  legacy_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO legacy_count
  FROM public.users
  WHERE role = 'telemarketing';

  UPDATE public.users
  SET role = 'sales_person', has_tm_access = true
  WHERE role = 'telemarketing';

  IF EXISTS (SELECT 1 FROM public.users WHERE role = 'telemarketing') THEN
    RAISE EXCEPTION 'Legacy telemarketing roles remain after migration';
  END IF;

  RAISE NOTICE 'Migrated % legacy Telemarketing users', legacy_count;
END $$;

ALTER TABLE public.users DROP CONSTRAINT users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'hunter', 'sales_person', 'dgm', 'admin_dgm', 'task_force'));

COMMIT;

SELECT role, has_tm_access, COUNT(*)
FROM public.users
GROUP BY role, has_tm_access
ORDER BY role, has_tm_access;
