-- Add inference metadata columns for exposure recovery
--
-- Exposure Recovery writes an inferred `chapter_exposure` when an `xl_zoom` occurs
-- without an exposure in the same (visitor_id, image_id, session_id).

ALTER TABLE raw_events ADD COLUMN inferred INTEGER;
ALTER TABLE raw_events ADD COLUMN inferred_from TEXT;

-- Speeds up the recovery existence check (visitor_id + image_id + session + type)
CREATE INDEX IF NOT EXISTS idx_raw_events_exposure_lookup
  ON raw_events (visitor_id, target_id, event_type, session_id);
