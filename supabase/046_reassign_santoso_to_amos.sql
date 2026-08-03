-- Replace Santoso with Amos Marihot Panggabean in Sales Telemarketing and
-- move only Funnel leads. No pipeline, closing, task-force, lead status,
-- notes, period, or timestamp changes.

BEGIN;

DO $$
DECLARE
  santoso_id UUID;
  amos_id UUID;
  santoso_tm_access BOOLEAN;
  amos_tm_access BOOLEAN;
  santoso_lead_count BIGINT;
  amos_lead_count BIGINT;
BEGIN
  SELECT id, has_tm_access INTO STRICT santoso_id, santoso_tm_access
  FROM public.users
  WHERE name = 'Santoso' AND status = 'active'
  FOR UPDATE;

  SELECT id, has_tm_access INTO STRICT amos_id, amos_tm_access
  FROM public.users
  WHERE name = 'Amos Marihot Panggabean' AND status = 'active'
  FOR UPDATE;

  PERFORM 1
  FROM public.leads
  WHERE assigned_to IN (santoso_id, amos_id)
  FOR UPDATE;

  SELECT COUNT(*) INTO santoso_lead_count FROM public.leads WHERE assigned_to = santoso_id;
  SELECT COUNT(*) INTO amos_lead_count FROM public.leads WHERE assigned_to = amos_id;

  IF santoso_lead_count <> 1649 OR amos_lead_count <> 0 THEN
    RAISE EXCEPTION 'Lead counts changed after dry-run: Santoso %, Amos %', santoso_lead_count, amos_lead_count;
  END IF;

  IF NOT santoso_tm_access OR NOT amos_tm_access THEN
    RAISE EXCEPTION 'TM access changed after dry-run: Santoso %, Amos %', santoso_tm_access, amos_tm_access;
  END IF;

  UPDATE public.users SET has_tm_access = false WHERE id = santoso_id;
  UPDATE public.users SET has_tm_access = true WHERE id = amos_id;

  UPDATE public.leads
  SET assigned_to = amos_id
  WHERE assigned_to = santoso_id;
END $$;

COMMIT;

SELECT
  (SELECT COUNT(*) FROM public.leads l JOIN public.users u ON u.id = l.assigned_to WHERE u.name = 'Santoso' AND u.status = 'active') AS santoso_leads,
  (SELECT COUNT(*) FROM public.leads l JOIN public.users u ON u.id = l.assigned_to WHERE u.name = 'Amos Marihot Panggabean' AND u.status = 'active') AS amos_leads,
  (SELECT has_tm_access FROM public.users WHERE name = 'Santoso' AND status = 'active') AS santoso_tm_access,
  (SELECT has_tm_access FROM public.users WHERE name = 'Amos Marihot Panggabean' AND status = 'active') AS amos_tm_access;
