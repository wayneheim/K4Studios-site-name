import { STANDARD_CART_PRODUCTS } from "../../src/data/commerce/catalog.js";
import { easternDate, evaluatePromotion, normalizeCouponCode, PROMOTION_CATALOG_OPTIONS } from "../../src/lib/commerce/server/promotions.js";
import engrainedData from "../../public/data/engrainedData.json" with { type: "json" };
import { calculateTax } from "../../src/lib/commerce/server/taxCalculator.js";

const productOptions = [
  ...STANDARD_CART_PRODUCTS.map((p) => ({ productKey: p.productKey, catalogScope: p.catalogScope || "collection", seriesKey: p.seriesKey, label: `${p.seriesLabel} · ${p.size} · ${p.finish}${p.expeditionSlug ? ` · ${p.expeditionSlug}` : ""}` })),
  ...(engrainedData.items || []).filter((item) => item.id && !["hidden","hide","ghost","non","none",""].includes(String(item.visibility ?? "show").trim().toLowerCase()))
    .map((item) => ({ productKey: `engrained-${item.id}`, catalogScope: "collection", seriesKey: "engrained", label: `Engrained · ${item.title || item.id} · ${item.imageSize}` })),
];

function fromRow(row) {
  return {
    id: row.id, mode: row.mode, name: row.name, code: row.code,
    discountType: row.discount_type, discountValue: row.discount_value,
    startsOn: row.starts_on, expiresOn: row.expires_on, minimumCents: row.minimum_cents,
    scope: JSON.parse(row.scope_json), maxUses: row.max_uses, maxUsesPerEmail: row.max_uses_per_email,
    enabled: Boolean(row.enabled), version: row.version,
    usedCount: Number(row.used_count || 0), customerUsedCount: Number(row.customer_used_count || 0),
    redeemedCount: Number(row.redeemed_count || 0), reservedCount: Number(row.reserved_count || 0),
  };
}

export async function listPromotions(db, mode) {
  const { results = [] } = await db.prepare(`SELECT p.*,
    (SELECT COUNT(*) FROM promotion_uses WHERE promotion_id=p.id AND status='redeemed') AS redeemed_count,
    (SELECT COUNT(*) FROM promotion_uses WHERE promotion_id=p.id AND status='reserved') AS reserved_count
    FROM promotions p WHERE mode=? ORDER BY created_at DESC`).bind(mode).all();
  return { mode, promotions: results.map(fromRow), today: easternDate(), products: productOptions };
}

function date(value, required = false) {
  const result = String(value || "");
  if (!result && !required) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(result)) || new Date(`${result}T12:00:00Z`).toISOString().slice(0,10) !== result) throw new Error("Enter a valid promotion date.");
  return result;
}

function integer(value, label, max, optional = false) {
  if (optional && (value == null || value === "")) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < (optional ? 1 : 0) || number > max) throw new Error(`Invalid ${label}.`);
  return number;
}

export async function savePromotion(db, mode, payload) {
  const id = payload?.id ? String(payload.id) : crypto.randomUUID();
  if (!/^[A-Za-z0-9-]{1,80}$/.test(id)) throw new Error("Invalid promotion ID.");
  const name = String(payload?.name || "").trim();
  if (!name || name.length > 160 || /[<>\u0000-\u001F]/.test(name)) throw new Error("Enter a promotion name up to 160 characters.");
  const code = normalizeCouponCode(payload?.code) || null;
  const discountType = payload?.discountType;
  if (!["free_shipping","percent_off","amount_off"].includes(discountType)) throw new Error("Invalid promotion type.");
  const discountValue = discountType === "free_shipping" ? 0 : integer(payload.discountValue, "discount amount", discountType === "percent_off" ? 9900 : 100000000);
  if (discountType !== "free_shipping" && discountValue <= 0) throw new Error("The discount must be greater than zero.");
  const startsOn = date(payload.startsOn, true), expiresOn = date(payload.expiresOn);
  if (expiresOn && expiresOn < startsOn) throw new Error("Expiration must be on or after the start date.");
  const scope = payload.scope || {};
  if (typeof scope !== "object" || Array.isArray(scope)
    || (scope.seriesKeys !== undefined && !Array.isArray(scope.seriesKeys))
    || (scope.productKeys !== undefined && !Array.isArray(scope.productKeys))) throw new Error("Invalid qualifying product restrictions.");
  const catalogScope = scope.catalogScope || "";
  if (catalogScope !== "collection" && !PROMOTION_CATALOG_OPTIONS.some((option) => option.value === catalogScope)) throw new Error("Invalid catalog scope.");
  const seriesKeys = Array.isArray(scope.seriesKeys) ? [...new Set(scope.seriesKeys)] : [];
  if (seriesKeys.some((key) => !["sketch","foundation","chronicle","legend","engrained"].includes(key))) throw new Error("Invalid series restriction.");
  const productKeys = Array.isArray(scope.productKeys) ? [...new Set(scope.productKeys)] : [];
  if (productKeys.length > 100 || productKeys.some((key) => !productOptions.some((p) => p.productKey === key))) throw new Error("Invalid product restriction.");
  const minimumCents = integer(payload.minimumCents, "minimum merchandise amount", 100000000);
  const maxUses = integer(payload.maxUses, "total use limit", 1000000, true);
  const maxUsesPerEmail = integer(payload.maxUsesPerEmail, "per-email use limit", 1000000, true);
  if (payload.id && !await db.prepare("SELECT id FROM promotions WHERE id=? AND mode=?").bind(id,mode).first()) throw new Error("Promotion not found.");
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO promotions
    (id,mode,name,code,discount_type,discount_value,starts_on,expires_on,minimum_cents,scope_json,max_uses,max_uses_per_email,enabled,version,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,code=excluded.code,discount_type=excluded.discount_type,
      discount_value=excluded.discount_value,starts_on=excluded.starts_on,expires_on=excluded.expires_on,
      minimum_cents=excluded.minimum_cents,scope_json=excluded.scope_json,max_uses=excluded.max_uses,
      max_uses_per_email=excluded.max_uses_per_email,enabled=excluded.enabled,version=excluded.version,updated_at=excluded.updated_at`)
    .bind(id,mode,name,code,discountType,discountValue,startsOn,expiresOn,minimumCents,JSON.stringify({catalogScope,seriesKeys,productKeys}),maxUses,maxUsesPerEmail,payload.enabled === true ? 1 : 0,crypto.randomUUID(),now,now).run().catch((error) => {
      if (/UNIQUE constraint failed: promotions.mode, promotions.code/i.test(String(error?.message || error))) throw new Error("That coupon code already exists. Edit the existing promotion instead.");
      throw error;
    });
  return { id, mode };
}

export async function resolvePromotion(db, mode, couponCode, buyerEmail, context, orderId = null) {
  const code = normalizeCouponCode(couponCode);
  if (!db) { if (code) throw new Error("Coupons are not available."); return null; }
  const email = String(buyerEmail || "").trim().toLowerCase();
  const { results = [] } = await db.prepare(`SELECT p.*,
    (SELECT COUNT(*) FROM promotion_uses WHERE promotion_id=p.id AND status IN ('reserved','redeemed') AND order_id<>?) AS used_count,
    (SELECT COUNT(*) FROM promotion_uses WHERE promotion_id=p.id AND status IN ('reserved','redeemed') AND buyer_email=? AND order_id<>?) AS customer_used_count
    FROM promotions p WHERE p.mode=? AND p.enabled=1 AND ${code ? "p.code=?" : "p.code IS NULL"}`)
    .bind(orderId || "",email,orderId || "",mode,...(code ? [code] : [])).all();
  const merchandiseCents = context.items.reduce((sum,item) => sum + item.lineTotalCents,0);
  const netAmount = (p) => merchandiseCents - p.merchandiseDiscountCents + context.shippingCents - p.shippingDiscountCents;
  const cost = (p) => netAmount(p) + (context.taxConfig ? calculateTax({merchandiseCents:merchandiseCents-p.merchandiseDiscountCents,shippingCents:context.shippingCents-p.shippingDiscountCents,destination:context.destination,config:context.taxConfig}).taxCents : 0);
  const matches = results.map((row) => evaluatePromotion(fromRow(row),context)).filter((p) => p && netAmount(p) > 0)
    .sort((a,b) => cost(a)-cost(b) || a.id.localeCompare(b.id));
  if (code && !matches.length) throw new Error("That coupon is expired, used up, or does not qualify for this cart. Remove it or check its terms.");
  return matches[0] || null;
}

export async function reservePromotionUse(db, order, quote) {
  const promo = quote.promotion;
  if (!promo) return;
  const existing = await db.prepare("SELECT * FROM promotion_uses WHERE order_id=?").bind(order.id).first();
  if (existing && (existing.promotion_id !== promo.id || (existing.status !== "released" && existing.promotion_version !== promo.configVersion))) throw new Error("The order's promotion changed.");
  if (existing && ["reserved","redeemed"].includes(existing.status)) return;
  const now = new Date().toISOString();
  try {
    await db.prepare(`INSERT INTO promotion_uses (order_id,promotion_id,promotion_version,buyer_email,status,created_at,updated_at)
      VALUES (?,?,?,?,'reserved',?,?) ON CONFLICT(order_id) DO UPDATE SET status='reserved',promotion_version=excluded.promotion_version,updated_at=excluded.updated_at WHERE promotion_uses.status='released'`)
      .bind(order.id,promo.id,promo.configVersion,String(order.buyer_email).trim().toLowerCase(),now,now).run();
  } catch (error) {
    if (/promotion|constraint/i.test(String(error?.message || error))) throw new Error("That promotion is no longer available. Refresh checkout before paying.");
    throw error;
  }
}

export async function commitPromotionUse(db, orderId) {
  await db.prepare("UPDATE promotion_uses SET status='redeemed',updated_at=? WHERE order_id=? AND status='reserved'").bind(new Date().toISOString(),orderId).run();
}
export async function releasePromotionUse(db, orderId) {
  await db.prepare("UPDATE promotion_uses SET status='released',updated_at=? WHERE order_id=? AND status='reserved'").bind(new Date().toISOString(),orderId).run();
}
