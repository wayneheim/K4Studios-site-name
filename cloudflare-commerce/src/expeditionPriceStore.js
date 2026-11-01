import { EXPEDITION_PRINT_PRODUCTS, getExpeditionPriceKey } from "../../src/data/commerce/catalog.js";

export const EXPEDITION_PRICE_KEYS = Object.freeze([
  "sketch-5x7-pearl",
  "foundation-8x10-gloss",
  "foundation-8x10-pearl",
  "foundation-11x14-lustre",
  "foundation-11x14-pearl",
]);

export const DEFAULT_EXPEDITION_PRICES_CENTS = Object.freeze(Object.fromEntries(
  EXPEDITION_PRICE_KEYS.map((key) => {
    const product = EXPEDITION_PRINT_PRODUCTS.find((candidate) => getExpeditionPriceKey(candidate.productKey) === key);
    return [key, Math.round(Number(product?.unitPrice || 0) * 100)];
  }),
));

function validatePrices(prices) {
  return Object.freeze(Object.fromEntries(EXPEDITION_PRICE_KEYS.map((key) => {
    const cents = Number(prices?.[key]);
    if (!Number.isInteger(cents) || cents <= 0 || cents > 1000000) throw new Error(`Expedition price for ${key} must be positive integer cents.`);
    return [key, cents];
  })));
}

export async function resolveExpeditionPrices(db, mode, at = new Date()) {
  if (!db) return DEFAULT_EXPEDITION_PRICES_CENTS;
  const row = await db.prepare(`
    SELECT * FROM expedition_price_sets
    WHERE mode = ? AND enabled = 1 AND effective_from <= ?
    ORDER BY effective_from DESC LIMIT 1
  `).bind(mode, at.toISOString().slice(0, 10)).first();
  return row ? validatePrices(JSON.parse(row.prices_json)) : DEFAULT_EXPEDITION_PRICES_CENTS;
}

export async function getCurrentExpeditionPriceRule(db, mode) {
  const row = await db.prepare(`
    SELECT * FROM expedition_price_sets
    WHERE mode = ? AND enabled = 1
    ORDER BY effective_from DESC LIMIT 1
  `).bind(mode).first();
  return row ? { ...row, prices: validatePrices(JSON.parse(row.prices_json)) } : null;
}

export async function saveExpeditionPriceRule(db, payload, mode) {
  const effectiveFrom = String(payload?.effectiveFrom || "");
  const label = String(payload?.label || "").trim().slice(0, 160);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) throw new Error("An Expedition pricing effective date is required.");
  if (!label) throw new Error("An Expedition pricing label is required.");
  const prices = validatePrices(payload?.pricesCents);
  const id = `${mode}-expedition-${effectiveFrom}`;
  const updatedAt = new Date().toISOString();
  await db.prepare(`
    INSERT INTO expedition_price_sets (id, mode, effective_from, label, prices_json, enabled, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(mode, effective_from) DO UPDATE SET
      label = excluded.label, prices_json = excluded.prices_json,
      enabled = 1, updated_at = excluded.updated_at
  `).bind(id, mode, effectiveFrom, label, JSON.stringify(prices), updatedAt).run();
  return { id, mode, effectiveFrom, label, prices, updatedAt };
}

export function applyExpeditionPrices(verifiedItems, pricesCents) {
  return Object.freeze(verifiedItems.map((item) => {
    if (item.catalogScope !== "expedition") return item;
    const key = getExpeditionPriceKey(item.productKey);
    const unitPriceCents = Number(pricesCents?.[key]);
    if (!Number.isInteger(unitPriceCents) || unitPriceCents <= 0) throw new Error("The Expedition print price is unavailable.");
    return Object.freeze({ ...item, unitPriceCents, lineTotalCents: unitPriceCents * item.quantity, pricingSource: "expedition-admin" });
  }));
}
