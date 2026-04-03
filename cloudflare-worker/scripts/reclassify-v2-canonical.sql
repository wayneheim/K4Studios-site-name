UPDATE canonical_events_v2
SET
  metric_scope = CASE
    WHEN event_family = 'image_view' AND event_action = 'direct_image' AND source_signal = 'proxy' THEN 'diagnostic'
    ELSE 'primary'
  END,
  diagnostic_class = CASE
    WHEN event_family = 'image_view' AND event_action = 'direct_image' AND source_signal = 'proxy' THEN 'external_direct_image_fetch'
    ELSE NULL
  END,
  updated_at = datetime('now');