WITH first_page_loads AS (
  SELECT
    session_id,
    occurred_at,
    page_path,
    referrer_host,
    referrer_path,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS rn
  FROM canonical_events_v2
  WHERE occurred_at >= datetime('now', 'start of day')
    AND canonical_page_load = 1
    AND session_id IS NOT NULL
    AND trim(session_id) <> ''
), internal_entries AS (
  SELECT *
  FROM first_page_loads
  WHERE rn = 1
    AND referrer_host IS NOT NULL
    AND lower(referrer_host) LIKE '%k4studios.com%'
)
SELECT 'referrer_path' AS kind, COALESCE(referrer_path, '(none)') AS label, COUNT(*) AS sessions
FROM internal_entries
GROUP BY COALESCE(referrer_path, '(none)')
UNION ALL
SELECT 'entry_page' AS kind, page_path AS label, COUNT(*) AS sessions
FROM internal_entries
GROUP BY page_path
ORDER BY sessions DESC, label ASC
LIMIT 40;