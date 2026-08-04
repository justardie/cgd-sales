-- Store Sales Telemarketing as sales_person + has_tm_access only.
-- User IDs and all sales data remain unchanged.

BEGIN;

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

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'hunter', 'sales_person', 'dgm', 'admin_dgm', 'task_force'));

COMMIT;

SELECT role, has_tm_access, COUNT(*)
FROM public.users
GROUP BY role, has_tm_access
ORDER BY role, has_tm_access;
