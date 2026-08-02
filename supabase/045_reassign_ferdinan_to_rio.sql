-- Replace Ferdinan Bangun with Rio Pratama in Sales Telemarketing and move
-- only Funnel leads. No pipeline, closing, task-force, lead status, notes,
-- period, or timestamp changes.

BEGIN;

DO $$
DECLARE
  ferdinan_id UUID;
  rio_id UUID;
BEGIN
  SELECT id INTO STRICT ferdinan_id FROM public.users WHERE name = 'Ferdinan Bangun';
  SELECT id INTO STRICT rio_id FROM public.users WHERE name = 'Rio Pratama';

  UPDATE public.users SET has_tm_access = false WHERE id = ferdinan_id;
  UPDATE public.users SET has_tm_access = true WHERE id = rio_id;

  UPDATE public.leads
  SET assigned_to = rio_id
  WHERE assigned_to = ferdinan_id;
END $$;

COMMIT;

SELECT
  (SELECT COUNT(*) FROM public.leads l JOIN public.users u ON u.id = l.assigned_to WHERE u.name = 'Ferdinan Bangun') AS ferdinan_leads,
  (SELECT COUNT(*) FROM public.leads l JOIN public.users u ON u.id = l.assigned_to WHERE u.name = 'Rio Pratama') AS rio_leads,
  (SELECT has_tm_access FROM public.users WHERE name = 'Ferdinan Bangun') AS ferdinan_tm_access,
  (SELECT has_tm_access FROM public.users WHERE name = 'Rio Pratama') AS rio_tm_access;
