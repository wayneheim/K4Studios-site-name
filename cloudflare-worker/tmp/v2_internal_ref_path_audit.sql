WITH first_page_loads AS (
  SELECT
    session_id,
    page_path,
    referrer_host,
    referrer_path,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY occurred_at ASC, id ASC) AS rn
  FROM canonical_events_v2
  WHERE occurred_at >= datetime('now', 'start of day')
    AND canonical_page_load = 1
    AND session_id IS NOT NULL
    AND trim(session_id) <> ''
)
SELECT
  COALESCE(referrer_path, '(none)') AS referrer_path,
  COUNT(*) AS sessions
FROM first_page_loads
WHERE rn = 1
  AND referrer_host IS NOT NULL
  AND lower(referrer_host) LIKE '%k4studios.com%'
GROUP BY COALESCE(referrer_path, '(none)')
ORDER BY sessions DESC, referrer_path ASC
LIMIT 25;