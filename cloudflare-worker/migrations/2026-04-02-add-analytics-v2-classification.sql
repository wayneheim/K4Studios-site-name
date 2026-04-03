ALTER TABLE canonical_events_v2 ADD COLUMN metric_scope TEXT NOT NULL DEFAULT 'primary';
ALTER TABLE canonical_events_v2 ADD COLUMN diagnostic_class TEXT;

ALTER TABLE session_facts_v2 ADD COLUMN is_suspicious_internal_shallow INTEGER NOT NULL DEFAULT 0;
ALTER TABLE session_facts_v2 ADD COLUMN source_family TEXT;

CREATE INDEX IF NOT EXISTS idx_canonical_events_v2_metric_scope ON canonical_events_v2 (metric_scope, occurred_at);
CREATE INDEX IF NOT EXISTS idx_canonical_events_v2_diagnostic_class ON canonical_events_v2 (diagnostic_class, occurred_at);
CREATE INDEX IF NOT EXISTS idx_session_facts_v2_suspicious ON session_facts_v2 (is_suspicious_internal_shallow, last_seen_at);