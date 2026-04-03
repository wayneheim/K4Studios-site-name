SELECT COUNT(DISTINCT visitor_id) AS js_page_view_visitors,
       COUNT(*) AS js_page_views,
       COUNT(DISTINCT NULLIF(session_id,'')) AS js_page_view_sessions
FROM classified_events
WHERE is_bot = 0
  AND source = 'js'
  AND event_type = 'page_view'
  AND date(ts, '-4 hours') = date('now', '-4 hours');
