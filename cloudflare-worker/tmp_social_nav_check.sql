WITH recent_social AS (
  SELECT
    sf.session_id,
    sf.source_family,
    sf.source_name,
    sf.is_qualified,
    sf.event_count,
    sf.engaged_event_count,
    sf.duration_seconds
  FROM session_facts_v2 sf
  WHERE sf.day >= date('now','-1 day')
    AND sf.source_family IN ('Facebook','Instagram','Unqualified Social')
), pages AS (
  SELECT
    rs.session_id,
    COUNT(DISTINCT re.page_path) AS unique_paths,
    MAX(CASE WHEN re.page_path = '/Other/Shows' THEN 1 ELSE 0 END) AS touched_shows
  FROM recent_social rs
  LEFT JOIN raw_events re
    ON re.session_id = rs.session_id
   AND re.timestamp >= datetime('now','-24 hours')
   AND re.event_type = 'page_view'
   AND re.page_path IS NOT NULL
  GROUP BY rs.session_id
)
SELECT
  CASE WHEN touched_shows = 1 THEN 'sessions_touching_/Other/Shows' ELSE 'sessions_not_touching_/Other/Shows' END AS cohort,
  COUNT(*) AS sessions,
  SUM(CASE WHEN unique_paths >= 2 THEN 1 ELSE 0 END) AS sessions_with_internal_nav,
  ROUND(100.0 * SUM(CASE WHEN unique_paths >= 2 THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) AS nav_rate_pct,
  ROUND(AVG(unique_paths), 2) AS avg_unique_paths
FROM pages
GROUP BY cohort
ORDER BY cohort;
