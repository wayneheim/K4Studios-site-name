PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL CHECK (mode IN ('sandbox', 'live')),
  status TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency = 'USD'),
  merchandise_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  tax_jurisdiction_country TEXT NOT NULL,
  tax_jurisdiction_state TEXT NOT NULL,
  tax_jurisdiction_code TEXT NOT NULL,
  tax_rate_basis_points INTEGER NOT NULL,
  tax_rule_label TEXT NOT NULL,
  tax_config_version TEXT NOT NULL,
  shipping_method_label TEXT NOT NULL,
  shipping_config_version TEXT NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  shipping_address_json TEXT NOT NULL,
  raw_cart_json TEXT NOT NULL,
  verified_items_json TEXT NOT NULL,
  quote_json TEXT NOT NULL,
  paypal_order_id TEXT UNIQUE,
  paypal_order_status TEXT,
  paypal_debug_id TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_email_created ON orders(buyer_email, created_at);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  provider TEXT NOT NULL CHECK (provider = 'paypal'),
  provider_order_id TEXT NOT NULL,
  provider_capture_id TEXT UNIQUE,
  status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  payer_id TEXT,
  payer_email TEXT,
  raw_transaction_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

CREATE TABLE IF NOT EXISTS paypal_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  provider_order_id TEXT,
  provider_capture_id TEXT,
  verification_status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  processing_error TEXT
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  UNIQUE(order_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_pending ON email_outbox(status, next_attempt_at);

