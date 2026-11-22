CREATE TABLE promotions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK(mode IN ('sandbox','live')),
  name TEXT NOT NULL,
  code TEXT,
  discount_type TEXT NOT NULL CHECK(discount_type IN ('free_shipping','percent_off','amount_off')),
  discount_value INTEGER NOT NULL DEFAULT 0 CHECK(discount_value >= 0),
  starts_on TEXT NOT NULL,
  expires_on TEXT,
  minimum_cents INTEGER NOT NULL DEFAULT 0 CHECK(minimum_cents >= 0),
  scope_json TEXT NOT NULL,
  max_uses INTEGER CHECK(max_uses > 0),
  max_uses_per_email INTEGER CHECK(max_uses_per_email > 0),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(mode,code)
);
CREATE INDEX idx_promotions_mode_enabled ON promotions(mode,enabled,code);
CREATE TABLE promotion_uses (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  promotion_id TEXT NOT NULL REFERENCES promotions(id),
  promotion_version TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('reserved','redeemed','released')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_promotion_uses_limits ON promotion_uses(promotion_id,status,buyer_email);

-- Both counters include payments in progress, so simultaneous buyers cannot
-- both redeem the last available use. Browsing/quoting never reserves a use.
CREATE TRIGGER promotion_use_insert BEFORE INSERT ON promotion_uses
WHEN NEW.status = 'reserved'
BEGIN
  SELECT RAISE(ABORT,'Promotion changed or is disabled') WHERE NOT EXISTS (
    SELECT 1 FROM promotions p JOIN orders o ON o.id=NEW.order_id
    WHERE p.id=NEW.promotion_id AND p.mode=o.mode AND p.enabled=1 AND p.version=NEW.promotion_version);
  SELECT RAISE(ABORT,'Promotion usage limit reached') WHERE (
    SELECT max_uses FROM promotions WHERE id=NEW.promotion_id) <= (
    SELECT COUNT(*) FROM promotion_uses WHERE promotion_id=NEW.promotion_id AND status IN ('reserved','redeemed') AND order_id<>NEW.order_id);
  SELECT RAISE(ABORT,'Promotion customer usage limit reached') WHERE (
    SELECT max_uses_per_email FROM promotions WHERE id=NEW.promotion_id) <= (
    SELECT COUNT(*) FROM promotion_uses WHERE promotion_id=NEW.promotion_id AND buyer_email=NEW.buyer_email AND status IN ('reserved','redeemed') AND order_id<>NEW.order_id);
END;
CREATE TRIGGER promotion_use_reserve BEFORE UPDATE OF status ON promotion_uses
WHEN NEW.status='reserved' AND OLD.status='released'
BEGIN
  SELECT RAISE(ABORT,'Promotion changed or is disabled') WHERE NOT EXISTS (
    SELECT 1 FROM promotions p JOIN orders o ON o.id=NEW.order_id
    WHERE p.id=NEW.promotion_id AND p.mode=o.mode AND p.enabled=1 AND p.version=NEW.promotion_version);
  SELECT RAISE(ABORT,'Promotion usage limit reached') WHERE (
    SELECT max_uses FROM promotions WHERE id=NEW.promotion_id) <= (
    SELECT COUNT(*) FROM promotion_uses WHERE promotion_id=NEW.promotion_id AND status IN ('reserved','redeemed') AND order_id<>NEW.order_id);
  SELECT RAISE(ABORT,'Promotion customer usage limit reached') WHERE (
    SELECT max_uses_per_email FROM promotions WHERE id=NEW.promotion_id) <= (
    SELECT COUNT(*) FROM promotion_uses WHERE promotion_id=NEW.promotion_id AND buyer_email=NEW.buyer_email AND status IN ('reserved','redeemed') AND order_id<>NEW.order_id);
END;
CREATE TRIGGER promotion_limits_update BEFORE UPDATE ON promotions
BEGIN
  SELECT RAISE(ABORT,'Usage limit is below existing uses and reservations') WHERE NEW.max_uses < (
    SELECT COUNT(*) FROM promotion_uses WHERE promotion_id=OLD.id AND status IN ('reserved','redeemed'));
  SELECT RAISE(ABORT,'Customer limit is below existing uses and reservations') WHERE NEW.max_uses_per_email < (
    SELECT MAX(n) FROM (SELECT COUNT(*) AS n FROM promotion_uses WHERE promotion_id=OLD.id AND status IN ('reserved','redeemed') GROUP BY buyer_email));
END;
