CREATE TABLE IF NOT EXISTS expedition_price_sets (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('sandbox', 'live')),
  effective_from TEXT NOT NULL,
  label TEXT NOT NULL,
  prices_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL,
  UNIQUE(mode, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_expedition_price_sets_lookup
  ON expedition_price_sets(mode, enabled, effective_from);

INSERT OR IGNORE INTO expedition_price_sets (id, mode, effective_from, label, prices_json, enabled, updated_at) VALUES
  ('sandbox-expedition-2026-10-31', 'sandbox', '2026-10-31', 'Expedition pre-release print pricing', '{"sketch-5x7-pearl":1000,"foundation-8x10-gloss":4000,"foundation-8x10-pearl":4500,"foundation-11x14-lustre":7000,"foundation-11x14-pearl":7500}', 1, datetime('now')),
  ('live-expedition-2026-10-31', 'live', '2026-10-31', 'Expedition pre-release print pricing', '{"sketch-5x7-pearl":1000,"foundation-8x10-gloss":4000,"foundation-8x10-pearl":4500,"foundation-11x14-lustre":7000,"foundation-11x14-pearl":7500}', 1, datetime('now'));
