ALTER TABLE orders ADD COLUMN financial_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN refunded_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN disputed_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN last_financial_event_at TEXT;

UPDATE orders
SET financial_status = CASE
  WHEN status = 'paid' THEN 'paid'
  WHEN status = 'payment_denied' THEN 'denied'
  ELSE 'pending'
END;

CREATE TABLE IF NOT EXISTS payment_refunds (
  provider_refund_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  provider_capture_id TEXT NOT NULL,
  status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL,
  note TEXT,
  raw_event_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_order
  ON payment_refunds(order_id, updated_at);

CREATE TABLE IF NOT EXISTS payment_disputes (
  provider_dispute_id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id),
  provider_capture_id TEXT,
  status TEXT NOT NULL,
  reason TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT,
  outcome_code TEXT,
  raw_event_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_disputes_order
  ON payment_disputes(order_id, updated_at);

CREATE TABLE IF NOT EXISTS order_financial_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  event_type TEXT NOT NULL,
  provider_event_id TEXT,
  provider_resource_id TEXT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_financial_events_order
  ON order_financial_events(order_id, created_at);
