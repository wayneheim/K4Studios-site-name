SELECT event_type, source, has_js, has_pixel, COUNT(*) AS count
FROM canonical_classified_events
WHERE is_bot = 0
  AND date(ts, '-4 hours') = date('now', '-4 hours')
  AND event_type = 'page_view'
GROUP BY event_type, source, has_js, has_pixel
ORDER BY count DESC;
