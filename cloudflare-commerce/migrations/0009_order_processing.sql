ALTER TABLE orders ADD COLUMN processed_at TEXT;

-- Orders already in production or shipped should not reappear as new orders.
UPDATE orders
SET processed_at = COALESCE(
  (SELECT MIN(created_at) FROM order_fulfillment_events
    WHERE order_id = orders.id AND to_status IN ('processing', 'shipped', 'fulfilled')),
  shipped_at, fulfilled_at, updated_at
)
WHERE fulfillment_status IN ('processing', 'shipped', 'fulfilled');

CREATE INDEX IF NOT EXISTS idx_orders_awaiting_processing
  ON orders(mode, status, financial_status, fulfillment_status, processed_at, created_at);
