-- Reassign all Nurlela funnel leads to Santoso, then rebalance untouched leads.
-- Processed leads keep their original periods. Only status=new from June 2026
-- onward are distributed in groups of 200, starting July 2026, per TM.

BEGIN;

UPDATE users SET has_tm_access = false WHERE lower(name) = 'nurlela';
UPDATE users SET has_tm_access = true  WHERE lower(name) = 'santoso';

UPDATE leads
SET assigned_to = (SELECT id FROM users WHERE lower(name) = 'santoso' LIMIT 1),
    updated_at = now()
WHERE assigned_to = (SELECT id FROM users WHERE lower(name) = 'nurlela' LIMIT 1);

WITH ranked AS (
  SELECT l.id,
         row_number() OVER (
           PARTITION BY l.assigned_to
           ORDER BY l.period, l.created_at, l.id
         ) AS sequence
  FROM leads l
  JOIN users u ON u.id = l.assigned_to
  WHERE l.status = 'new'
    AND l.period >= '2026-06'
    AND u.status = 'active'
    AND u.has_tm_access = true
), redistributed AS (
  SELECT id,
         to_char(
           date '2026-07-01' + ((sequence - 1) / 200)::integer * interval '1 month',
           'YYYY-MM'
         ) AS target_period
  FROM ranked
)
UPDATE leads l
SET period = r.target_period,
    updated_at = now()
FROM redistributed r
WHERE l.id = r.id
  AND l.period IS DISTINCT FROM r.target_period;

COMMIT;

-- Verification query:
SELECT u.name, l.period, COUNT(*) AS new_leads
FROM leads l
JOIN users u ON u.id = l.assigned_to
WHERE l.status = 'new' AND l.period >= '2026-07' AND u.has_tm_access = true
GROUP BY u.name, l.period
ORDER BY u.name, l.period;
