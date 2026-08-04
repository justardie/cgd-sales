BEGIN;

INSERT INTO public.lead_notes (lead_id, content, author_name, created_by, created_at)
SELECT
  leads.id,
  trim(leads.notes),
  COALESCE(NULLIF(trim(users.name), ''), 'Catatan sebelumnya'),
  leads.assigned_to,
  COALESCE(leads.updated_at, leads.created_at, now())
FROM public.leads
LEFT JOIN public.users ON users.id = leads.assigned_to
WHERE trim(COALESCE(leads.notes, '')) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.lead_notes
    WHERE lead_notes.lead_id = leads.id
      AND lead_notes.content = trim(leads.notes)
  );

UPDATE public.leads
SET notes = ''
WHERE trim(COALESCE(notes, '')) <> '';

COMMIT;
