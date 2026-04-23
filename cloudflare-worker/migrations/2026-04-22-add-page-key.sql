-- Add semantic pilot page labels alongside existing raw path logging.
-- This enables readable movement chains (e.g., home -> painterly_main -> facing_history)
-- without replacing existing page/target data.

ALTER TABLE raw_events ADD COLUMN page_key TEXT;
