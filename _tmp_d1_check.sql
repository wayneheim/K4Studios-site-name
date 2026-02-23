WITH base_ce AS (
  SELECT *
  FROM classified_events
  WHERE date(ts, '-5 hours') = '2026-02-23'
)
SELECT COUNT(*) AS rows_today
FROM base_ce;
