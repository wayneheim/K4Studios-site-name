-- Verifies Top Entry Pages logic for the Jackson visit hour
WITH first_pages AS (
  SELECT
    e.session_id,
    CASE
      WHEN SUBSTR(COALESCE(NULLIF(e.page, ''), e.target_id), 1, 1) = '/' THEN COALESCE(NULLIF(e.page, ''), e.target_id)
      ELSE '/' || COALESCE(NULLIF(e.page, ''), e.target_id)
    END AS page_path,
    e.referer AS referrer,
    ROW_NUMBER() OVER (PARTITION BY e.session_id ORDER BY e.ts ASC) AS rn
  FROM human_population hp
  JOIN classified_events e ON e.visitor_id = hp.visitor_id
  WHERE e.ts BETWEEN datetime('2026-02-23 17:00:00') AND datetime('2026-02-23 18:00:00')
    AND e.source = 'js'
    AND e.event_type = 'page_view'
    AND e.session_id IS NOT NULL
    AND (e.page IS NOT NULL OR e.target_id IS NOT NULL)
)
SELECT
  page_path,
  CASE
    WHEN referrer IS NULL OR referrer = '' OR referrer = 'unknown' OR referrer = 'direct' THEN 'direct'
    WHEN referrer LIKE '%images.google.%' OR referrer LIKE '%google.%/imgres%' THEN 'google_images'
    WHEN referrer LIKE '%google.%' THEN 'google_search'
    WHEN referrer LIKE '%bing.%/images%' THEN 'bing_images'
    WHEN referrer LIKE '%bing.%' THEN 'bing_search'
    WHEN referrer LIKE '%pinterest.%' THEN 'pinterest'
    WHEN referrer LIKE '%facebook.%' OR referrer LIKE '%fb.%' THEN 'facebook'
    WHEN referrer LIKE '%twitter.%' OR referrer LIKE '%t.co/%' OR referrer LIKE '%x.com%' THEN 'twitter'
    WHEN referrer LIKE '%chatgpt.com%' OR referrer LIKE '%chat.openai.com%' THEN 'chatgpt'
    WHEN referrer LIKE '%instagram.%' THEN 'instagram'
    WHEN referrer LIKE '%linkedin.%' THEN 'linkedin'
    WHEN referrer LIKE '%duckduckgo.%' THEN 'duckduckgo'
    WHEN referrer LIKE '%k4studios.com%' THEN 'internal'
    ELSE 'unattributed'
  END AS ref_source,
  COUNT(DISTINCT session_id) AS sessions
FROM first_pages
WHERE rn = 1
  AND (referrer IS NULL OR referrer NOT LIKE '%k4studios.com%')
GROUP BY page_path, ref_source
ORDER BY sessions DESC;
