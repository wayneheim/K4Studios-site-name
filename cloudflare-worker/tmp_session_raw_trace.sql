SELECT
  session_id,
  ts,
  event_type,
  page,
  target_id,
  source,
  source_layer,
  referer,
  ua
FROM raw_events
WHERE session_id IN (
  '4bff7517-d8c2-444b-9483-6f489ab5ebad',
  '882369b2-50f2-41c9-98b9-e71a19f358d8',
  'b90fc209-f4d2-4883-b31e-faa6262fafd2',
  '06560b7a-8d8e-4166-8b1a-dd1e1c46aa0a'
)
ORDER BY session_id ASC, ts ASC, id ASC
LIMIT 80;
