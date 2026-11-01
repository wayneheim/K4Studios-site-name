CREATE TABLE IF NOT EXISTS edition_inventory (
  inventory_key TEXT PRIMARY KEY,
  image_id TEXT NOT NULL,
  series_key TEXT NOT NULL,
  edition_limit INTEGER NOT NULL CHECK (edition_limit > 0),
  baseline_sold INTEGER NOT NULL DEFAULT 0 CHECK (baseline_sold >= 0),
  checkout_sold INTEGER NOT NULL DEFAULT 0 CHECK (checkout_sold >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (baseline_sold + checkout_sold + reserved_quantity <= edition_limit)
);

CREATE TABLE IF NOT EXISTS edition_allocations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  inventory_key TEXT NOT NULL REFERENCES edition_inventory(inventory_key),
  image_id TEXT NOT NULL,
  series_key TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL CHECK (status IN ('reserved', 'sold', 'released')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(order_id, inventory_key)
);

CREATE INDEX IF NOT EXISTS idx_edition_allocations_order
  ON edition_allocations(order_id, status);

CREATE INDEX IF NOT EXISTS idx_edition_allocations_inventory
  ON edition_allocations(inventory_key, status);
