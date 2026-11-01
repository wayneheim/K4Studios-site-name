ALTER TABLE orders ADD COLUMN fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled';
ALTER TABLE orders ADD COLUMN tracking_carrier TEXT;
ALTER TABLE orders ADD COLUMN tracking_number TEXT;
ALTER TABLE orders ADD COLUMN shipped_at TEXT;
ALTER TABLE orders ADD COLUMN fulfilled_at TEXT;

CREATE TABLE IF NOT EXISTS order_fulfillment_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  from_status TEXT,
  to_status TEXT NOT NULL,
  tracking_carrier TEXT,
  tracking_number TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status
  ON orders(fulfillment_status, created_at);

CREATE INDEX IF NOT EXISTS idx_fulfillment_events_order
  ON order_fulfillment_events(order_id, created_at);
