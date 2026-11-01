CREATE TABLE IF NOT EXISTS shipping_rate_sets (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('sandbox', 'live')),
  effective_from TEXT NOT NULL,
  label TEXT NOT NULL,
  method_label TEXT NOT NULL,
  rates_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  updated_at TEXT NOT NULL,
  UNIQUE(mode, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_shipping_rate_sets_lookup
  ON shipping_rate_sets(mode, enabled, effective_from);

INSERT OR IGNORE INTO shipping_rate_sets (
  id, mode, effective_from, label, method_label, rates_json, enabled, updated_at
) VALUES (
  'sandbox-shipping-2026-10-29',
  'sandbox',
  '2026-10-29',
  'SANDBOX TEST SHIPPING — NOT FOR LIVE SALES',
  'Sandbox test shipping',
  '{"productRatesCents":{"sketch-5x7-pearl":1000,"foundation-8x10-pearl":1000,"foundation-11x14-lustre":1000,"chronicle-16x20-cotton-rag":3500,"chronicle-20x24-cotton-rag":3500,"legend-30x40-cotton-rag":3500,"legend-40x60-cotton-rag":3500},"engrainedBandsCents":{"upTo24":15000,"upTo36":15000,"upTo50":15000}}',
  1,
  datetime('now')
);
