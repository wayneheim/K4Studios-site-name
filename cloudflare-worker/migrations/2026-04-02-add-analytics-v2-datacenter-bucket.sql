ALTER TABLE session_facts_v2 ADD COLUMN is_suspicious_datacenter_shallow INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_session_facts_v2_suspicious_datacenter
  ON session_facts_v2 (is_suspicious_datacenter_shallow, last_seen_at);