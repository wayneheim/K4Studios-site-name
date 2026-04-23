WITH homepage_landings AS (
  SELECT
    sf.session_id,
    sf.source_family,
    sf.event_count,
    sf.canonical_page_loads,
    sf.engaged_event_count,
    CAST((julianday(sf.last_seen_at) - julianday(sf.first_seen_at)) * 86400 AS INTEGER) AS duration_seconds
  FROM session_facts_v2 sf
  WHERE sf.first_seen_at >= datetime('now','start of day')
    AND sf.first_seen_at < datetime('now','start of day','+1 day')
    AND sf.landing_page_path = '/'
    AND sf.canonical_page_loads > 0
)
SELECT
  COALESCE(source_family, 'Unknown') AS source_family,
  COUNT(*) AS sessions,
  SUM(CASE WHEN event_count = 1 THEN 1 ELSE 0 END) AS one_event_sessions,
  ROUND(100.0 * SUM(CASE WHEN event_count = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) AS one_event_pct,
  SUM(CASE WHEN engaged_event_count > 0 THEN 1 ELSE 0 END) AS engaged_sessions,
  AVG(duration_seconds) AS avg_duration_s
FROM homepage_landings
GROUP BY source_family
ORDER BY sessions DESC;
